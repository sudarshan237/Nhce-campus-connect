import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const lostFoundTable = pgTable("lost_found", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  contact: text("contact"),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLostFoundSchema = createInsertSchema(lostFoundTable).omit({ isResolved: true, createdAt: true });
export type InsertLostFound = z.infer<typeof insertLostFoundSchema>;
export type LostFound = typeof lostFoundTable.$inferSelect;
