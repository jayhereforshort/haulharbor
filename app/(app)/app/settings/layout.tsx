import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { SettingsNav } from "./settings-nav";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);
  if (!account) redirect("/app");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display">Settings</h1>
        <p className="text-caption mt-1">Manage your account and billing.</p>
      </div>

      <SettingsNav />

      {children}
    </div>
  );
}
