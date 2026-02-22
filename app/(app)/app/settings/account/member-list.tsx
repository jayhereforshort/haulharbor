import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export async function MemberList({
  accountId,
  currentUserRole,
  currentUserId,
}: {
  accountId: string;
  currentUserRole: string;
  currentUserId?: string;
}) {
  const supabase = await createClient();
  const { data: members } = await supabase.rpc("get_account_members", {
    p_account_id: accountId,
  });
  const sorted =
    (members as { id: string; user_id: string; role: string; created_at: string }[] | null)?.slice().sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ) ?? [];

  if (!sorted.length) {
    return <p className="text-sm text-muted-foreground">No members.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {sorted.map((m) => (
        <li key={m.id} className="flex items-center justify-between py-3 first:pt-0">
          <span className="text-sm font-medium text-muted-foreground">
            {currentUserId && m.user_id === currentUserId
              ? "You"
              : `${m.user_id.slice(0, 8)}…`}
          </span>
          <Badge variant={m.role === "owner" ? "default" : "secondary"}>
            {m.role}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
