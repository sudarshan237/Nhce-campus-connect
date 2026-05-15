import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { unreadOnly } = req.query as Record<string, string>;
    const conditions = [eq(notificationsTable.userId, currentUser.userId)];
    if (unreadOnly === "true") conditions.push(eq(notificationsTable.isRead, false));
    const notifications = await db.select().from(notificationsTable).where(and(...conditions)).orderBy(desc(notificationsTable.createdAt)).limit(50);
    res.json(notifications.map((n) => ({ ...n, link: n.link ?? null, createdAt: n.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "List notifications error");
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

router.post("/read-all", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, currentUser.userId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Mark all read error");
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const [updated] = await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, req.params.id)).returning();
    if (!updated) { res.status(404).json({ error: "Notification not found" }); return; }
    res.json({ ...updated, link: updated.link ?? null, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Mark read error");
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

export default router;
