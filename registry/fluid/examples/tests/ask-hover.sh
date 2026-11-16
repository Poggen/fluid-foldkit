#!/bin/sh
set -eu
session="${ASK_SESSION:-fluid-ask-hover}"
url="${ASK_URL:-http://127.0.0.1:4525/ask-user-questions.html}"
trap 'agent-browser --session "$session" close >/dev/null 2>&1 || true' EXIT
agent-browser --session "$session" open "$url"
agent-browser --session "$session" set viewport 1280 1000
agent-browser --session "$session" wait '[data-ask-rows]'
agent-browser --session "$session" mouse move 1100 900
for index in 0 1; do
  agent-browser --session "$session" hover "[data-ask-rows] [data-fluid-hover-index=\"$index\"]"
  agent-browser --session "$session" wait --fn "(() => {const root=document.querySelector('[data-ask-rows]');const row=root.querySelector('[data-fluid-hover-index=\"$index\"]');const r=row.getBoundingClientRect();return [...root.querySelectorAll('[data-slot=fluid-hover-highlight]')].some(e=>{const h=e.getBoundingClientRect();return Number(getComputedStyle(e).opacity)>.99&&Math.abs(h.x-r.x)<.5&&Math.abs(h.y-r.y)<.5&&Math.abs(h.width-r.width)<.5&&Math.abs(h.height-r.height)<.5})})()"
done
agent-browser --session "$session" mouse move 1100 900
agent-browser --session "$session" wait --fn "[...document.querySelectorAll('[data-ask-rows] [data-slot=fluid-hover-highlight]')].every(e=>Number(getComputedStyle(e).opacity)<.01)"
node "$(dirname "$0")/../../../../scripts/browser-errors.mjs" "$session"
