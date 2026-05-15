import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, Clock, CheckCircle2, Loader2, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["WiFi","Electrical","Water","Sanitation","Canteen","Transport","Library","Sports","Hostel","Other"];
const STATUSES = ["Pending","In Progress","Resolved"];

interface ComplaintUpdate {
  id: string; status: string; note: string | null; createdAt: string;
}
interface Complaint {
  id: string; authorId: string; authorName: string | null; title: string;
  description: string; category: string; status: string; createdAt: string; updates?: ComplaintUpdate[];
}

function statusColor(s: string) {
  if (s === "Resolved") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s === "In Progress") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
}

function statusIcon(s: string) {
  if (s === "Resolved") return <CheckCircle2 className="w-3.5 h-3.5" />;
  if (s === "In Progress") return <Loader2 className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
}

export default function ComplaintsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", category: "WiFi" });
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<Complaint | null>(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: "In Progress", note: "" });

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!user?.isAdmin) params.set("mine", "true");
      const data = await apiFetch<{ complaints: Complaint[] }>(`/complaints?${params}`);
      setComplaints(data.complaints);
    } catch {
      toast({ variant: "destructive", title: "Failed to load complaints" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComplaints(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/complaints", { method: "POST", body: JSON.stringify(form) });
      setDialogOpen(false);
      setForm({ title: "", description: "", category: "WiFi" });
      loadComplaints();
      toast({ title: "Complaint submitted successfully" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setCreating(false);
    }
  };

  const loadDetails = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    try {
      const data = await apiFetch<Complaint & { updates: ComplaintUpdate[] }>(`/complaints/${id}`);
      setComplaints((prev) => prev.map((c) => c.id === id ? { ...c, updates: data.updates } : c));
      setExpanded(id);
    } catch { }
  };

  const handleStatusUpdate = async () => {
    if (!statusDialog) return;
    try {
      await apiFetch(`/complaints/${statusDialog.id}`, {
        method: "PATCH",
        body: JSON.stringify(statusUpdate),
      });
      setStatusDialog(null);
      loadComplaints();
      toast({ title: "Status updated" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    }
  };

  const filtered = complaints.filter((c) => {
    if (tab === "mine") return c.authorId === user?.id;
    if (tab === "pending") return c.status === "Pending";
    if (tab === "inprogress") return c.status === "In Progress";
    if (tab === "resolved") return c.status === "Resolved";
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Complaints</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />File Complaint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>File a Complaint</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input className="mt-1" placeholder="Brief title of the issue" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea className="mt-1" placeholder="Describe the issue in detail..." rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? "Submitting..." : "Submit Complaint"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {!user?.isAdmin && <TabsTrigger value="mine">Mine</TabsTrigger>}
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="inprogress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No complaints found</p>
            </div>
          ) : (
            filtered.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{c.category}</Badge>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>
                          {statusIcon(c.status)}{c.status}
                        </span>
                      </div>
                      <p className="font-semibold mt-2">{c.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="ghost" size="icon" onClick={() => loadDetails(c.id)}>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded === c.id ? "rotate-180" : ""}`} />
                      </Button>
                      {user?.isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => { setStatusDialog(c); setStatusUpdate({ status: c.status, note: "" }); }}>
                          Update
                        </Button>
                      )}
                    </div>
                  </div>
                  {expanded === c.id && c.updates && c.updates.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">UPDATES</p>
                      <div className="space-y-2">
                        {c.updates.map((u) => (
                          <div key={u.id} className="flex gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusColor(u.status).includes("green") ? "bg-green-500" : statusColor(u.status).includes("blue") ? "bg-blue-500" : "bg-orange-500"}`} />
                            <div>
                              <p className="text-xs font-medium">{u.status} — {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</p>
                              {u.note && <p className="text-xs text-muted-foreground">{u.note}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!statusDialog} onOpenChange={(v) => !v && setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Complaint Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={statusUpdate.status} onValueChange={(v) => setStatusUpdate((u) => ({ ...u, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea className="mt-1" placeholder="Add a note..." value={statusUpdate.note} onChange={(e) => setStatusUpdate((u) => ({ ...u, note: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleStatusUpdate}>Update Status</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
