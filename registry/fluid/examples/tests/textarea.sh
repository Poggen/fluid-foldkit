#!/bin/sh
# Run only with the coordinated browser lane, against a rebuilt native example.
set -eu
session="${TEXTAREA_SESSION:-fluid-textarea}"
url="${1:?Pass the rebuilt native /textarea.html URL}"
script="$(dirname "$0")/textarea.browser.js"
trap 'agent-browser --session "$session" close >/dev/null 2>&1 || true' EXIT
agent-browser --session "$session" open "$url"
agent-browser --session "$session" set viewport 1280 900
agent-browser --session "$session" wait '#docs-feedback'
agent-browser --session "$session" click 'label[for="docs-feedback"]'
agent-browser --session "$session" eval 'if(document.activeElement?.id!=="docs-feedback")throw Error("Textarea label did not focus control")'
agent-browser --session "$session" fill '#docs-feedback' 'Trusted first line
Trusted second line'
agent-browser --session "$session" press Tab
agent-browser --session "$session" eval 'if(document.querySelector("#docs-feedback")?.value!=="Trusted first line\nTrusted second line")throw Error("Textarea did not retain trusted multiline input")'
# Diagnostics read only; all edits below use trusted browser input.
agent-browser --session "$session" fill '#docs-feedback' ''
agent-browser --session "$session" eval --stdin < "$script"
agent-browser --session "$session" fill '#docs-feedback' 'Line 1
Line 2
Line 3
Line 4
Line 5
Line 6'
agent-browser --session "$session" eval --stdin < "$script"
agent-browser --session "$session" fill '#docs-feedback' 'Line 1
Line 2
Line 3
Line 4
Line 5
Line 6
Line 7
Line 8
Line 9
Line 10
Line 11
Line 12
Line 13
Line 14
Line 15
Line 16
Line 17
Line 18
Line 19
Line 20'
agent-browser --session "$session" eval --stdin < "$script"
node "$(dirname "$0")/../../../../scripts/browser-errors.mjs" "$session"
console="$(agent-browser --session "$session" console)"
printf '%s\n' "$console"
if printf '%s' "$console" | grep -Eiq 'TypeError|Application crash|Uncaught|Cannot set property|read.only'; then
  exit 1
fi
