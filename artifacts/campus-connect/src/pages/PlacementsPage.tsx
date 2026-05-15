import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Plus, Search, IndianRupee, Clock, Users, BookmarkPlus, Bookmark, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Placement {
  id: string; company: string; role: string; description: string;
  eligibility: string; packageLpa: number; applyBy: string;
  applyLink: string | null; applicantCount: number; isSaved?: boolean; isApplied?: boolean;
}

export default function PlacementsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    company: "", role: "", description: "", eligibility: "",
    packageLpa: "", applyBy: "", applyLink: ""
  });

  const loadPlacements = async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (tab === "saved") params.set("saved", "true");
      const data = await apiFetch<{ placements: Placement[] }>(`/placements?${params}`);
      setPlacements(data.placements);
    } catch {
      toast({ variant: "destructive", title: "Failed to load placements" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlacements(); }, [tab]);

  const handleSave = async (id: string, saved: boolean) => {
    try {
      await apiFetch(`/placements/${id}/save`, { method: "POST" });
      setPlacements((prev) => prev.map((p) => p.id === id ? { ...p, isSaved: !saved } : p));
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    }
  };

  const handleApply = async (id: string) => {
    try {
      await apiFetch(`/placements/${id}/apply`, { method: "POST" });
      setPlacements((prev) => prev.map((p) => p.id === id ? { ...p, isApplied: true, applicantCount: p.applicantCount + 1 } : p));
      toast({ title: "Application tracked!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    }
  };

  const handleCreate = async () => {
    if (!form.company || !form.role || !form.packageLpa || !form.applyBy) {
      toast({ variant: "destructive", title: "Please fill required fields" });
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/placements", {
        method: "POST",
        body: JSON.stringify({ ...form, packageLpa: Number(form.packageLpa) }),
      });
      setDialogOpen(false);
      setForm({ company: "", role: "", description: "", eligibility: "", packageLpa: "", applyBy: "", applyLink: "" });
      loadPlacements();
      toast({ title: "Placement posted!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setCreating(false);
    }
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Placements</h1>
        {user?.isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Post</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Post Placement</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Company *</Label><Input className="mt-1" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Infosys" /></div>
                  <div><Label>Role *</Label><Input className="mt-1" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Software Engineer" /></div>
                </div>
                <div><Label>Description</Label><Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
                <div><Label>Eligibility</Label><Input className="mt-1" value={form.eligibility} onChange={(e) => setForm((f) => ({ ...f, eligibility: e.target.value }))} placeholder="60%+ aggregate, 2026 batch" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Package (LPA) *</Label><Input className="mt-1" type="number" step="0.1" value={form.packageLpa} onChange={(e) => setForm((f) => ({ ...f, packageLpa: e.target.value }))} placeholder="3.5" /></div>
                  <div><Label>Apply By *</Label><Input className="mt-1" type="date" value={form.applyBy} onChange={(e) => setForm((f) => ({ ...f, applyBy: e.target.value }))} /></div>
                </div>
                <div><Label>Apply Link</Label><Input className="mt-1" value={form.applyLink} onChange={(e) => setForm((f) => ({ ...f, applyLink: e.target.value }))} placeholder="https://careers.company.com" /></div>
                <Button className="w-full" onClick={handleCreate} disabled={creating}>{creating ? "Posting..." : "Post Placement"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search companies or roles..." value={search}
          onChange={(e) => { setSearch(e.target.value); loadPlacements(e.target.value); }} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
          ) : placements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No placements found</p>
            </div>
          ) : (
            placements.map((p) => (
              <Card key={p.id} className={`hover:shadow-md transition-shadow ${isExpired(p.applyBy) ? "opacity-60" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{p.company}</h3>
                        <Badge variant="secondary">{p.role}</Badge>
                        {isExpired(p.applyBy) && <Badge variant="outline" className="text-muted-foreground">Expired</Badge>}
                        {p.isApplied && <Badge className="bg-green-500/10 text-green-600 border-0">Applied</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                      {p.eligibility && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{p.eligibility}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1 font-semibold text-green-600">
                          <IndianRupee className="w-3.5 h-3.5" />{p.packageLpa} LPA
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Clock className="w-3.5 h-3.5" />Apply by {format(parseISO(p.applyBy), "dd MMM yyyy")}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Users className="w-3.5 h-3.5" />{p.applicantCount} interested
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleSave(p.id, p.isSaved ?? false)}>
                        {p.isSaved ? <Bookmark className="w-4 h-4 fill-current text-primary" /> : <BookmarkPlus className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {!isExpired(p.applyBy) && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                      {p.applyLink && (
                        <Button variant="default" size="sm" className="gap-1.5" asChild>
                          <a href={p.applyLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />Apply Now
                          </a>
                        </Button>
                      )}
                      {!p.isApplied && (
                        <Button variant="outline" size="sm" onClick={() => handleApply(p.id)}>
                          Mark as Applied
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
