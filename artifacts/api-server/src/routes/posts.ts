import { Router } from "express";
import { eq, desc, ilike, and, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, postsTable, postLikesTable, commentsTable, usersTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { category, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (category) conditions.push(eq(postsTable.category, category));
    if (search) conditions.push(ilike(postsTable.content, `%${search}%`));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const posts = await db
      .select({
        id: postsTable.id,
        authorId: postsTable.authorId,
        authorName: usersTable.name,
        authorAvatar: usersTable.avatarUrl,
        content: postsTable.content,
        imageUrl: postsTable.imageUrl,
        category: postsTable.category,
        likeCount: postsTable.likeCount,
        commentCount: postsTable.commentCount,
        isPinned: postsTable.isPinned,
        isAnonymous: postsTable.isAnonymous,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(where)
      .orderBy(desc(postsTable.isPinned), desc(postsTable.createdAt))
      .offset(offset)
      .limit(Number(limit));

    const likedIds = await db
      .select({ postId: postLikesTable.postId })
      .from(postLikesTable)
      .where(eq(postLikesTable.userId, currentUser.userId));
    const likedSet = new Set(likedIds.map((l) => l.postId));

    const [{ total }] = await db.select({ total: count() }).from(postsTable).where(where);

    res.json({
      posts: posts.map((p) => ({
        ...p,
        authorName: p.isAnonymous ? null : (p.authorName ?? null),
        authorAvatar: p.isAnonymous ? null : (p.authorAvatar ?? null),
        isLiked: likedSet.has(p.id),
        createdAt: p.createdAt.toISOString(),
      })),
      total,
    });
  } catch (err) {
    req.log.error({ err }, "List posts error");
    res.status(500).json({ error: "Failed to load posts. Please contact: patil.sudu237@gmail.com" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { content, imageUrl, category, isAnonymous } = req.body;
    if (!content || !category) { res.status(400).json({ error: "Content and category required" }); return; }
    const id = nanoid();
    const [post] = await db.insert(postsTable).values({
      id,
      authorId: currentUser.userId,
      content,
      imageUrl: imageUrl ?? null,
      category,
      isAnonymous: isAnonymous ?? false,
    }).returning();
    res.status(201).json({ ...post, authorName: null, authorAvatar: null, isLiked: false, createdAt: post.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Create post error");
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [post] = await db
      .select({
        id: postsTable.id,
        authorId: postsTable.authorId,
        authorName: usersTable.name,
        authorAvatar: usersTable.avatarUrl,
        content: postsTable.content,
        imageUrl: postsTable.imageUrl,
        category: postsTable.category,
        likeCount: postsTable.likeCount,
        commentCount: postsTable.commentCount,
        isPinned: postsTable.isPinned,
        isAnonymous: postsTable.isAnonymous,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(postsTable.id, req.params.id))
      .limit(1);
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    const liked = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, req.params.id), eq(postLikesTable.userId, currentUser.userId))).limit(1);
    res.json({ ...post, authorName: post.isAnonymous ? null : post.authorName, authorAvatar: post.isAnonymous ? null : post.authorAvatar, isLiked: liked.length > 0, createdAt: post.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Get post error");
    res.status(500).json({ error: "Failed to get post" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [existing] = await db.select().from(postsTable).where(eq(postsTable.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Post not found" }); return; }
    if (existing.authorId !== currentUser.userId && !currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    const { content, imageUrl } = req.body;
    const updates: Partial<typeof postsTable.$inferInsert> = {};
    if (content !== undefined) updates.content = content;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    const [updated] = await db.update(postsTable).set(updates).where(eq(postsTable.id, req.params.id)).returning();
    res.json({ ...updated, authorName: null, authorAvatar: null, isLiked: false, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Update post error");
    res.status(500).json({ error: "Failed to update post" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [existing] = await db.select().from(postsTable).where(eq(postsTable.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Post not found" }); return; }
    if (existing.authorId !== currentUser.userId && !currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(postsTable).where(eq(postsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete post error");
    res.status(500).json({ error: "Failed to delete post" });
  }
});

router.post("/:id/like", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const existing = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, req.params.id), eq(postLikesTable.userId, currentUser.userId))).limit(1);
    let liked: boolean;
    if (existing.length > 0) {
      await db.delete(postLikesTable).where(and(eq(postLikesTable.postId, req.params.id), eq(postLikesTable.userId, currentUser.userId)));
      await db.update(postsTable).set({ likeCount: sql`${postsTable.likeCount} - 1` }).where(eq(postsTable.id, req.params.id));
      liked = false;
    } else {
      await db.insert(postLikesTable).values({ id: nanoid(), postId: req.params.id, userId: currentUser.userId });
      await db.update(postsTable).set({ likeCount: sql`${postsTable.likeCount} + 1` }).where(eq(postsTable.id, req.params.id));
      liked = true;
    }
    const [post] = await db.select({ likeCount: postsTable.likeCount }).from(postsTable).where(eq(postsTable.id, req.params.id)).limit(1);
    res.json({ liked, likeCount: post?.likeCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Toggle like error");
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

router.patch("/:id/pin", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    if (!currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    const { isPinned } = req.body;
    const [updated] = await db.update(postsTable).set({ isPinned }).where(eq(postsTable.id, req.params.id)).returning();
    res.json({ ...updated, authorName: null, authorAvatar: null, isLiked: false, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Pin post error");
    res.status(500).json({ error: "Failed to pin post" });
  }
});

router.get("/:postId/comments", requireAuth, async (req, res) => {
  try {
    const comments = await db
      .select({
        id: commentsTable.id,
        postId: commentsTable.postId,
        authorId: commentsTable.authorId,
        authorName: usersTable.name,
        authorAvatar: usersTable.avatarUrl,
        content: commentsTable.content,
        createdAt: commentsTable.createdAt,
      })
      .from(commentsTable)
      .leftJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
      .where(eq(commentsTable.postId, req.params.postId))
      .orderBy(commentsTable.createdAt);
    res.json(comments.map((c) => ({ ...c, authorName: c.authorName ?? null, authorAvatar: c.authorAvatar ?? null, createdAt: c.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "List comments error");
    res.status(500).json({ error: "Failed to load comments" });
  }
});

router.post("/:postId/comments", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { content } = req.body;
    if (!content) { res.status(400).json({ error: "Content required" }); return; }
    const id = nanoid();
    const [comment] = await db.insert(commentsTable).values({ id, postId: req.params.postId, authorId: currentUser.userId, content }).returning();
    await db.update(postsTable).set({ commentCount: sql`${postsTable.commentCount} + 1` }).where(eq(postsTable.id, req.params.postId));
    res.status(201).json({ ...comment, authorName: null, authorAvatar: null, createdAt: comment.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Create comment error");
    res.status(500).json({ error: "Failed to create comment" });
  }
});

router.delete("/comments/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Comment not found" }); return; }
    if (existing.authorId !== currentUser.userId && !currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(commentsTable).where(eq(commentsTable.id, req.params.id));
    await db.update(postsTable).set({ commentCount: sql`${postsTable.commentCount} - 1` }).where(eq(postsTable.id, existing.postId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete comment error");
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
