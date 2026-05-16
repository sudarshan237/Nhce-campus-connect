import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Heart, MessageCircle, Pin, Trash2, Plus, Search, Send, RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["General","Announcements","Study Help","Events","Complaints","Lost & Found","Fun","Other"];

const CATEGORY_EXAMPLES: Record<string, string> = {
  "General": "e.g. Important update for all students...",
  "Announcements": "e.g. Class timings changed for tomorrow — 9 AM slot shifted to 11 AM. Please check with your CR.",
  "Study Help": "e.g. Anyone have notes for DSA Unit 4? Struggling with graphs — happy to share mine for the other units.",
  "Events": "e.g. Hackathon this weekend at Block C! Open to all branches. Teams of 2–4. Register by Friday.",
  "Complaints": "e.g. WiFi in Block B hostel has been down for 3 days. Raised a ticket but no response yet.",
  "Lost & Found": "e.g. Found a blue water bottle near the canteen. Has initials 'RK' on it. DM to claim.",
  "Fun": "e.g. Anyone else think the sambar today was suspiciously good? Best meal in months 😂",
  "Other": "e.g. Anything that doesn't fit the other categories — share away!",
};

interface Post {
  id: string; authorId: string; authorName: string | null; content: string;
  category: string; likeCount: number; commentCount: number; isPinned: boolean;
  isAnonymous: boolean; isLiked: boolean; createdAt: string;
}

interface Comment {
  id: string; postId: string; authorId: string; authorName: string | null;
  content: string; createdAt: string;
}

function PostCard({ post, userId, isAdmin, onDelete, onLike, onPin, onCommentCountChange }: {
  post: Post; userId: string; isAdmin: boolean;
  onDelete: (id: string) => void; onLike: (id: string) => void; onPin: (id: string, v: boolean) => void;
  onCommentCountChange: (id: string, count: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const loadComments = async () => {
    const data = await apiFetch<Comment[]>(`/posts/${post.id}/comments`);
    setComments(data);
    onCommentCountChange(post.id, data.length);
  };

  const toggleComments = async () => {
    if (!showComments) await loadComments();
    setShowComments((v) => !v);
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch(`/posts/${post.id}/comments`, { method: "POST", body: JSON.stringify({ content: newComment }) });
      setNewComment("");
      await loadComments();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const initials = (post.authorName ?? "A").split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase();

  return (
    <Card className={post.isPinned ? "border-primary/50 shadow-sm" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{post.isAnonymous ? "Anonymous" : (post.authorName ?? "Unknown")}</p>
              <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {post.isPinned && <Pin className="w-3.5 h-3.5 text-primary" />}
            <Badge variant="secondary" className="text-xs">{post.category}</Badge>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed">{post.content}</p>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <button
            className={`flex items-center gap-1.5 text-sm transition-colors ${post.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
            onClick={() => onLike(post.id)}
          >
            <Heart className={`w-4 h-4 ${post.isLiked ? "fill-current" : ""}`} />
            <span>{post.likeCount}</span>
          </button>
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={toggleComments}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentCount}</span>
          </button>
          {isAdmin && (
            <button
              className={`flex items-center gap-1.5 text-sm ml-auto transition-colors ${post.isPinned ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
              onClick={() => onPin(post.id, !post.isPinned)}
            >
              <Pin className="w-4 h-4" />
            </button>
          )}
          {(post.authorId === userId || isAdmin) && (
            <button
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors ml-auto"
              onClick={() => onDelete(post.id)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {showComments && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="text-xs">{(c.authorName ?? "A")[0]}</AvatarFallback>
                </Avatar>
                <div className="bg-muted/50 rounded-lg px-3 py-2 flex-1">
                  <p className="text-xs font-medium">{c.authorName ?? "Anonymous"}</p>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                className="text-sm"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
              />
              <Button size="icon" variant="ghost" onClick={submitComment} disabled={submitting}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [newPost, setNewPost] = useState({ content: "", category: "General", isAnonymous: false });
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPosts = async (q?: string, cat?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (cat) params.set("category", cat);
      const data = await apiFetch<{ posts: Post[] }>(`/posts?${params}`);
      setPosts(data.posts);
    } catch {
      toast({ variant: "destructive", title: "Failed to load posts" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPosts(); }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadPosts(v, category), 400);
  };

  const handleCategory = (v: string) => {
    setCategory(v === "_all" ? "" : v);
    loadPosts(search, v === "_all" ? "" : v);
  };

  const handleCreate = async () => {
    if (!newPost.content.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/posts", { method: "POST", body: JSON.stringify(newPost) });
      setDialogOpen(false);
      setNewPost({ content: "", category: "General", isAnonymous: false });
      loadPosts();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setCreating(false);
    }
  };

  const handleLike = async (id: string) => {
    try {
      const result = await apiFetch<{ liked: boolean; likeCount: number }>(`/posts/${id}/like`, { method: "POST" });
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, isLiked: result.liked, likeCount: result.likeCount } : p));
    } catch { }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/posts/${id}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    }
  };

  const handlePin = async (id: string, isPinned: boolean) => {
    try {
      await apiFetch(`/posts/${id}/pin`, { method: "PATCH", body: JSON.stringify({ isPinned }) });
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, isPinned } : p));
    } catch { }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campus Feed</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => loadPosts(search, category)}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Post</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <Select value={newPost.category} onValueChange={(v) => setNewPost((p) => ({ ...p, category: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    className="mt-1"
                    placeholder={CATEGORY_EXAMPLES[newPost.category] ?? "What's on your mind?"}
                    rows={4}
                    value={newPost.content}
                    onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="anon"
                    checked={newPost.isAnonymous}
                    onCheckedChange={(v) => setNewPost((p) => ({ ...p, isAnonymous: v }))}
                  />
                  <Label htmlFor="anon">Post anonymously</Label>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={creating}>
                  {creating ? "Posting..." : "Post"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search posts..." value={search} onChange={(e) => handleSearch(e.target.value)} />
        </div>
        <Select onValueChange={handleCategory}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No posts found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={user?.id ?? ""}
              isAdmin={user?.isAdmin ?? false}
              onDelete={handleDelete}
              onLike={handleLike}
              onPin={handlePin}
              onCommentCountChange={(id, count) =>
                setPosts((prev) => prev.map((p) => p.id === id ? { ...p, commentCount: count } : p))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
