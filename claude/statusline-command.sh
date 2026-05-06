#!/usr/bin/env bash
# Claude Code status line: context usage (no jq dependency)
input=$(cat)

# Extract used_percentage using grep/sed since jq is not available
used_pct=$(echo "$input" | grep -o '"used_percentage":[0-9]*' | grep -o '[0-9]*$')

if [ -n "$used_pct" ] && [ "$used_pct" -gt 0 ] 2>/dev/null; then
    printf "ctx: %s%%\n" "$used_pct"
else
    printf "ctx: --\n"
fi
