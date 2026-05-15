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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Package, Plus, Search, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface LostFound {
  id: string; authorId: string; authorName: string | null; type: "Lost" | "Found";
  title: string; description: string; location: string; contact: string | null;
  isResolved: boolean; createdAt: string;
}

export default function LostFoundPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<LostFound[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: "Lost", title: "", description: "", location: "", contact: "" });

  const loadItems = async (q?: string, type?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (type && type !== "all") params.set("type", type);
      const data = await apiFetch<{ items: LostFound[] }>(`/lost-found?${params}`);
      setItems(data.items);
    } catch {
      toast({ variant: "destructive", title: "Failed to load items" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(search, tab); }, [tab]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.location.trim()) {
      toast({ variant: "destructive", title: "Please fill required fields" });
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/lost-found", { method: "POST", body: JSON.stringify(form) });
      setDialogOpen(false);
      setForm({ type: "Lost", title: "", description: "", location: "", contact: "" });
      loadItems(search, tab);
      toast({ title: "Posted successfully!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setCreating(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await apiFetch(`/lost-found/${id}`, { method: "PATCH", body: JSON.stringify({ isResolved: true }) });
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, isResolved: true } : item));
      toast({ title: "Marked as resolved!" });
    } catch { }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lost & Found</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Post</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Post Lost/Found Item</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lost">I Lost Something</SelectItem>
                    <SelectItem value="Found">I Found Something</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Item Name *</Label><Input className="mt-1" placeholder="e.g. Blue backpack" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea className="mt-1" rows={3} placeholder="Describe the item..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>Location *</Label><Input className="mt-1" placeholder="Where was it lost/found?" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></div>
              <div><Label>Contact (optional)</Label><Input className="mt-1" placeholder="Phone number" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={creating}>{creating ? "Posting..." : "Post"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search items..." value={search}
          onChange={(e) => { setSearch(e.target.value); loadItems(e.target.value, tab); }} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Lost">Lost</TabsTrigger>
          <TabsTrigger value="Found">Found</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No items found</p>
            </div>
          ) : (
            items.map((item) => (
              <Card key={item.id} className={item.isResolved ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.type === "Lost" ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={item.type === "Lost" ? "destructive" : "default"} className="text-xs">
                          {item.type}
                        </Badge>
                        {item.isResolved && <Badge variant="secondary" className="text-xs gap-1"><CheckCircle2 className="w-3 h-3" />Resolved</Badge>}
                        <h3 className="font-semibold text-sm">{item.title}</h3>
                      </div>
                      {item.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>
                        {item.contact && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{item.contact}</span>}
                        <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  {!item.isResolved && item.authorId === user?.id && (
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => handleResolve(item.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5" />Mark as Resolved
                    </Button>
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
