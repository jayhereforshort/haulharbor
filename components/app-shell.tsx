"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Settings,
  Package,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const SIDEBAR_COLLAPSED_KEY = "haulharbor-sidebar-collapsed";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/inventory", label: "Inventory", icon: Package },
  { href: "/app/sold", label: "Sold", icon: ShoppingBag },
  { href: "/app/settings/account", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) setSidebarCollapsed(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden touch-target"
          aria-label="Toggle menu"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <Link href="/app" className="text-lg font-semibold tracking-tight">
          HaulHarbor
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-caption hidden max-w-[180px] truncate sm:block">
            {userEmail}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="touch-target"
            aria-label="Sign out"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - desktop: collapsible; mobile: overlay */}
        <aside
          className={cn(
            "flex-col border-r border-border bg-card/50 transition-[width] duration-200 ease-in-out",
            "hidden sm:flex",
            sidebarCollapsed ? "w-[4.5rem]" : "w-56",
            sidebarOpen && "!flex fixed inset-y-0 left-0 z-30 flex-col pt-14 sm:relative sm:pt-0 sm:w-56"
          )}
        >
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {/* Collapse toggle - desktop only */}
            <div className="mb-2 hidden justify-end sm:flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={toggleSidebarCollapsed}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
            {navItems.map((item) => {
              const isActive =
                item.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-target min-h-[44px] sm:min-h-0",
                    sidebarCollapsed && "justify-center px-0",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {(!sidebarCollapsed || sidebarOpen) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/50 sm:hidden"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
