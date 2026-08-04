// LEEWAY HEADER BLOCK
// Artifact: src/lib/db.ts
// Purpose: Postgres init and node type for Digital Brain

import { sql } from "@vercel/postgres";

export type BrainNode = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  connections: string[];
};

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      connections TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}
