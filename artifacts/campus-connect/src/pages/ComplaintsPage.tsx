import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, Clock, CheckCircle2, Loader2, ChevronDown, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "WiFi","Electrical","Water","Sanitation","Canteen","Transport",
  "Library","Sports","Hostel","Classroom","Lab Equipment","Parking","Security","Other"
];
const PRIORITIES = ["Low","Medium","High"];

const CATEGORY_DESC_EXAMPLES: Record<string, string> = {
  "WiFi": "e.g. WiFi in Block B is completely down since Monday. Password reset didn't help. Affects about 40 students.",
  "Electrical": "e.g. Power socket near row 3 of Lab 204 is sparking. Reported to caretaker but no fix yet.",
  "Water": "e.g. No water supply in boys hostel Block A since 6 AM. Taps completely dry on floors 2 and 3.",
  "Sanitation": "e.g. Washrooms near canteen haven't been cleaned in 2 days. Strong odour and water logging.",
  "Canteen": "e.g. Food quality has dropped significantly — rice is undercooked and dal has a stale smell.",
  "Transport": "e.g. Bus route 3 (Marathahalli) didn't show up today. No notice given. 30+ students stranded.",
  "Library": "e.g. 5 computers in the digital library are broken for over a week. Important exam season.",
  "Sports": "e.g. Cricket pitch is waterlogged and nets are torn. Ground staff haven't addressed it.",
  "Hostel": "e.g. Ceiling fan in Room 214, Block C is making a grinding noise and vibrating dangerously.",
  "Classroom": "e.g. Projector in Room 301 has been broken for 10 days. Faculty can't show slides during lectures.",
  "Lab Equipment": "e.g. 3 oscilloscopes in ECE Lab 2 are non-functional. Affects practical sessions.",
  "Parking": "e.g. Unauthorized vehicles blocking student two-wheeler parking near Block D gate daily.",
  "Security": "e.g. Side gate near library is left unmanned after 6 PM. Outsiders have been seen entering.",
  "Other": "Describe the issue clearly including location, when it started, and what you've already tried.",
};
const STATUSES = ["Pending","In Progress","Resolved"];

interface ComplaintUpdate {
  id: string; status: string; note: string | null; createdAt: string;
}
interface Complaint {
  id: string; authorId: string; authorName: string | null; title: string;
  description: string; category: string; priority: string; isAnonymous: boolean;
  status: string; createdAt: string; updates?: ComplaintUpdate[];
}

function statusColor(s: string) {
  if (s === "Resolved") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s === "In Progress") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
}

function priorityColor(p: string) {
  if (p === "High") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (p === "Medium") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
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
  const [form, setForm] = useState({ title: "", description: "", category: "WiFi", priority: "Medium", isAnonymous: false });
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
      setForm({ title: "", description: "", category: "WiFi", priority: "Medium", isAnonymous: false });
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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">🟢 Low</SelectItem>
                    <SelectItem value="Medium">🟡 Medium</SelectItem>
                    <SelectItem value="High">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input className="mt-1" placeholder="Brief title of the issue" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea className="mt-1" placeholder={CATEGORY_DESC_EXAMPLES[form.category] ?? "Describe the issue in detail..."} rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <Switch id="anon-complaint" checked={form.isAnonymous} onCheckedChange={(v) => setForm((f) => ({ ...f, isAnonymous: v }))} />
                <div>
                  <Label htmlFor="anon-complaint" className="cursor-pointer font-medium">Submit Anonymously</Label>
                  <p className="text-xs text-muted-foreground">Your name will not be shown to admins</p>
                </div>
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
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(c.priority ?? "Medium")}`}>
                          <ShieldAlert className="w-3 h-3" />{c.priority ?? "Medium"}
                        </span>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>
                          {statusIcon(c.status)}{c.status}
                        </span>
                        {c.isAnonymous && (
                          <span className="text-xs text-muted-foreground italic">Anonymous</span>
                        )}
                      </div>
                      <p className="font-semibold mt-2">{c.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {!c.isAnonymous && c.authorName && <span>{c.authorName}</span>}
                        <span>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                      </div>
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
              <Textarea className="mt-1" placeholder="Add a note for the student..." value={statusUpdate.note} onChange={(e) => setStatusUpdate((u) => ({ ...u, note: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleStatusUpdate}>Update Status</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
