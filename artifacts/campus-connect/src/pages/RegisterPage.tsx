import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, AlertCircle, Eye, EyeOff } from "lucide-react";

const BRANCHES = ["CSE","AIML","DS","ECE","EEE","ME","Civil","ISE"];
const COURSES = ["BTech","BE","MCA","MBA","BCA","MTech","PhD"];

export default function RegisterPage() {
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name:"", email:"", password:"", usn:"", branch:"", year:"", course:"", role:"Student" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ ...form, year: form.year ? Number(form.year) : undefined });
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-3">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground mt-1">NHCE Campus Connect</p>
        </div>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Register</CardTitle>
            <CardDescription>Fill in your details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Full Name *</Label>
                  <Input placeholder="Rahul Sharma" value={form.name} onChange={(e) => set("name", e.target.value)} required />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Email *</Label>
                  <Input type="email" placeholder="1nh22cs001@nhce.edu" value={form.email} onChange={(e) => set("email", e.target.value)} required />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Min 8 characters" value={form.password} onChange={(e) => set("password", e.target.value)} className="pr-10" required />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>USN</Label>
                  <Input placeholder="1NH22CS001" value={form.usn} onChange={(e) => set("usn", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Select onValueChange={(v) => set("year", v)}>
                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map((y) => <SelectItem key={y} value={String(y)}>{y} Year</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <Select onValueChange={(v) => set("branch", v)}>
                    <SelectTrigger><SelectValue placeholder="Branch" /></SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Course</Label>
                  <Select onValueChange={(v) => set("course", v)}>
                    <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
                    <SelectContent>
                      {COURSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <a href="/login" className="text-primary font-medium hover:underline">Sign in</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
