import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
    // Define columns
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  todo: text().notNull(),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
});
