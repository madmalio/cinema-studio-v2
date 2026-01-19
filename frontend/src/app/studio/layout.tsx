"use client";

import { Home, Film, Users, Clapperboard } from "lucide-react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { SettingsModal } from "@/components/studio/settings-modal";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();

  // 1. Get the Project ID from the URL (e.g. "1" from /studio/1/characters)
  const id = params.id as string;

  // 2. Build Dynamic Links using the ID
  // If we don't have an ID yet (rare in this layout), we default to basic paths or empty
  const navItems = id
    ? [
        { icon: Home, label: "Overview", href: `/studio/${id}` },
        { icon: Users, label: "Characters", href: `/studio/${id}/characters` },
        { icon: Clapperboard, label: "Scenes", href: `/studio/${id}/scenes` }, // This will work once you create the scenes page
      ]
    : [];

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans selection:bg-[#D2FF44]/30 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-16 border-r border-zinc-800 flex flex-col items-center py-6 gap-6 z-50 bg-zinc-950 flex-shrink-0">
        {/* Logo - Clicks back to Project List */}
        <Link href="/" title="Back to Projects">
          <div className="w-8 h-8 rounded bg-[#D2FF44] flex items-center justify-center text-black font-black text-xs hover:scale-110 transition-transform cursor-pointer shadow-[0_0_10px_rgba(210,255,68,0.2)]">
            M
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="flex flex-col gap-4 w-full items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`p-2 rounded-lg transition-all ${
                  isActive
                    ? "bg-zinc-800 text-white shadow-inner"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-900"
                }`}
                title={item.label}
              >
                <item.icon size={20} />
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM ACTIONS */}
        <div className="mt-auto flex flex-col gap-4 items-center">
          <SettingsModal />
          <div
            className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700"
            title="User Profile"
          />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
