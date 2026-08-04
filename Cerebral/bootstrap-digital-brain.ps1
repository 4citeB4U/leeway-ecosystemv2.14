<#
LEEWAY HEADER BLOCK
Artifact: bootstrap-digital-brain.ps1
Purpose: Scaffold Next.js App Router "Digital Brain" starter with Vercel Postgres integration.
Standards: LEEWAY compliant; minimal, auditable setup script.
#>

[CmdletBinding()]
param(
  [string]$BasePath = "C:\Cerebral",
  [string]$ProjectName = "digital-brain"
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not installed or not available in PATH."
  }
}

Write-Host "[1/6] Checking required local tools..."
Require-Command -Name "node"
Require-Command -Name "npm"
Require-Command -Name "npx"

$projectPath = Join-Path $BasePath $ProjectName
New-Item -ItemType Directory -Path $BasePath -Force | Out-Null

if (-not (Test-Path $projectPath)) {
  Write-Host "[2/6] Creating Next.js app at $projectPath ..."
  Push-Location $BasePath
  npx create-next-app@latest $ProjectName --ts --app --eslint --src-dir --tailwind --use-npm --import-alias "@/*"
  Pop-Location
} else {
  Write-Host "[2/6] Project already exists at $projectPath. Skipping create-next-app."
}

Write-Host "[3/6] Installing Vercel Postgres SDK..."
Push-Location $projectPath
npm install @vercel/postgres

Write-Host "[4/6] Writing starter source files..."
New-Item -ItemType Directory -Path ".\src\lib" -Force | Out-Null
New-Item -ItemType Directory -Path ".\src\app\api\nodes" -Force | Out-Null

@'
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
'@ | Set-Content ".\src\lib\db.ts" -Encoding UTF8

@'
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
'@ | Set-Content ".\src\app\api\nodes\route.ts" -Encoding UTF8

@'
// LEEWAY HEADER BLOCK
// Artifact: src/app/page.tsx
// Purpose: Minimal Mind Map starter UI

"use client";

import { useEffect, useState } from "react";

type NodeItem = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  connections: string[];
};

export default function HomePage() {
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [connections, setConnections] = useState("");

  async function loadNodes() {
    const response = await fetch("/api/nodes");
    const data = await response.json();
    setNodes(data);
  }

  useEffect(() => {
    void loadNodes();
  }, []);

  async function createNode(event: React.FormEvent) {
    event.preventDefault();

    await fetch("/api/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        image_url: imageUrl || null,
        connections: connections
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }),
    });

    setTitle("");
    setContent("");
    setImageUrl("");
    setConnections("");
    await loadNodes();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Digital Brain Mind Map</h1>

      <form onSubmit={createNode} className="space-y-3 rounded-xl border p-4">
        <input
          className="w-full rounded border p-2"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <textarea
          className="w-full rounded border p-2"
          placeholder="Content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <input
          className="w-full rounded border p-2"
          placeholder="Image URL (optional)"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
        />
        <input
          className="w-full rounded border p-2"
          placeholder="Connections (comma-separated node IDs)"
          value={connections}
          onChange={(event) => setConnections(event.target.value)}
        />
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">
          Add Node
        </button>
      </form>

      <section className="space-y-3">
        {nodes.map((node) => (
          <article key={node.id} className="rounded-xl border p-4">
            <h2 className="font-semibold">{node.title}</h2>
            <p className="text-sm opacity-80">{node.content}</p>
            {node.image_url ? (
              <a className="text-sm text-blue-600" href={node.image_url} target="_blank" rel="noreferrer">
                Image
              </a>
            ) : null}
            <p className="mt-2 text-xs">Connections: {node.connections.join(", ") || "none"}</p>
            <p className="mt-1 text-xs opacity-60">ID: {node.id}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
'@ | Set-Content ".\src\app\page.tsx" -Encoding UTF8

Write-Host "[5/6] Verifying TypeScript build..."
npm run build

Write-Host "[6/6] Complete."
Write-Host ""
Write-Host "Next commands to run for GitHub + Vercel:"
Write-Host "Set-Location $projectPath"
Write-Host "gh auth login"
Write-Host "git add ."
Write-Host "git commit -m 'Initial Digital Brain starter (Next.js + Vercel Postgres)'"
Write-Host "gh repo create $ProjectName --public --source . --remote origin --push"
Write-Host "vercel login"
Write-Host "vercel link"
Write-Host "vercel postgres create ${ProjectName}-db"
Write-Host "vercel env pull .env.local"
Write-Host "vercel --prod"

Pop-Location
