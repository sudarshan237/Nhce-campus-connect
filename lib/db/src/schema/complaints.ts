import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const complaintsTable = pgTable("complaints", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("Medium"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const complaintUpdatesTable = pgTable("complaint_updates", {
  id: text("id").primaryKey(),
  complaintId: text("complaint_id").notNull().references(() => complaintsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({ status: true, createdAt: true, updatedAt: true });
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;
