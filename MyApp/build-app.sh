#!/bin/bash
# A simple wrapper to execute the Expo export command reliably.

# --- Configuration ---
# Set the export command based on how you usually run it:
# If you use Yarn/npm scripts, you might just use 'npm run export'
EXPO_COMMAND="npx expo export"

# Set a helpful title
echo "--- Starting Expo Static Content Export ---"

# --- Execution ---
# Execute the Expo command, piping all output to stdout/stderr.
# The 'set -e' command ensures the script exits immediately if the Expo command fails.
set -e
$EXPO_COMMAND

# --- Completion ---
echo "--- Expo Static Content Export Complete ---"
exit 0
