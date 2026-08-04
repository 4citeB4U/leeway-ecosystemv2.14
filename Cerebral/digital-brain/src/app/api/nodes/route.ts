// LEEWAY HEADER BLOCK
// Artifact: src/app/api/nodes/route.ts
// Purpose: CRUD starter endpoints for nodes

import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  await initDb();
  const { rows } = await sql`
    SELECT id, title, content, image_url, connections
    FROM nodes
    ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  await initDb();
  const body = await req.json();

  const title = String(body?.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const id = String(body?.id ?? randomUUID());
  const content = String(body?.content ?? "");
  const image_url = body?.image_url ? String(body.image_url) : null;
  const connections = Array.isArray(body?.connections)
    ? body.connections.map((value: unknown) => String(value))
    : [];

  await sql`
    INSERT INTO nodes (id, title, content, image_url, connections)
    VALUES (${id}, ${title}, ${content}, ${image_url}, ${connections})
  `;

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
