import { signInWithGoogle } from "../actions";
import { Button } from "@/components/ui/button";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-3 px-6 py-16">
        <h1 className="text-xl font-semibold">Invitation link incomplete</h1>
        <p className="text-sm text-muted-foreground">Open the link from your invitation email again.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">You&rsquo;re invited to Astra Team Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with the Google account this invitation was sent to. A different account will be rejected.
        </p>
      </div>
      <form action={signInWithGoogle}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" className="w-full">Accept with Google</Button>
      </form>
    </main>
  );
}
