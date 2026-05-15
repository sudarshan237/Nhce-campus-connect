import { Router } from "express";
import { eq, desc, gte, and, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, eventsTable, eventRegistrationsTable, usersTable, notificationsTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { search, upcoming, page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (upcoming === "true") conditions.push(gte(eventsTable.date, new Date()));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const events = await db
      .select({
        id: eventsTable.id,
        title: eventsTable.title,
        description: eventsTable.description,
        date: eventsTable.date,
        venue: eventsTable.venue,
        organizerId: eventsTable.organizerId,
        organizerName: usersTable.name,
        imageUrl: eventsTable.imageUrl,
        registrationCount: eventsTable.registrationCount,
        maxAttendees: eventsTable.maxAttendees,
        createdAt: eventsTable.createdAt,
      })
      .from(eventsTable)
      .leftJoin(usersTable, eq(eventsTable.organizerId, usersTable.id))
      .where(where)
      .orderBy(desc(eventsTable.date))
      .offset(offset)
      .limit(Number(limit));

    const regs = await db
      .select({ eventId: eventRegistrationsTable.eventId })
      .from(eventRegistrationsTable)
      .where(eq(eventRegistrationsTable.userId, currentUser.userId));
    const regSet = new Set(regs.map((r) => r.eventId));

    const [{ total }] = await db.select({ total: count() }).from(eventsTable).where(where);
    res.json({
      events: events.map((e) => ({ ...e, organizerName: e.organizerName ?? null, imageUrl: e.imageUrl ?? null, maxAttendees: e.maxAttendees ?? null, isRegistered: regSet.has(e.id), date: e.date.toISOString(), createdAt: e.createdAt.toISOString() })),
      total,
    });
  } catch (err) {
    req.log.error({ err }, "List events error");
    res.status(500).json({ error: "Failed to load events. Please contact: patil.sudu237@gmail.com" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { title, description, date, venue, imageUrl, maxAttendees } = req.body;
    if (!title || !description || !date || !venue) { res.status(400).json({ error: "Title, description, date, and venue required" }); return; }
    const id = nanoid();
    const [event] = await db.insert(eventsTable).values({
      id,
      title,
      description,
      date: new Date(date),
      venue,
      organizerId: currentUser.userId,
      imageUrl: imageUrl ?? null,
      maxAttendees: maxAttendees ?? null,
    }).returning();
    res.status(201).json({ ...event, organizerName: null, imageUrl: event.imageUrl ?? null, maxAttendees: event.maxAttendees ?? null, isRegistered: false, date: event.date.toISOString(), createdAt: event.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Create event error");
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [event] = await db
      .select({
        id: eventsTable.id,
        title: eventsTable.title,
        description: eventsTable.description,
        date: eventsTable.date,
        venue: eventsTable.venue,
        organizerId: eventsTable.organizerId,
        organizerName: usersTable.name,
        imageUrl: eventsTable.imageUrl,
        registrationCount: eventsTable.registrationCount,
        maxAttendees: eventsTable.maxAttendees,
        createdAt: eventsTable.createdAt,
      })
      .from(eventsTable)
      .leftJoin(usersTable, eq(eventsTable.organizerId, usersTable.id))
      .where(eq(eventsTable.id, req.params.id))
      .limit(1);
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    const reg = await db.select().from(eventRegistrationsTable).where(and(eq(eventRegistrationsTable.eventId, req.params.id), eq(eventRegistrationsTable.userId, currentUser.userId))).limit(1);
    res.json({ ...event, organizerName: event.organizerName ?? null, imageUrl: event.imageUrl ?? null, maxAttendees: event.maxAttendees ?? null, isRegistered: reg.length > 0, date: event.date.toISOString(), createdAt: event.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Get event error");
    res.status(500).json({ error: "Failed to load event" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    if (!currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    const { title, description, date, venue, imageUrl, maxAttendees } = req.body;
    const updates: Partial<typeof eventsTable.$inferInsert> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = new Date(date);
    if (venue !== undefined) updates.venue = venue;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (maxAttendees !== undefined) updates.maxAttendees = maxAttendees;
    const [updated] = await db.update(eventsTable).set(updates).where(eq(eventsTable.id, req.params.id)).returning();
    if (!updated) { res.status(404).json({ error: "Event not found" }); return; }
    res.json({ ...updated, organizerName: null, imageUrl: updated.imageUrl ?? null, maxAttendees: updated.maxAttendees ?? null, isRegistered: false, date: updated.date.toISOString(), createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Update event error");
    res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    if (!currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(eventsTable).where(eq(eventsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete event error");
    res.status(500).json({ error: "Failed to delete event" });
  }
});

router.post("/:id/register", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const existing = await db.select().from(eventRegistrationsTable).where(and(eq(eventRegistrationsTable.eventId, req.params.id), eq(eventRegistrationsTable.userId, currentUser.userId))).limit(1);
    let registered: boolean;
    if (existing.length > 0) {
      await db.delete(eventRegistrationsTable).where(and(eq(eventRegistrationsTable.eventId, req.params.id), eq(eventRegistrationsTable.userId, currentUser.userId)));
      await db.update(eventsTable).set({ registrationCount: sql`${eventsTable.registrationCount} - 1` }).where(eq(eventsTable.id, req.params.id));
      registered = false;
    } else {
      await db.insert(eventRegistrationsTable).values({ id: nanoid(), eventId: req.params.id, userId: currentUser.userId });
      await db.update(eventsTable).set({ registrationCount: sql`${eventsTable.registrationCount} + 1` }).where(eq(eventsTable.id, req.params.id));
      registered = true;
      const [event] = await db.select({ title: eventsTable.title }).from(eventsTable).where(eq(eventsTable.id, req.params.id)).limit(1);
      if (event) {
        await db.insert(notificationsTable).values({ id: nanoid(), userId: currentUser.userId, title: "Event Registration", message: `You registered for "${event.title}"`, link: `/events/${req.params.id}` });
      }
    }
    const [event] = await db.select({ registrationCount: eventsTable.registrationCount }).from(eventsTable).where(eq(eventsTable.id, req.params.id)).limit(1);
    res.json({ registered, registrationCount: event?.registrationCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Toggle event registration error");
    res.status(500).json({ error: "Failed to toggle registration" });
  }
});

export default router;
