import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  riskLevel: text("risk_level").notNull(),
  analysis: text("analysis").notNull(),
  nearBlockHeight: integer("near_block_height").notNull().default(0),
  xrplLedgerIndex: integer("xrpl_ledger_index").notNull().default(0),
  xrplTxHash: text("xrpl_tx_hash"),
  telegramSent: boolean("telegram_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
