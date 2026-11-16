#!/usr/bin/env bash
# Fail if required environment variables are missing (for CI / pre-deploy)
set -euo pipefail

REQUIRED=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  NEXT_PUBLIC_APP_URL
  RESEND_API_KEY
  RESEND_FROM_EMAIL
  INVITATION_TOKEN_SECRET
)

MISSING=0
for var in "${REQUIRED[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "MISSING: $var"
    MISSING=1
  else
    echo "OK:     $var"
  fi
done

# Optional but recommended for push
for var in NEXT_PUBLIC_VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY; do
  if [[ -z "${!var:-}" ]]; then
    echo "WARN:   $var (needed for Web Push)"
  else
    echo "OK:     $var"
  fi
done

if [[ $MISSING -eq 1 ]]; then
  echo ""
  echo "One or more required variables are unset. Aborting."
  exit 1
fi

echo ""
echo "All required environment variables are set."
