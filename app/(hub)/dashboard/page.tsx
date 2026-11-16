import { requireProfile } from "@/lib/auth";

export default async function DashboardPage() {
  const profile = await requireProfile();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {profile.email} ({profile.role}). Channels and messages arrive in Phase 3.
      </p>
    </main>
  );
}
