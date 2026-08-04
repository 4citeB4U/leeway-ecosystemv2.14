import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leeway Agentic Content Foundry',
  description: 'Leeway Agentic Content Foundry powered by Next.js and React',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
