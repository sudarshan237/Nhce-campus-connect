import { Router } from "express";
import { eq, desc, ilike, and, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, placementsTable, placementApplicationsTable, placementSavesTable, notificationsTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const { search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);
    const where = search ? ilike(placementsTable.company, `%${search}%`) : undefined;

    const placements = await db.select().from(placementsTable).where(where).orderBy(desc(placementsTable.createdAt)).offset(offset).limit(Number(limit));

    const apps = await db.select({ placementId: placementApplicationsTable.placementId }).from(placementApplicationsTable).where(eq(placementApplicationsTable.userId, currentUser.userId));
    const saves = await db.select({ placementId: placementSavesTable.placementId }).from(placementSavesTable).where(eq(placementSavesTable.userId, currentUser.userId));
    const appSet = new Set(apps.map((a) => a.placementId));
    const saveSet = new Set(saves.map((s) => s.placementId));

    const [{ total }] = await db.select({ total: count() }).from(placementsTable).where(where);
    res.json({
      placements: placements.map((p) => ({ ...p, packageLpa: p.packageLpa ?? null, applyLink: p.applyLink ?? null, isApplied: appSet.has(p.id), isSaved: saveSet.has(p.id), applyBy: p.applyBy.toISOString(), createdAt: p.createdAt.toISOString() })),
      total,
    });
  } catch (err) {
    req.log.error({ err }, "List placements error");
    res.status(500).json({ error: "Failed to load placements. Please contact: patil.sudu237@gmail.com" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    if (!currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    const { company, role, description, eligibility, packageLpa, applyBy, applyLink } = req.body;
    if (!company || !role || !description || !eligibility || !applyBy) { res.status(400).json({ error: "Required fields missing" }); return; }
    const id = nanoid();
    const [placement] = await db.insert(placementsTable).values({
      id,
      company,
      role,
      description,
      eligibility,
      packageLpa: packageLpa ?? null,
      applyBy: new Date(applyBy),
      applyLink: applyLink ?? null,
      createdBy: currentUser.userId,
    }).returning();
    res.status(201).json({ ...placement, packageLpa: placement.packageLpa ?? null, applyLink: placement.applyLink ?? null, isApplied: false, isSaved: false, applyBy: placement.applyBy.toISOString(), createdAt: placement.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Create placement error");
    res.status(500).json({ error: "Failed to create placement" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const [placement] = await db.select().from(placementsTable).where(eq(placementsTable.id, req.params.id)).limit(1);
    if (!placement) { res.status(404).json({ error: "Not found" }); return; }
    const app = await db.select().from(placementApplicationsTable).where(and(eq(placementApplicationsTable.placementId, req.params.id), eq(placementApplicationsTable.userId, currentUser.userId))).limit(1);
    const save = await db.select().from(placementSavesTable).where(and(eq(placementSavesTable.placementId, req.params.id), eq(placementSavesTable.userId, currentUser.userId))).limit(1);
    res.json({ ...placement, packageLpa: placement.packageLpa ?? null, applyLink: placement.applyLink ?? null, isApplied: app.length > 0, isSaved: save.length > 0, applyBy: placement.applyBy.toISOString(), createdAt: placement.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Get placement error");
    res.status(500).json({ error: "Failed to load placement" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    if (!currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    const { company, role, description, eligibility, packageLpa, applyBy, applyLink } = req.body;
    const updates: Partial<typeof placementsTable.$inferInsert> = {};
    if (company !== undefined) updates.company = company;
    if (role !== undefined) updates.role = role;
    if (description !== undefined) updates.description = description;
    if (eligibility !== undefined) updates.eligibility = eligibility;
    if (packageLpa !== undefined) updates.packageLpa = packageLpa;
    if (applyBy !== undefined) updates.applyBy = new Date(applyBy);
    if (applyLink !== undefined) updates.applyLink = applyLink;
    const [updated] = await db.update(placementsTable).set(updates).where(eq(placementsTable.id, req.params.id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...updated, packageLpa: updated.packageLpa ?? null, applyLink: updated.applyLink ?? null, isApplied: false, isSaved: false, applyBy: updated.applyBy.toISOString(), createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Update placement error");
    res.status(500).json({ error: "Failed to update placement" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    if (!currentUser.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(placementsTable).where(eq(placementsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete placement error");
    res.status(500).json({ error: "Failed to delete placement" });
  }
});

router.post("/:id/apply", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const existing = await db.select().from(placementApplicationsTable).where(and(eq(placementApplicationsTable.placementId, req.params.id), eq(placementApplicationsTable.userId, currentUser.userId))).limit(1);
    let applied: boolean;
    if (existing.length > 0) {
      await db.delete(placementApplicationsTable).where(and(eq(placementApplicationsTable.placementId, req.params.id), eq(placementApplicationsTable.userId, currentUser.userId)));
      await db.update(placementsTable).set({ applicantCount: sql`${placementsTable.applicantCount} - 1` }).where(eq(placementsTable.id, req.params.id));
      applied = false;
    } else {
      await db.insert(placementApplicationsTable).values({ id: nanoid(), placementId: req.params.id, userId: currentUser.userId });
      await db.update(placementsTable).set({ applicantCount: sql`${placementsTable.applicantCount} + 1` }).where(eq(placementsTable.id, req.params.id));
      applied = true;
      const [pl] = await db.select({ company: placementsTable.company }).from(placementsTable).where(eq(placementsTable.id, req.params.id)).limit(1);
      if (pl) await db.insert(notificationsTable).values({ id: nanoid(), userId: currentUser.userId, title: "Application Submitted", message: `You applied to ${pl.company}`, link: `/placement` });
    }
    const [pl] = await db.select({ applicantCount: placementsTable.applicantCount }).from(placementsTable).where(eq(placementsTable.id, req.params.id)).limit(1);
    res.json({ applied, applicantCount: pl?.applicantCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Apply placement error");
    res.status(500).json({ error: "Failed to apply" });
  }
});

router.post("/:id/save", requireAuth, async (req, res) => {
  try {
    const currentUser = getUser(req)!;
    const existing = await db.select().from(placementSavesTable).where(and(eq(placementSavesTable.placementId, req.params.id), eq(placementSavesTable.userId, currentUser.userId))).limit(1);
    if (existing.length > 0) {
      await db.delete(placementSavesTable).where(and(eq(placementSavesTable.placementId, req.params.id), eq(placementSavesTable.userId, currentUser.userId)));
      res.json({ saved: false });
    } else {
      await db.insert(placementSavesTable).values({ id: nanoid(), placementId: req.params.id, userId: currentUser.userId });
      res.json({ saved: true });
    }
  } catch (err) {
    req.log.error({ err }, "Save placement error");
    res.status(500).json({ error: "Failed to save placement" });
  }
});

export default router;
