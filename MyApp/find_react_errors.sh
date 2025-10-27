#!/bin/bash

# Define the directory to search (app directory)
SEARCH_DIR="${1:-app}"

# Define error patterns to search for
ERROR_PATTERNS=(
  "TypeError"
  "ReferenceError"
  "Cannot read property"
  "is not a function"
  "Failed to load resource"
)

# Output file for storing results
OUTPUT_FILE="react_errors.log"

# Clear previous output file if exists
> $OUTPUT_FILE

echo "Searching for React-related errors in $SEARCH_DIR..."

# Loop through error patterns and search them in the files
for PATTERN in "${ERROR_PATTERNS[@]}"; do
  echo "Searching for pattern: $PATTERN"
  grep -rn --include=\*.js --exclude-dir=node_modules --exclude-dir=.git "$PATTERN" "$SEARCH_DIR" >> $OUTPUT_FILE
done

echo "Search completed. Errors are logged in $OUTPUT_FILE"
