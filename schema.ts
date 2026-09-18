import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/**
 * Key-value document store for the CRM workspace.
 *
 * Each collection (days, notes, tools, sites, calcNotes) is stored as a single
 * JSON document under a stable `key`. This mirrors the previous localStorage
 * shape exactly, so the existing calculation logic is untouched, while making
 * every write an atomic upsert that is durable across browsers and devices.
 *
 * The app uses a single shared password gate (per product spec), so all data
 * lives under one workspace id.
 */
export const appState = pgTable("app_state", {
  workspace: text("workspace").notNull().default("default"),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
