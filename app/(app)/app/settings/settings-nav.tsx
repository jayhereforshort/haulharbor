"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/app/settings/account", label: "Account" },
  { href: "/app/settings/finance", label: "Finance" },
  { href: "/app/settings/billing", label: "Billing" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 border-b border-border">
      {nav.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
