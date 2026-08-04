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
