'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const LeewayIDE = dynamic(() => import('../../src/App').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-[#0d1117] flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-mono text-sm">Initializing Leeway IDE...</p>
      </div>
    </div>
  ),
});

export default function LeewayIDEPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-[#0d1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-mono text-sm">Loading Leeway IDE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0d1117]">
      <LeewayIDE />
    </div>
  );
}