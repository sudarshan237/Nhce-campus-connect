import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Search, Shield, RefreshCw, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string; name: string; email: string; role: string; usn: string | null;
  branch: string | null; year: number | null; course: string | null;
  isAdmin: boolean; createdAt: string;
}

const ROLES = ["Student", "Faculty", "Staff", "Admin"];

export default function AdminPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ role: "", isAdmin: false, name: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      params.set("limit", "100");
      const data = await apiFetch<{ users: User[] }>(`/users?${params}`);
      setUsers(data.users);
    } catch {
      toast({ variant: "destructive", title: "Failed to load users" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await apiFetch(`/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: editForm.role, isAdmin: editForm.isAdmin, name: editForm.name }),
      });
      setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, role: editForm.role, isAdmin: editForm.isAdmin, name: editForm.name } : u));
      setEditUser(null);
      toast({ title: "User updated" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await apiFetch(`/users/${deleteConfirm.id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      toast({ title: "User deleted" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setDeleting(false);
    }
  };

  const roleColor = (role: string) => {
    if (role === "Admin") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (role === "Faculty") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (role === "Staff") return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  };

  const stats = {
    total: users.length,
    students: users.filter((u) => u.role === "Student").length,
    faculty: users.filter((u) => u.role === "Faculty" || u.role === "Staff").length,
    admins: users.filter((u) => u.isAdmin).length,
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <Button variant="ghost" size="icon" onClick={() => loadUsers(search)}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats.total, color: "text-blue-500" },
          { label: "Students", value: stats.students, color: "text-green-500" },
          { label: "Faculty / Staff", value: stats.faculty, color: "text-indigo-500" },
          { label: "Admins", value: stats.admins, color: "text-red-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, email, or USN..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); loadUsers(e.target.value); }}
            />
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{u.name}</p>
                      {u.isAdmin && <Shield className="w-3.5 h-3.5 text-red-500" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(u.role)}`}>{u.role}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground">{[u.usn, u.branch, u.year ? `${u.year}Y` : null, u.course].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground hidden md:block mr-2">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditUser(u); setEditForm({ role: u.role, isAdmin: u.isAdmin, name: u.name }); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteConfirm(u)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input className="mt-1" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email: {editUser?.email}</p>
              {editUser?.usn && <p className="text-sm text-muted-foreground">USN: {editUser.usn}</p>}
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Switch
                id="admin-toggle"
                checked={editForm.isAdmin}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, isAdmin: v }))}
              />
              <div>
                <Label htmlFor="admin-toggle" className="cursor-pointer font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-500" />Admin Access
                </Label>
                <p className="text-xs text-muted-foreground">Grants full admin panel access</p>
              </div>
            </div>
            <Button className="w-full" onClick={handleEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />Delete User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will permanently delete <strong>{deleteConfirm?.name}</strong> ({deleteConfirm?.email}) and all their data including posts, complaints, and feedback. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
