#!/usr/bin/env bash
# Astra Team Hub — one-time project bootstrap helper
set -euo pipefail

echo "→ Checking Node..."
node -v || { echo "Node.js required"; exit 1; }

echo "→ Checking package manager..."
if command -v pnpm &>/dev/null; then
  PM=pnpm
elif command -v yarn &>/dev/null; then
  PM=yarn
else
  PM=npm
fi
echo "   Using $PM"

echo "→ Installing dependencies..."
$PM install

echo "→ Ensuring .env.local exists..."
if [[ ! -f .env.local ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env.local
    echo "   Created .env.local from .env.example — fill in real values"
  else
    echo "   WARNING: no .env.example found"
  fi
else
  echo "   .env.local already present"
fi

echo "→ Checking for Supabase CLI..."
if ! command -v supabase &>/dev/null; then
  echo "   Supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
else
  echo "   Supabase CLI present: $(supabase --version)"
fi

echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your Supabase / Resend / VAPID keys"
echo "  2. npx supabase link   (or start local: npx supabase start)"
echo "  3. npx supabase db push"
echo "  4. npm run db:types   (or ./scripts/generate-types.sh)"
echo "  5. npm run dev"
echo ""
echo "Setup helper finished."
