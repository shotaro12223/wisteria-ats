import "./globals.css";
import type { Metadata } from "next";
import AppSidebar from "./AppSidebar";
import MobileTopBar from "./MobileTopBar";

export const metadata: Metadata = {
  title: "wisteria-ats",
  description: "ATS dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        {/* App shell */}
        <div className="min-h-screen">
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Mobile top bar */}
          <div className="lg:hidden">
            <MobileTopBar />
          </div>

          {/* Main */}
          <main className="lg:pl-[280px]">
            <div className="min-h-screen">
              {/* top spacer for mobile */}
              <div className="lg:hidden h-2" />

              {/* Content wrapper */}
              <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-4 sm:px-6 lg:px-10 lg:pt-8">
                {/* subtle header strip */}
                <div
                  className="mb-5 rounded-2xl border bg-white/70 p-4 backdrop-blur"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="text-sm font-semibold text-slate-900">Wisteria ATS</div>
                  <div className="mt-1 text-xs text-slate-500">
                    会社→求人→出力→応募データ→分析 までを最短で回す
                  </div>
                </div>

                {/* page content */}
                {children}
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
