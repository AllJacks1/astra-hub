import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const userId = process.env.USER_ID!;
const email = process.env.USER_EMAIL!; // must match auth.users email

if (!url || !serviceKey || !userId || !email) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, USER_ID, USER_EMAIL",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await admin.from("astra_hub_profiles").upsert(
    {
      id: userId,
      email: email.trim().toLowerCase(),
      role: "admin",
      status: "active",
      full_name: "Astra Admin",
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("Admin profile ready for", email);
}

main();
