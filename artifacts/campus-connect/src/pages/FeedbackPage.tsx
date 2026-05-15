import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, Plus, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const TYPES = ["Teacher","Department","Canteen","Hostel","Library","Transport","Sports","Facilities","Other"];

interface Feedback {
  id: string; authorId: string; authorName: string | null; type: string;
  targetName: string; rating: number; comment: string | null; isAnonymous: boolean; createdAt: string;
}

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        >
          <Star className={`w-5 h-5 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: "Teacher", targetName: "", rating: 5, comment: "", isAnonymous: false });
  const [filterType, setFilterType] = useState("_all");

  const loadFeedbacks = async (type?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type && type !== "_all") params.set("type", type);
      const data = await apiFetch<{ feedback: Feedback[] }>(`/feedback?${params}`);
      setFeedbacks(data.feedback);
    } catch {
      toast({ variant: "destructive", title: "Failed to load feedback" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFeedbacks(); }, []);

  const handleCreate = async () => {
    if (!form.targetName.trim()) {
      toast({ variant: "destructive", title: "Please enter the target name" });
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/feedback", { method: "POST", body: JSON.stringify(form) });
      setDialogOpen(false);
      setForm({ type: "Teacher", targetName: "", rating: 5, comment: "", isAnonymous: false });
      loadFeedbacks();
      toast({ title: "Feedback submitted!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setCreating(false);
    }
  };

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : "0.0";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feedback</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Give Feedback</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Feedback</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name / Subject *</Label>
                <Input className="mt-1" placeholder="e.g. Dr. Ramesh Kumar" value={form.targetName}
                  onChange={(e) => setForm((f) => ({ ...f, targetName: e.target.value }))} />
              </div>
              <div>
                <Label>Rating</Label>
                <div className="mt-2">
                  <StarRating value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
                </div>
              </div>
              <div>
                <Label>Comment (optional)</Label>
                <Textarea className="mt-1" rows={3} placeholder="Share your experience..." value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="anon-fb" checked={form.isAnonymous} onCheckedChange={(v) => setForm((f) => ({ ...f, isAnonymous: v }))} />
                <Label htmlFor="anon-fb">Submit anonymously</Label>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-yellow-500">{avgRating}</p>
            <p className="text-sm text-muted-foreground mt-1">Average Rating</p>
            <StarRating value={Math.round(Number(avgRating))} readonly />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold">{feedbacks.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Responses</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 items-center">
        <Label className="text-sm whitespace-nowrap">Filter by:</Label>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); loadFeedbacks(v); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No feedback yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <Card key={fb.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{fb.type}</Badge>
                      <span className="font-medium text-sm">{fb.targetName}</span>
                    </div>
                    <div className="mt-2">
                      <StarRating value={fb.rating} readonly />
                    </div>
                    {fb.comment && <p className="text-sm text-muted-foreground mt-2">{fb.comment}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      {fb.isAnonymous ? "Anonymous" : (fb.authorName ?? "Unknown")} · {formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
