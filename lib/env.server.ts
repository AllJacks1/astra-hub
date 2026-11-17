import "server-only";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

/** Server-only secrets. Read lazily so `next build` does not need them. */
export const serverEnv = {
  serviceRoleKey: () => need("SUPABASE_SERVICE_ROLE_KEY"),
  resendApiKey: () => need("RESEND_API_KEY"),
  resendFrom: () => need("RESEND_FROM_EMAIL"),
  vapidPrivateKey: () => need("VAPID_PRIVATE_KEY"),
  vapidSubject: () => need("VAPID_SUBJECT"),
  invitationTokenSecret: () => need("INVITATION_TOKEN_SECRET"),
};
