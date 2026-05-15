import { Router } from "express";
import { eq, desc, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, feedbackTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { type, page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);
    const where = type ? eq(feedbackTable.type, type) : undefined;
    const feedback = await db.select().from(feedbackTable).where(where).orderBy(desc(feedbackTable.createdAt)).offset(offset).limit(Number(limit));
    const [{ total }] = await db.select({ total: count() }).from(feedbackTable).where(where);
    res.json({
      feedback: feedback.map((f) => ({ ...f, authorId: f.isAnonymous ? null : (f.authorId ?? null), createdAt: f.createdAt.toISOString() })),
      total,
    });
  } catch (err) {
    req.log.error({ err }, "List feedback error");
    res.status(500).json({ error: "Failed to load feedback" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { type, targetName, rating, comment, isAnonymous } = req.body;
    if (!type || !rating) { res.status(400).json({ error: "Type and rating required" }); return; }
    const id = nanoid();
    const [fb] = await db.insert(feedbackTable).values({
      id,
      authorId: isAnonymous ? null : currentUser.userId,
      type,
      targetName: targetName ?? null,
      rating: Number(rating),
      comment: comment ?? null,
      isAnonymous: isAnonymous ?? false,
    }).returning();
    res.status(201).json({ ...fb, createdAt: fb.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Create feedback error");
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

export default router;
