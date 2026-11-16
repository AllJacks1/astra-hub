import { signInWithGoogle } from "../actions";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, string> = {
  oauth: "Sign-in failed. Please try again.",
  not_invited: "This Google account hasn't been invited to Astra Team Hub.",
  email_mismatch: "You signed in with a different Google account than the one invited.",
  invitation_expired: "This invitation has expired. Ask an admin to send a new one.",
  invitation_not_found_or_used: "This invitation link is invalid or was already used.",
  suspended: "This account is suspended. Contact an admin.",
  email_not_verified: "Your Google email could not be verified.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? (MESSAGES[error] ?? "Sign-in failed. Contact an admin if this continues.") : null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Astra Team Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">Invite-only. Sign in with the Google account you were invited with.</p>
      </div>
      {message && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {message}
        </p>
      )}
      <form action={signInWithGoogle}>
        <Button type="submit" className="w-full">Continue with Google</Button>
      </form>
    </main>
  );
}
