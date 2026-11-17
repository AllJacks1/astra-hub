import { requireProfile } from "@/lib/auth";
import { getSidebarData } from "@/lib/messaging/queries";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const side = await getSidebarData(profile.id);
  return (
    <main>
      <div className="px-4 pt-8 md:mx-auto md:max-w-3xl md:py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="md:hidden">Pick a conversation below.</span>
          <span className="hidden md:inline">Pick a channel or conversation from the sidebar.</span>
        </p>
      </div>
      <div className="md:hidden">
        <Sidebar data={side} role={profile.role} />
      </div>
    </main>
  );
}
