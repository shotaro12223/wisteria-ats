"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/app/AppSidebar";
import MobileTopBar from "@/components/MobileTopBar";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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

  // Admin Portal: with sidebar and topbar
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Top bar (show on all sizes) */}
      <MobileTopBar />

      {/* Main */}
      <main className="lg:pl-[280px]">
        <div className="min-h-screen">
          {/* Content wrapper - no max-w, full width for PC-first layout */}
          <div className="w-full px-4 pb-10 pt-4 sm:px-6 lg:px-8 2xl:px-12">
            {/* page content */}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
