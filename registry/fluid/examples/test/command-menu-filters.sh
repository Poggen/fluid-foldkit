#!/bin/sh
# Run only after root admits the candidate and the exclusive browser lane is free.
set -eu
session="${COMMAND_FILTERS_SESSION:-fluid-command-filters}"
url="${1:?Pass rebuilt /command-menu-filters.html URL without query}"
script="$(dirname "$0")/command-menu-filters.browser.js"
trap 'agent-browser --session "$session" close >/dev/null 2>&1 || true' EXIT
for size in default compact; do
  for layout in standalone trailing; do
    agent-browser --session "$session" open "$url?size=$size&layout=$layout"
    agent-browser --session "$session" set viewport 1280 900
    agent-browser --session "$session" wait '#filter-reset'
    agent-browser --session "$session" eval --stdin < "$script"
    agent-browser --session "$session" click '#filters-type [role="combobox"]'
    agent-browser --session "$session" press End
    agent-browser --session "$session" press Enter
    agent-browser --session "$session" wait --fn 'document.querySelector("#filter-results").textContent === "Zebra, Alpha"'
    agent-browser --session "$session" click '#filters-sort [role="combobox"]'
    agent-browser --session "$session" press End
    agent-browser --session "$session" press Enter
    agent-browser --session "$session" wait --fn 'document.querySelector("#filter-results").textContent === "Alpha, Zebra"'
    agent-browser --session "$session" click '#filters-type [role="combobox"]'
    agent-browser --session "$session" wait '[role="listbox"]'
    agent-browser --session "$session" eval 'window.commandFilterRetained = { compact: JSON.parse(document.querySelector("#filter-state").textContent).compact, trigger: document.querySelector("#filters-type [role=combobox]"), popup: document.querySelector("[role=listbox]") }; if (!document.querySelector("[role=listbox] .lucide-settings")) throw Error("Popup lost inherited icon");'
    # F2 is a real checked fixture Mount that delivers the parent presentation Message.
    agent-browser --session "$session" eval --stdin < "$script"
    agent-browser --session "$session" press F2
    agent-browser --session "$session" wait --fn '(() => { const before = window.commandFilterRetained.compact; const state = JSON.parse(document.querySelector("#filter-state").textContent); if (state.compact !== !before) return false; const tabs = document.querySelector("[data-slot=command-menu-tabs]"); const wrapper = tabs || document.querySelector("[data-slot=command-menu-filters]"); const expected = before ? 10 : 8; return Math.abs(parseFloat(getComputedStyle(wrapper).paddingLeft) - expected) < 0.75 && (!tabs || Math.abs(document.querySelector("#ambient-trailing").getBoundingClientRect().height - (before ? 36 : 28)) < 0.75); })()'
    agent-browser --session "$session" eval --stdin < "$script"
    agent-browser --session "$session" eval 'if (document.querySelector("#filters-type [role=combobox]") !== window.commandFilterRetained.trigger) throw Error("Presentation replaced the Select occurrence"); if(document.querySelector("[role=listbox]")!==window.commandFilterRetained.popup) throw Error("Presentation replaced the open popup"); if(document.querySelector("#filters-type [role=combobox]").getAttribute("aria-expanded")!=="true") throw Error("Presentation closed the Select"); const s = JSON.parse(document.querySelector("#filter-state").textContent); if(s.compact !== !window.commandFilterRetained.compact) throw Error("Parent presentation did not flip"); if(s.filter!=="Actions"||s.sort!=="az") throw Error("Presentation reset accepted selection");'
    agent-browser --session "$session" press Escape
    agent-browser --session "$session" eval 'if(document.activeElement!==document.querySelector("#filters-type [role=combobox]")) throw Error("Escape did not return Select focus")'
    agent-browser --session "$session" click '#filter-reset'
    agent-browser --session "$session" wait --fn 'document.querySelector("#filter-results").textContent === "Zebra, Alpha, Home"'
    node "$(dirname "$0")/../../../../scripts/browser-errors.mjs" "$session"
  done
done
