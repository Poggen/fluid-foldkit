#!/bin/sh
set -eu
session="${BREADCRUMB_SESSION:-fluid-breadcrumb-controls}"
url="${1:?Pass the native /breadcrumb.html URL}"
trap 'agent-browser --session "$session" close >/dev/null 2>&1 || true' EXIT
agent-browser --session "$session" open "$url"
agent-browser --session "$session" wait '.breadcrumb-playground-controls'
agent-browser --session "$session" click '.breadcrumb-playground-controls [aria-label=Steps]'
agent-browser --session "$session" wait '[role=listbox]'
agent-browser --session "$session" find role option click --name '2' --exact
agent-browser --session "$session" wait --fn 'document.querySelector(".breadcrumb-playground-controls [aria-expanded=true]") === null && document.querySelector("[role=listbox]") === null'
agent-browser --session "$session" eval 'const steps=document.querySelector("#breadcrumb-playground-steps [role=combobox]");if(!steps?.textContent.includes("2"))throw Error("Steps selection was not acknowledged");for(const key of ["collapse","reveal"]){const trigger=document.querySelector(`#breadcrumb-playground-${key} [role=combobox]`);if(!trigger?.disabled)throw Error(`${key} did not disable for a two-step trail`)}'
agent-browser --session "$session" click '.breadcrumb-playground-controls [aria-label=Steps]'
agent-browser --session "$session" wait '[role=listbox]'
agent-browser --session "$session" find role option click --name '6' --exact
agent-browser --session "$session" wait --fn 'document.querySelector(".breadcrumb-playground-controls [aria-expanded=true]") === null && document.querySelector("[role=listbox]") === null'
agent-browser --session "$session" click '#breadcrumb-playground-collapse [role=combobox]'
agent-browser --session "$session" wait '[role=listbox]'
agent-browser --session "$session" find role option click --name 'Never' --exact
agent-browser --session "$session" wait --fn 'document.querySelector(".breadcrumb-playground-controls [aria-expanded=true]") === null && document.querySelector("[role=listbox]") === null'
agent-browser --session "$session" eval 'const collapse=document.querySelector("#breadcrumb-playground-collapse [role=combobox]");if(!collapse?.textContent.includes("Never"))throw Error("Collapse selection was not acknowledged");if(!document.querySelector("#breadcrumb-playground-reveal [role=combobox]")?.disabled)throw Error("Reveal did not disable when collapse is never")'
agent-browser --session "$session" click '#breadcrumb-playground-separator [role=combobox]'
agent-browser --session "$session" wait '[role=listbox]'
agent-browser --session "$session" press Escape
agent-browser --session "$session" wait --fn 'document.activeElement===document.querySelector("#breadcrumb-playground-separator [role=combobox]")'
agent-browser --session "$session" eval 'if(document.activeElement!==document.querySelector("#breadcrumb-playground-separator [role=combobox]"))throw Error("Escape did not restore the Select trigger focus")'
node "$(dirname "$0")/../../../../scripts/browser-errors.mjs" "$session"
