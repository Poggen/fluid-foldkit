#!/bin/sh
# Run with the coordinated browser lane, against a rebuilt native example.
set -eu
session="${TABS_SESSION:-fluid-tabs-selection}"
url="${TABS_URL:-http://127.0.0.1:4525/tabs-forms.html}"
script="$(dirname "$0")/tabs-selection.browser.js"
trap 'agent-browser --session "$session" close >/dev/null 2>&1 || true' EXIT
agent-browser --session "$session" open "$url"
agent-browser --session "$session" set viewport 1280 800
check() {
  agent-browser --session "$session" eval "window.expectedTabLabel='$1'" >/dev/null
  agent-browser --session "$session" wait 500 >/dev/null
  agent-browser --session "$session" eval --stdin < "$script"
}
click() { agent-browser --session "$session" find role "$1" click --name "$2"; }
click tab Settings
check Settings
click button 'First item'
check Settings
click tab Settings
check Settings
click tab Activity
check Activity
click button Selected
check Settings
click button Direction
click button Icons
click tab Activity
check Activity
click tab Settings
check Settings
click button 'First item'
check Settings
click tab Overview
check Overview
node "$(dirname "$0")/../../../../scripts/browser-errors.mjs" "$session"
agent-browser --session "$session" open "$url?disabled=activity"
agent-browser --session "$session" eval '(() => { const tab=document.querySelector("#example-tab-1"); if(tab?.getAttribute("aria-disabled")!=="true" || !document.body.textContent.includes("Activity is disabled")) throw Error("Disabled fixture must be explicit"); return "disabled fixture explicit" })()'
node "$(dirname "$0")/../../../../scripts/browser-errors.mjs" "$session"
