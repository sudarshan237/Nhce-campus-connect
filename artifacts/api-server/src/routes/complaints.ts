import { Router } from "express";
import { eq, desc, and, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, complaintsTable, complaintUpdatesTable, usersTable, notificationsTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { status, category, mine, page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (status) conditions.push(eq(complaintsTable.status, status));
    if (category) conditions.push(eq(complaintsTable.category, category));
    if (mine === "true" || !currentUser.isAdmin) conditions.push(eq(complaintsTable.authorId, currentUser.userId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const complaints = await db
      .select({
        id: complaintsTable.id,
        authorId: complaintsTable.authorId,
        authorName: usersTable.name,
        title: complaintsTable.title,
        description: complaintsTable.description,
        category: complaintsTable.category,
        status: complaintsTable.status,
        createdAt: complaintsTable.createdAt,
        updatedAt: complaintsTable.updatedAt,
      })
      .from(complaintsTable)
      .leftJoin(usersTable, eq(complaintsTable.authorId, usersTable.id))
      .where(where)
      .orderBy(desc(complaintsTable.createdAt))
      .offset(offset)
      .limit(Number(limit));

    const [{ total }] = await db.select({ total: count() }).from(complaintsTable).where(where);
    res.json({
      complaints: complaints.map((c) => ({ ...c, authorName: c.authorName ?? null, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })),
      total,
    });
  } catch (err) {
    req.log.error({ err }, "List complaints error");
    res.status(500).json({ error: "Failed to load complaints. Please contact: patil.sudu237@gmail.com" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { title, description, category } = req.body;
    if (!title || !description || !category) { res.status(400).json({ error: "Title, description, and category required" }); return; }
    const id = nanoid();
    const [complaint] = await db.insert(complaintsTable).values({ id, authorId: currentUser.userId, title, description, category }).returning();
    await db.insert(complaintUpdatesTable).values({ id: nanoid(), complaintId: id, status: "Pending", note: "Complaint submitted" });
    res.status(201).json({ ...complaint, authorName: null, createdAt: complaint.createdAt.toISOString(), updatedAt: complaint.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Create complaint error");
    res.status(500).json({ error: "Failed to submit complaint" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [complaint] = await db
      .select({
        id: complaintsTable.id,
        authorId: complaintsTable.authorId,
        authorName: usersTable.name,
        title: complaintsTable.title,
        description: complaintsTable.description,
        category: complaintsTable.category,
        status: complaintsTable.status,
        createdAt: complaintsTable.createdAt,
        updatedAt: complaintsTable.updatedAt,
      })
      .from(complaintsTable)
      .leftJoin(usersTable, eq(complaintsTable.authorId, usersTable.id))
      .where(eq(complaintsTable.id, req.params.id))
      .limit(1);
    if (!complaint) { res.status(404).json({ error: "Complaint not found" }); return; }
    if (complaint.authorId !== currentUser.userId && !currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

    const updates = await db
      .select()
      .from(complaintUpdatesTable)
      .where(eq(complaintUpdatesTable.complaintId, req.params.id))
      .orderBy(complaintUpdatesTable.createdAt);

    res.json({
      ...complaint,
      authorName: complaint.authorName ?? null,
      updates: updates.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
      createdAt: complaint.createdAt.toISOString(),
      updatedAt: complaint.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Get complaint error");
    res.status(500).json({ error: "Failed to load complaint" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    if (!currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    const { status, note } = req.body;
    if (!status) { res.status(400).json({ error: "Status required" }); return; }
    const [updated] = await db.update(complaintsTable).set({ status }).where(eq(complaintsTable.id, req.params.id)).returning();
    if (!updated) { res.status(404).json({ error: "Complaint not found" }); return; }
    await db.insert(complaintUpdatesTable).values({ id: nanoid(), complaintId: req.params.id, status, note: note ?? null });
    // Notify student
    await db.insert(notificationsTable).values({ id: nanoid(), userId: updated.authorId, title: "Complaint Updated", message: `Your complaint "${updated.title}" status changed to ${status}`, link: `/complaints` });
    res.json({ ...updated, authorName: null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Update complaint error");
    res.status(500).json({ error: "Failed to update complaint" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [existing] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.authorId !== currentUser.userId && !currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(complaintsTable).where(eq(complaintsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete complaint error");
    res.status(500).json({ error: "Failed to delete complaint" });
  }
});

export default router;
