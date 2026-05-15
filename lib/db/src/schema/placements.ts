import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const placementsTable = pgTable("placements", {
  id: text("id").primaryKey(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  description: text("description").notNull(),
  eligibility: text("eligibility").notNull(),
  packageLpa: real("package_lpa"),
  applyBy: timestamp("apply_by", { withTimezone: true }).notNull(),
  applyLink: text("apply_link"),
  applicantCount: integer("applicant_count").notNull().default(0),
  createdBy: text("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const placementApplicationsTable = pgTable("placement_applications", {
  id: text("id").primaryKey(),
  placementId: text("placement_id").notNull().references(() => placementsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const placementSavesTable = pgTable("placement_saves", {
  id: text("id").primaryKey(),
  placementId: text("placement_id").notNull().references(() => placementsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlacementSchema = createInsertSchema(placementsTable).omit({ applicantCount: true, createdAt: true, updatedAt: true });
export type InsertPlacement = z.infer<typeof insertPlacementSchema>;
export type Placement = typeof placementsTable.$inferSelect;
