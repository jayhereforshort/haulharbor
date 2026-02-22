import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "./account-form";
import { MemberList } from "./member-list";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { account, membership, user } = await getCurrentAccountForUser(supabase);
  if (!account || !membership) redirect("/app");

  const canEdit = ["owner", "admin"].includes(membership.role);

  return (
    <div className="space-y-8">
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account name and details.</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountForm
            accountId={account.id}
            initialName={account.name}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People with access to this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <MemberList accountId={account.id} currentUserRole={membership.role} currentUserId={user?.id} />
        </CardContent>
      </Card>
    </div>
  );
}
