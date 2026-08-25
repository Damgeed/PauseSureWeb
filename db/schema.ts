import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Aggregate-only, content-free product events. No account, session, device,
// network, contact, evidence, URL, phone number, or free-form text is stored.
export const privacyEventDaily = sqliteTable("privacy_event_daily", {
  day: text("day").notNull(),
  eventName: text("event_name").notNull(),
  inputKind: text("input_kind").notNull().default("none"),
  risk: text("risk").notNull().default("none"),
  action: text("action").notNull().default("none"),
  channel: text("channel").notNull(),
  eventCount: integer("event_count").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.day, table.eventName, table.inputKind, table.risk, table.action, table.channel] }),
]);
