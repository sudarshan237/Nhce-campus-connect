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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, Plus, Search, Clock, CheckCircle2, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string; title: string; description: string; date: string; venue: string;
  organizerId: string; maxAttendees: number | null; registrationCount: number;
  isRegistered?: boolean;
}

export default function EventsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "", venue: "", maxAttendees: "" });
  const [registering, setRegistering] = useState<string | null>(null);

  const loadEvents = async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      const data = await apiFetch<{ events: Event[] }>(`/events?${params}`);
      setEvents(data.events);
    } catch {
      toast({ variant: "destructive", title: "Failed to load events" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, []);

  const handleRegister = async (id: string, registered: boolean) => {
    setRegistering(id);
    try {
      await apiFetch(`/events/${id}/register`, { method: "POST" });
      setEvents((prev) => prev.map((e) => e.id === id ? {
        ...e,
        isRegistered: !registered,
        registrationCount: registered ? e.registrationCount - 1 : e.registrationCount + 1
      } : e));
      toast({ title: registered ? "Unregistered from event" : "Registered successfully!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setRegistering(null);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.date || !form.venue) {
      toast({ variant: "destructive", title: "Please fill required fields" });
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/events", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : null,
        }),
      });
      setDialogOpen(false);
      setForm({ title: "", description: "", date: "", venue: "", maxAttendees: "" });
      loadEvents();
      toast({ title: "Event created!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await apiFetch(`/events/${id}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Event deleted" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    }
  };

  const upcoming = events.filter((e) => new Date(e.date) >= new Date());
  const past = events.filter((e) => new Date(e.date) < new Date());

  const EventCard = ({ event }: { event: Event }) => {
    const isPast = new Date(event.date) < new Date();
    const isFull = event.maxAttendees !== null && event.registrationCount >= event.maxAttendees;
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex flex-col items-center justify-center flex-shrink-0 text-green-600">
              <span className="text-lg font-bold leading-none">{format(parseISO(event.date), "dd")}</span>
              <span className="text-xs">{format(parseISO(event.date), "MMM")}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold leading-tight">{event.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{format(parseISO(event.date), "h:mm a")}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.venue}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{event.registrationCount}{event.maxAttendees ? `/${event.maxAttendees}` : ""} registered</span>
              </div>
            </div>
            {user?.isAdmin && (
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => handleDelete(event.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          {!isPast && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              {isFull && !event.isRegistered ? (
                <Badge variant="secondary">Full</Badge>
              ) : (
                <Button
                  variant={event.isRegistered ? "outline" : "default"}
                  size="sm"
                  disabled={registering === event.id}
                  onClick={() => handleRegister(event.id, event.isRegistered ?? false)}
                  className="gap-1.5"
                >
                  {event.isRegistered ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" />Registered</>
                  ) : "Register"}
                </Button>
              )}
              {event.isRegistered && <Badge variant="outline" className="text-green-600 border-green-500">You're in!</Badge>}
            </div>
          )}
          {isPast && <Badge variant="secondary" className="mt-3">Completed</Badge>}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        {user?.isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Create</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Title *</Label><Input className="mt-1" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Event title" /></div>
                <div><Label>Description</Label><Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Event description..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date & Time *</Label><Input className="mt-1" type="datetime-local" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
                  <div><Label>Max Attendees</Label><Input className="mt-1" type="number" placeholder="No limit" value={form.maxAttendees} onChange={(e) => setForm((f) => ({ ...f, maxAttendees: e.target.value }))} /></div>
                </div>
                <div><Label>Venue *</Label><Input className="mt-1" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Location or hall name" /></div>
                <Button className="w-full" onClick={handleCreate} disabled={creating}>{creating ? "Creating..." : "Create Event"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search events..." value={search}
          onChange={(e) => { setSearch(e.target.value); loadEvents(e.target.value); }} />
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">UPCOMING</h2>
              <div className="space-y-4">{upcoming.map((e) => <EventCard key={e.id} event={e} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">PAST EVENTS</h2>
              <div className="space-y-4 opacity-70">{past.map((e) => <EventCard key={e.id} event={e} />)}</div>
            </div>
          )}
          {events.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No events found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
