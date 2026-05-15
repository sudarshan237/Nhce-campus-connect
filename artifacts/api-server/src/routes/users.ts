import { Router } from "express";
import { eq, ilike, and, or, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, usersTable } from "@workspace/db";
import { requireAuth, requireAdmin, getUser } from "../lib/auth";

const router = Router();

router.post("/me/sync", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { clerkId, name, email, avatarUrl } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, currentUser.userId)).limit(1);
    if (!user) {
      const id = nanoid();
      const [newUser] = await db.insert(usersTable).values({ id, clerkId: clerkId ?? null, name, email, avatarUrl: avatarUrl ?? null, isAdmin: false }).returning();
      const { passwordHash: _, ...safeUser } = newUser;
      res.json({ ...safeUser, clerkId: safeUser.clerkId ?? "" });
      return;
    }
    const [updated] = await db.update(usersTable).set({ name, avatarUrl: avatarUrl ?? null, clerkId: clerkId ?? null }).where(eq(usersTable.id, currentUser.userId)).returning();
    const { passwordHash: _, ...safeUser } = updated;
    res.json({ ...safeUser, clerkId: safeUser.clerkId ?? "" });
  } catch (err) {
    req.log.error({ err }, "Sync error");
    res.status(500).json({ error: "Sync failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, currentUser.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { passwordHash: _, ...safeUser } = user;
    res.json({ ...safeUser, clerkId: safeUser.clerkId ?? "" });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Failed to get profile. Please contact: patil.sudu237@gmail.com" });
  }
});

router.patch("/me", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { name, usn, branch, year, course, role } = req.body;
    const updates: Partial<typeof usersTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (usn !== undefined) updates.usn = usn;
    if (branch !== undefined) updates.branch = branch;
    if (year !== undefined) updates.year = Number(year);
    if (course !== undefined) updates.course = course;
    if (role !== undefined) updates.role = role;
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, currentUser.userId)).returning();
    const { passwordHash: _, ...safeUser } = updated;
    res.json({ ...safeUser, clerkId: safeUser.clerkId ?? "" });
  } catch (err) {
    req.log.error({ err }, "Update me error");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.get("/", requireAdmin, async (req, res) => {
  try {
    const { search, role, page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (search) conditions.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`)));
    if (role) conditions.push(eq(usersTable.role, role));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const users = await db.select({ id: usersTable.id, clerkId: usersTable.clerkId, name: usersTable.name, email: usersTable.email, role: usersTable.role, usn: usersTable.usn, branch: usersTable.branch, year: usersTable.year, course: usersTable.course, avatarUrl: usersTable.avatarUrl, isAdmin: usersTable.isAdmin, createdAt: usersTable.createdAt }).from(usersTable).where(where).offset(offset).limit(Number(limit));
    const [{ total }] = await db.select({ total: count() }).from(usersTable).where(where);
    res.json({ users: users.map(u => ({ ...u, clerkId: u.clerkId ?? "" })), total });
  } catch (err) {
    req.log.error({ err }, "List users error");
    res.status(500).json({ error: "Failed to list users" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select({ id: usersTable.id, clerkId: usersTable.clerkId, name: usersTable.name, email: usersTable.email, role: usersTable.role, usn: usersTable.usn, branch: usersTable.branch, year: usersTable.year, course: usersTable.course, avatarUrl: usersTable.avatarUrl, isAdmin: usersTable.isAdmin, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, req.params.id)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ ...user, clerkId: user.clerkId ?? "" });
  } catch (err) {
    req.log.error({ err }, "Get user error");
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { name, role, usn, branch, year, course, isAdmin } = req.body;
    const updates: Partial<typeof usersTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (usn !== undefined) updates.usn = usn;
    if (branch !== undefined) updates.branch = branch;
    if (year !== undefined) updates.year = Number(year);
    if (course !== undefined) updates.course = course;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.params.id)).returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    const { passwordHash: _, ...safeUser } = updated;
    res.json({ ...safeUser, clerkId: safeUser.clerkId ?? "" });
  } catch (err) {
    req.log.error({ err }, "Update user error");
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete user error");
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
