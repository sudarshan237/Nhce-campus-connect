import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken, requireAuth, getUser } from "../lib/auth";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, usn, branch, year, course, role } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = nanoid();
    const [user] = await db.insert(usersTable).values({
      id,
      clerkId: null,
      name,
      email,
      passwordHash,
      role: role ?? "Student",
      usn: usn ?? null,
      branch: branch ?? null,
      year: year ? Number(year) : null,
      course: course ?? null,
      avatarUrl: null,
      isAdmin: false,
    }).returning();
    const token = signToken({ userId: user.id, email: user.email, isAdmin: user.isAdmin });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: { ...safeUser, clerkId: safeUser.clerkId ?? "" }, token });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Registration failed. Please contact: patil.sudu237@gmail.com" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    if (!user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = signToken({ userId: user.id, email: user.email, isAdmin: user.isAdmin });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: { ...safeUser, clerkId: safeUser.clerkId ?? "" }, token });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Login failed. Please contact: patil.sudu237@gmail.com" });
  }
});

router.get("/session", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, currentUser.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: { ...safeUser, clerkId: safeUser.clerkId ?? "" } });
  } catch (err) {
    req.log.error({ err }, "Session error");
    res.status(500).json({ error: "Session check failed" });
  }
});

export default router;
