/*
LEEWAY HEADER - DO NOT REMOVE

REGION: DATA
TAG: DATA.EXECUTION_BRAIN.DATABASE_TRANSACTION.PLANNER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import type { PlannedDatabaseTransaction } from "./executionBrain.types";

export function planDatabaseTransactions(prompt: string): PlannedDatabaseTransaction[] {
  if (!/\b(database|schema|migration|table|postgres|supabase|sqlite|neon)\b/i.test(prompt)) return [];

  return [{
    id: `db-${Date.now()}`,
    title: "Planned schema-safe database review",
    databaseType: /\bsqlite\b/i.test(prompt)
      ? "sqlite"
      : /\bsupabase\b/i.test(prompt)
        ? "supabase"
        : /\bneon\b/i.test(prompt)
          ? "neon"
          : "postgres",
    operation: /\bmigration|schema|table\b/i.test(prompt) ? "migration" : "update",
    previewSql: "-- Pending SQL preview required before apply\n-- Agent Lee must generate rollback SQL before approval",
    rollbackPlan: "Create a paired rollback statement or backup snapshot before any database apply step.",
    risk: "critical",
    requiresApproval: true
  }];
}
