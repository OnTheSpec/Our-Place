import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const households = sqliteTable("households", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const people = sqliteTable("people", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => households.id),
  email: text("email"),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["older_adult", "family"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const checkIns = sqliteTable("check_ins", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => households.id),
  personId: text("person_id").notNull().references(() => people.id),
  transcript: text("transcript"),
  summary: text("summary").notNull(),
  tone: text("tone"),
  safetyLevel: text("safety_level", { enum: ["routine", "concern", "urgent"] }).notNull().default("routine"),
  consentedAt: integer("consented_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const extractedItems = sqliteTable("extracted_items", {
  id: text("id").primaryKey(),
  checkInId: text("check_in_id").notNull().references(() => checkIns.id),
  kind: text("kind", { enum: ["life_update", "memory", "request", "possible_concern"] }).notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  sourceQuote: text("source_quote"),
  status: text("status", { enum: ["open", "done", "archived"] }).notNull().default("open"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
