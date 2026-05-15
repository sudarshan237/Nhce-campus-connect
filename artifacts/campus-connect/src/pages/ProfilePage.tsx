import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Hash, BookOpen, GraduationCap, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BRANCHES = ["CSE","AIML","DS","ECE","EEE","ME","Civil","ISE"];
const COURSES = ["BTech","BE","MCA","MBA","BCA","MTech","PhD"];

export default function ProfilePage() {
  const { user, fetchSession } = useAuth() as ReturnType<typeof useAuth> & { fetchSession?: (t: string) => void };
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    usn: user?.usn ?? "",
    branch: user?.branch ?? "",
    year: user?.year ? String(user.year) : "",
    course: user?.course ?? "",
  });

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/users/me`, {
        method: "PATCH",
        body: JSON.stringify({ ...form, year: form.year ? Number(form.year) : null }),
      });
      toast({ title: "Profile updated!" });
      setEditing(false);
      const token = localStorage.getItem("nhce_token");
      if (token && fetchSession) fetchSession(token);
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: user?.name ?? "",
      usn: user?.usn ?? "",
      branch: user?.branch ?? "",
      year: user?.year ? String(user.year) : "",
      course: user?.course ?? "",
    });
    setEditing(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{user?.role}</Badge>
                {user?.isAdmin && <Badge variant="destructive">Admin</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Academic Information</CardTitle>
            {!editing ? (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                <Edit2 className="w-4 h-4" />Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}><X className="w-4 h-4" /></Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Check className="w-4 h-4" />{saving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>USN</Label>
                  <Input className="mt-1" placeholder="1NH22CS001" value={form.usn} onChange={(e) => setForm((f) => ({ ...f, usn: e.target.value }))} />
                </div>
                <div>
                  <Label>Year</Label>
                  <Select value={form.year} onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map((y) => <SelectItem key={y} value={String(y)}>{y} Year</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Branch</Label>
                  <Select value={form.branch} onValueChange={(v) => setForm((f) => ({ ...f, branch: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Course</Label>
                  <Select value={form.course} onValueChange={(v) => setForm((f) => ({ ...f, course: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>{COURSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { icon: <User className="w-4 h-4" />, label: "Name", value: user?.name },
                { icon: <Mail className="w-4 h-4" />, label: "Email", value: user?.email },
                { icon: <Hash className="w-4 h-4" />, label: "USN", value: user?.usn ?? "Not set" },
                { icon: <BookOpen className="w-4 h-4" />, label: "Branch", value: user?.branch ?? "Not set" },
                { icon: <GraduationCap className="w-4 h-4" />, label: "Course", value: user?.course ?? "Not set" },
                { icon: <GraduationCap className="w-4 h-4" />, label: "Year", value: user?.year ? `Year ${user.year}` : "Not set" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                    {row.icon}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="text-sm font-medium">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            For issues or support, contact:{" "}
            <a href="mailto:patil.sudu237@gmail.com" className="text-primary font-medium">patil.sudu237@gmail.com</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
