'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';
import { d3Force3d } from 'd3-force-3d';

const KnowledgeGraph3D = dynamic(
  () => import('../components/KnowledgeGraph3D').then((mod) => mod.KnowledgeGraph3D),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full w-full bg-slate-950">Loading 3D Knowledge Brain...</div> }
);

export default function KnowledgeGraphPage() {
  return (
    <div className="h-screen w-screen bg-slate-950">
      <KnowledgeGraph3D />
    </div>
  );
}