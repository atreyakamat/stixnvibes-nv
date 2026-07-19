#!/usr/bin/env bash
# ------------------------------------------------------------
# Project bootstrap script for Stix N Vibes
# ------------------------------------------------------------
# This script installs all npm dependencies, adds the core
# shadcn/ui components used in the scaffold, and prints a
# short reminder to create a .env.local file.
# ------------------------------------------------------------
set -e

# 1️⃣ Install npm dependencies
 echo "Installing npm dependencies…"
 npm ci

# 2️⃣ Add shadcn/ui components used by the scaffold
#    (button, tooltip, toast, dialog) – you can add more later.
 echo "Adding shadcn/ui components…"
 npx shadcn-ui@latest add button tooltip toast dialog

# 3️⃣ Create a placeholder .env.local if missing
 if [ ! -f .env.local ]; then
   echo "Creating .env.example (copy to .env.local and fill values)…"
   cp .env.example .env.local || true
 fi

# 4️⃣ Done
 echo "✅ Scaffold setup complete."
