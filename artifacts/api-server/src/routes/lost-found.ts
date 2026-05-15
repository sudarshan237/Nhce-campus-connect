import { Router } from "express";
import { eq, desc, ilike, and, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, lostFoundTable, usersTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { type, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (type) conditions.push(eq(lostFoundTable.type, type));
    if (search) conditions.push(ilike(lostFoundTable.title, `%${search}%`));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select({
        id: lostFoundTable.id,
        authorId: lostFoundTable.authorId,
        authorName: usersTable.name,
        type: lostFoundTable.type,
        title: lostFoundTable.title,
        description: lostFoundTable.description,
        location: lostFoundTable.location,
        imageUrl: lostFoundTable.imageUrl,
        contact: lostFoundTable.contact,
        isResolved: lostFoundTable.isResolved,
        createdAt: lostFoundTable.createdAt,
      })
      .from(lostFoundTable)
      .leftJoin(usersTable, eq(lostFoundTable.authorId, usersTable.id))
      .where(where)
      .orderBy(desc(lostFoundTable.createdAt))
      .offset(offset)
      .limit(Number(limit));

    const [{ total }] = await db.select({ total: count() }).from(lostFoundTable).where(where);
    res.json({
      items: items.map((i) => ({ ...i, authorName: i.authorName ?? null, imageUrl: i.imageUrl ?? null, contact: i.contact ?? null, createdAt: i.createdAt.toISOString() })),
      total,
    });
  } catch (err) {
    req.log.error({ err }, "List lost/found error");
    res.status(500).json({ error: "Failed to load lost & found. Please contact: patil.sudu237@gmail.com" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { type, title, description, location, imageUrl, contact } = req.body;
    if (!type || !title || !description || !location) { res.status(400).json({ error: "Required fields missing" }); return; }
    const id = nanoid();
    const [item] = await db.insert(lostFoundTable).values({ id, authorId: currentUser.userId, type, title, description, location, imageUrl: imageUrl ?? null, contact: contact ?? null }).returning();
    res.status(201).json({ ...item, authorName: null, imageUrl: item.imageUrl ?? null, contact: item.contact ?? null, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Create lost/found error");
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [existing] = await db.select().from(lostFoundTable).where(eq(lostFoundTable.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.authorId !== currentUser.userId && !currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    const { isResolved, contact } = req.body;
    const updates: Partial<typeof lostFoundTable.$inferInsert> = {};
    if (isResolved !== undefined) updates.isResolved = isResolved;
    if (contact !== undefined) updates.contact = contact;
    const [updated] = await db.update(lostFoundTable).set(updates).where(eq(lostFoundTable.id, req.params.id)).returning();
    res.json({ ...updated, authorName: null, imageUrl: updated.imageUrl ?? null, contact: updated.contact ?? null, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Update lost/found error");
    res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [existing] = await db.select().from(lostFoundTable).where(eq(lostFoundTable.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.authorId !== currentUser.userId && !currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(lostFoundTable).where(eq(lostFoundTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete lost/found error");
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
