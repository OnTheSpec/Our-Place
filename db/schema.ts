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
  dailyCheckInTime: text("daily_check_in_time"),
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
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const familyReplies = sqliteTable("family_replies", {
  id: text("id").primaryKey(),
  checkInId: text("check_in_id").notNull().references(() => checkIns.id),
  authorId: text("author_id").notNull().references(() => people.id),
  kind: text("kind", { enum: ["reaction", "text", "voice"] }).notNull(),
  message: text("message").notNull(),
  audioObjectKey: text("audio_object_key"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const commitments = sqliteTable("commitments", {
  id: text("id").primaryKey(),
  extractedItemId: text("extracted_item_id").notNull().references(() => extractedItems.id),
  ownerId: text("owner_id").notNull().references(() => people.id),
  promisedFor: integer("promised_for", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
