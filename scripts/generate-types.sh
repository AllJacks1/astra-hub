#!/usr/bin/env bash
# Generate TypeScript types from Supabase schema
set -euo pipefail

OUT="src/types/database.types.ts"
mkdir -p "$(dirname "$OUT")"

if command -v supabase &>/dev/null; then
  echo "→ Generating types via Supabase CLI..."
  # Prefer linked remote project; fall back to local
  if supabase status &>/dev/null; then
    supabase gen types typescript --local > "$OUT"
  else
    supabase gen types typescript --linked > "$OUT" || \
    supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > "$OUT"
  fi
  echo "   Wrote $OUT"
else
  echo "Supabase CLI not found. Install it or run:"
  echo "  npx supabase gen types typescript --project-id <id> > $OUT"
  exit 1
fi
