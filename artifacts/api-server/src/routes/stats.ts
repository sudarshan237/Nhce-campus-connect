import { Router } from "express";
import { eq, gte, and, desc, count } from "drizzle-orm";
import { db, usersTable, complaintsTable, eventsTable, placementsTable, postsTable, notificationsTable, eventRegistrationsTable, placementSavesTable, feedbackTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/admin", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    if (!currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

    const [[{ totalUsers }], [{ totalStudents }], [{ totalComplaints }], [{ pendingComplaints }], [{ resolvedComplaints }], [{ totalEvents }], [{ totalPlacements }], [{ totalPosts }], [{ totalFeedback }]] = await Promise.all([
      db.select({ totalUsers: count() }).from(usersTable),
      db.select({ totalStudents: count() }).from(usersTable).where(eq(usersTable.isAdmin, false)),
      db.select({ totalComplaints: count() }).from(complaintsTable),
      db.select({ pendingComplaints: count() }).from(complaintsTable).where(eq(complaintsTable.status, "Pending")),
      db.select({ resolvedComplaints: count() }).from(complaintsTable).where(eq(complaintsTable.status, "Resolved")),
      db.select({ totalEvents: count() }).from(eventsTable),
      db.select({ totalPlacements: count() }).from(placementsTable),
      db.select({ totalPosts: count() }).from(postsTable),
      db.select({ totalFeedback: count() }).from(feedbackTable),
    ]);

    const categories = ["Electrical", "Water", "WiFi", "Cleanliness", "Security", "Harassment", "Other"];
    const categoryCounts = await Promise.all(
      categories.map(async (cat) => {
        const [{ cnt }] = await db.select({ cnt: count() }).from(complaintsTable).where(eq(complaintsTable.category, cat));
        return { category: cat, count: Number(cnt) };
      })
    );

    const recentPosts = await db.select({ title: postsTable.content, createdAt: postsTable.createdAt }).from(postsTable).orderBy(postsTable.createdAt).limit(5);

    res.json({
      totalUsers: Number(totalUsers),
      totalStudents: Number(totalStudents),
      totalComplaints: Number(totalComplaints),
      pendingComplaints: Number(pendingComplaints),
      resolvedComplaints: Number(resolvedComplaints),
      totalEvents: Number(totalEvents),
      totalPlacements: Number(totalPlacements),
      totalPosts: Number(totalPosts),
      totalFeedback: Number(totalFeedback),
      complaintsByCategory: categoryCounts,
      recentActivity: recentPosts.map((p) => ({
        type: "post",
        message: p.title.slice(0, 80),
        link: null,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
    res.status(500).json({ error: "Failed to load stats. Please contact: patil.sudu237@gmail.com" });
  }
});

router.get("/student", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [[{ myComplaints }], [{ myComplaintsResolved }], [{ myEventRegistrations }], [{ myPlacements }], [{ unreadNotifications }]] = await Promise.all([
      db.select({ myComplaints: count() }).from(complaintsTable).where(eq(complaintsTable.authorId, currentUser.userId)),
      db.select({ myComplaintsResolved: count() }).from(complaintsTable).where(and(eq(complaintsTable.authorId, currentUser.userId), eq(complaintsTable.status, "Resolved"))),
      db.select({ myEventRegistrations: count() }).from(eventRegistrationsTable).where(eq(eventRegistrationsTable.userId, currentUser.userId)),
      db.select({ myPlacements: count() }).from(placementSavesTable).where(eq(placementSavesTable.userId, currentUser.userId)),
      db.select({ unreadNotifications: count() }).from(notificationsTable).where(and(eq(notificationsTable.userId, currentUser.userId), eq(notificationsTable.isRead, false))),
    ]);

    const [upcomingEvents, openPlacements, recentPosts] = await Promise.all([
      db.select({ id: eventsTable.id, title: eventsTable.title, date: eventsTable.date, venue: eventsTable.venue })
        .from(eventsTable).where(gte(eventsTable.date, new Date())).orderBy(eventsTable.date).limit(3),
      db.select().from(placementsTable).where(gte(placementsTable.applyBy, new Date())).orderBy(desc(placementsTable.createdAt)).limit(3),
      db.select({ id: postsTable.id, content: postsTable.content, category: postsTable.category, likeCount: postsTable.likeCount, createdAt: postsTable.createdAt })
        .from(postsTable).orderBy(desc(postsTable.createdAt)).limit(5),
    ]);

    res.json({
      myComplaints: Number(myComplaints),
      myComplaintsResolved: Number(myComplaintsResolved),
      myEventRegistrations: Number(myEventRegistrations),
      myPlacements: Number(myPlacements),
      unreadNotifications: Number(unreadNotifications),
      upcomingEvents: upcomingEvents.map((e) => ({ ...e, date: e.date.toISOString() })),
      openPlacements: openPlacements.map((p) => ({ ...p, packageLpa: p.packageLpa ?? null, applyLink: p.applyLink ?? null, applyBy: p.applyBy.toISOString(), createdAt: p.createdAt.toISOString() })),
      recentPosts: recentPosts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "Student stats error");
    res.status(500).json({ error: "Failed to load stats" });
  }
});

export default router;
