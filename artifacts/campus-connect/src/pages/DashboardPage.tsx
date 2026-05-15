import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, AlertCircle, Calendar, Briefcase, MessageSquare,
  Package, Star, TrendingUp, CheckCircle2, Clock
} from "lucide-react";
import { Link } from "wouter";

interface StudentStats {
  myComplaints: number;
  myComplaintsResolved: number;
  myEventRegistrations: number;
  myPlacements: number;
  unreadNotifications: number;
  recentPosts: Array<{ id: string; content: string; category: string; likeCount: number; createdAt: string }>;
  upcomingEvents: Array<{ id: string; title: string; date: string; venue: string }>;
  openPlacements: Array<{ id: string; company: string; role: string; packageLpa: number; applyBy: string }>;
}

interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalComplaints: number;
  pendingComplaints: number;
  totalEvents: number;
  totalPlacements: number;
  totalPosts: number;
  totalFeedback: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentStats | AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<StudentStats | AdminStats>(user?.isAdmin ? "/stats/admin" : "/stats/student")
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (user?.isAdmin) {
    const s = stats as AdminStats;
    const statCards = [
      { label: "Total Users", value: s?.totalUsers ?? 0, icon: <Users className="w-5 h-5" />, color: "text-blue-500", href: "/admin" },
      { label: "Students", value: s?.totalStudents ?? 0, icon: <Users className="w-5 h-5" />, color: "text-indigo-500", href: "/admin" },
      { label: "Complaints", value: s?.totalComplaints ?? 0, icon: <AlertCircle className="w-5 h-5" />, color: "text-orange-500", href: "/complaints" },
      { label: "Pending", value: s?.pendingComplaints ?? 0, icon: <Clock className="w-5 h-5" />, color: "text-red-500", href: "/complaints" },
      { label: "Events", value: s?.totalEvents ?? 0, icon: <Calendar className="w-5 h-5" />, color: "text-green-500", href: "/events" },
      { label: "Placements", value: s?.totalPlacements ?? 0, icon: <Briefcase className="w-5 h-5" />, color: "text-purple-500", href: "/placements" },
      { label: "Posts", value: s?.totalPosts ?? 0, icon: <MessageSquare className="w-5 h-5" />, color: "text-teal-500", href: "/feed" },
      { label: "Feedback", value: s?.totalFeedback ?? 0, icon: <Star className="w-5 h-5" />, color: "text-yellow-500", href: "/feedback" },
    ];
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((c) => (
            <Link key={c.label} href={c.href}>
              <a>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className={`${c.color} mb-2`}>{c.icon}</div>
                    <p className="text-2xl font-bold">{c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-3">
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {[
                { href: "/events", label: "Manage Events", icon: <Calendar className="w-4 h-4" /> },
                { href: "/placements", label: "Post Placement", icon: <Briefcase className="w-4 h-4" /> },
                { href: "/complaints", label: "Review Complaints", icon: <AlertCircle className="w-4 h-4" /> },
                { href: "/admin", label: "Manage Users", icon: <Users className="w-4 h-4" /> },
              ].map((action) => (
                <Link key={action.href} href={action.href}>
                  <a className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    {action.icon}{action.label}
                  </a>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const s = stats as StudentStats;
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0]}!</h1>
        <p className="text-muted-foreground">Here's what's happening on campus</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "My Complaints", value: s?.myComplaints ?? 0, sub: `${s?.myComplaintsResolved ?? 0} resolved`, icon: <AlertCircle className="w-5 h-5" />, color: "text-orange-500", href: "/complaints" },
          { label: "Events Joined", value: s?.myEventRegistrations ?? 0, icon: <Calendar className="w-5 h-5" />, color: "text-green-500", href: "/events" },
          { label: "Jobs Saved", value: s?.myPlacements ?? 0, icon: <Briefcase className="w-5 h-5" />, color: "text-purple-500", href: "/placements" },
          { label: "Notifications", value: s?.unreadNotifications ?? 0, sub: "unread", icon: <TrendingUp className="w-5 h-5" />, color: "text-blue-500", href: "/notifications" },
        ].map((c) => (
          <Link key={c.label} href={c.href}>
            <a>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className={`${c.color} mb-2`}>{c.icon}</div>
                  <p className="text-2xl font-bold">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-green-500" />Upcoming Events</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(s?.upcomingEvents ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              s?.upcomingEvents?.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</p>
                    <p className="text-xs text-muted-foreground">{ev.venue}</p>
                  </div>
                </div>
              ))
            )}
            <Link href="/events"><a className="text-sm text-primary font-medium hover:underline">View all events →</a></Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4 text-purple-500" />Open Placements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(s?.openPlacements ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No open placements</p>
            ) : (
              s?.openPlacements?.map((pl) => (
                <div key={pl.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{pl.company}</p>
                    <p className="text-xs text-muted-foreground">{pl.role}</p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="secondary" className="text-xs">₹{pl.packageLpa} LPA</Badge>
                      <p className="text-xs text-muted-foreground">By {new Date(pl.applyBy).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <Link href="/placements"><a className="text-sm text-primary font-medium hover:underline">View all placements →</a></Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4 text-teal-500" />Recent Posts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(s?.recentPosts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent posts</p>
            ) : (
              s?.recentPosts?.map((post) => (
                <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="text-xs mt-0.5 whitespace-nowrap">{post.category}</Badge>
                  <p className="text-sm flex-1 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3" />{post.likeCount}
                  </div>
                </div>
              ))
            )}
            <Link href="/feed"><a className="text-sm text-primary font-medium hover:underline">View campus feed →</a></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
