"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import ModernDock from "@/components/ModernDock";
import ModernTopBar from "@/components/ModernTopBar";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [dockExpanded, setDockExpanded] = useState(false);

  // Login pages, auth callback, and password setup should not have any layout
  const noLayoutPaths = ["/login", "/client/login", "/auth/callback", "/set-password"];
  if (noLayoutPaths.includes(pathname)) {
    return <>{children}</>;
  }

  // Check if this is a client portal route
  const isClientPortal = pathname.startsWith("/client");

  if (isClientPortal) {
    // Client Portal: no admin UI, just render children
    return <>{children}</>;
  }

  // Admin Portal: Modern layout with Dock
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/20 via-transparent to-transparent dark:from-indigo-900/10 pointer-events-none" />

      {/* Top bar */}
      <ModernTopBar dockExpanded={dockExpanded} />

      {/* Dock (left side) */}
      <ModernDock expanded={dockExpanded} onExpandedChange={setDockExpanded} />

      {/* Main content */}
      <main className={[
        "relative pt-16 pr-6 pb-8 min-h-screen transition-all duration-200 ease-out",
        dockExpanded ? "pl-56" : "pl-16",
      ].join(" ")}>
        {children}
      </main>
    </div>
  );
}
