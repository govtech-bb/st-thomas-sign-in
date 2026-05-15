"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Sign in" },
  { href: "/display", label: "Display" },
  { href: "/staff", label: "Staff" },
  { href: "/admin/qr", label: "QR code" },
];

export function DemoNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Demo
        </span>
        <div className="flex gap-1">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
