"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/",         label: "FEED",     icon: "◉" },
  { href: "/map",      label: "MAP",      icon: "⊕" },
  { href: "/sources",  label: "SOURCES",  icon: "◈" },
  { href: "/settings", label: "SETTINGS", icon: "⚙" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-vn-panel/95 backdrop-blur-md border-t border-vn-border">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-2 transition-all ${
                  isActive
                    ? "text-vn-cyan text-glow-cyan"
                    : "text-vn-text-dim hover:text-vn-text"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[9px] font-mono tracking-widest">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: Left sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 z-50 bg-vn-panel/95 backdrop-blur-md border-r border-vn-border flex-col items-center py-6 gap-2">
        <div
          className="font-display text-vn-cyan text-xs font-bold tracking-widest mb-8"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          VERITAS
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-3 rounded-sm transition-all w-full ${
                isActive
                  ? "text-vn-cyan bg-vn-cyan/10 border-r-2 border-vn-cyan"
                  : "text-vn-text-dim hover:text-vn-text hover:bg-white/5"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[8px] font-mono tracking-widest">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
