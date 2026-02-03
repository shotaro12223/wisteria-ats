import "./globals.css";
import type { Metadata } from "next";
import ConditionalLayout from "@/components/ConditionalLayout";

export const metadata: Metadata = {
  title: "wisteria-ats",
  description: "ATS dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
