'use client';

import dynamic from 'next/dynamic';

const MasterPublisherUI = dynamic(() => import('../components/MasterPublisherUI'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-mono text-sm">Connecting to Master Publisher...</p>
      </div>
    </div>
  ),
});

export default function MasterPublisherPage() {
  return <MasterPublisherUI />;
}
