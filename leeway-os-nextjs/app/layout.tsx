import type { Metadata } from "next";
import "./globals.css";
import OsShell from "@/components/os-shell";

export const metadata: Metadata = {
  title: "LeeWay OS",
  description: "LeeWay Operating System - Runtime Fabric Integrated"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <OsShell />
        <main className="leeway-os-surface">{children}</main>
      </body>
    </html>
  );
}
