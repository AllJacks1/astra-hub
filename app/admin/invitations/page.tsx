import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { createInvitationAction, revokeInvitationAction } from "./actions";
import { Button } from "@/components/ui/button";

const ERRORS: Record<string, string> = {
  invalid_input: "Enter a valid email and role.",
  invalid_email: "That email address looks invalid.",
  email_domain_not_allowed: "Only @astragroupph.com and Gmail addresses can be invited.",
  user_already_exists: "That person already has an account.",
  email_send_failed: "Invitation saved but the email failed to send. Re-invite to try again.",
  not_admin: "Admin access required.",
};

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; revoked?: string }>;
}) {
  await requireRole("admin");
  const { error, sent, revoked } = await searchParams;

  const supabase = await createClient();
  const { data: invitations } = await supabase
    .from("astra_hub_invitations")
    .select("id, email, role, status, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <section>
        <h1 className="text-xl font-semibold tracking-tight">Invite someone</h1>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{ERRORS[error] ?? "Something went wrong."}</p>}
        {sent && <p className="mt-3 text-sm">Invitation sent.</p>}
        {revoked && <p className="mt-3 text-sm">Invitation revoked.</p>}
        <form action={createInvitationAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input name="email" type="email" required className="h-9 w-64 rounded-md border bg-background px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Role
            <select name="role" defaultValue="member" className="h-9 rounded-md border bg-background px-2">
              <option value="member">Member</option>
              <option value="guest">Guest</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <Button type="submit">Send invitation</Button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Invitations</h2>
        <ul className="mt-3 divide-y rounded-md border text-sm">
          {(invitations ?? []).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div>
                <div className="font-medium">{i.email}</div>
                <div className="text-muted-foreground">
                  {i.role} · {i.status}
                  {i.status === "pending" && ` · expires ${new Date(i.expires_at).toLocaleDateString("en-PH")}`}
                </div>
              </div>
              {i.status === "pending" && (
                <form action={revokeInvitationAction}>
                  <input type="hidden" name="id" value={i.id} />
                  <Button type="submit" variant="outline" size="sm">Revoke</Button>
                </form>
              )}
            </li>
          ))}
          {!invitations?.length && <li className="px-3 py-4 text-muted-foreground">No invitations yet.</li>}
        </ul>
      </section>
    </main>
  );
}
