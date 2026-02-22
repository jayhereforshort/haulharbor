import Link from "next/link";
import {
  BarChart3,
  Package,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: BarChart3,
    title: "Accounting-first",
    description: "Revenue, profit, and margin at a glance. Built for resellers who care about the numbers.",
  },
  {
    icon: Package,
    title: "Inventory & sales",
    description: "Track stock and connect sales sources so your ledger stays in sync.",
  },
  {
    icon: Shield,
    title: "Secure & reliable",
    description: "Your data is protected. We use industry-standard auth and encryption.",
  },
  {
    icon: Zap,
    title: "Fast dashboard",
    description: "Lightweight, responsive UI so you can check metrics from any device.",
  },
];

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-xl font-semibold tracking-tight">HaulHarbor</span>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-border bg-muted/30 py-16 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h1 className="text-display mb-4 text-foreground">
              Resale accounting, simplified
            </h1>
            <p className="text-body mx-auto max-w-2xl text-muted-foreground">
              Track revenue, profit, and inventory in one place. Connect sales sources or record offline sales—your dashboard stays accurate.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/signup">Get started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-heading mb-2 text-center">Built for resellers</h2>
            <p className="text-caption mx-auto max-w-xl text-center">
              Everything you need to run the numbers without the spreadsheet chaos.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <Card key={f.title} className="border-border shadow-card">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{f.title}</CardTitle>
                    <CardDescription>{f.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30 py-16 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-heading mb-2">Ready to get started?</h2>
            <p className="text-caption mb-8">
              Create an account and connect your first sales source—or start with manual entries.
            </p>
            <Button size="lg" asChild>
              <Link href="/signup">Sign up free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-caption text-center">
            © {new Date().getFullYear()} HaulHarbor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
