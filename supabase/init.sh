#!/usr/bin/env bash
# ------------------------------------------------------------
# Supabase project initialization script
# ------------------------------------------------------------
# This script resets the local Supabase DB and pushes the schema
# defined in supabase/migrations.sql. Adjust the commands if you use a
# remote project or CI environment.
# ------------------------------------------------------------
set -e

# Ensure supabase CLI is installed
if ! command -v supabase &>/dev/null; then
  echo "Supabase CLI not found – installing globally…"
  npm i -g supabase
fi

# Reset the database (drops all tables) – use with caution!
# supabase db reset && supabase db push
# For safety in a production project you would run only "supabase db push"

# Push migrations – creates tables if they do not exist
supabase db push

echo "✅ Supabase schema deployed successfully."
