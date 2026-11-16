#!/bin/sh
set -eu
session="${FIELD_LABELS_SESSION:-fluid-field-labels}"
url="${1:?Pass the native Field documentation URL}"
trap 'agent-browser --session "$session" close >/dev/null 2>&1 || true' EXIT
agent-browser --session "$session" open "$url"
agent-browser --session "$session" wait '#field-stage [role=combobox]'
agent-browser --session "$session" eval --stdin <<'JS'
const fields = ['field-stage', 'field-department', 'field-language'];
for (const id of fields) {
  const root = document.getElementById(id);
  const control = root?.querySelector('[role=combobox]');
  const label = root?.closest('[data-slot=field]')?.querySelector('label');
  if (!(control instanceof HTMLButtonElement) || !(label instanceof HTMLLabelElement)) {
    throw Error(`${id}: missing Select trigger or FieldLabel`);
  }
  if (label.control !== control) {
    throw Error(`${id}: FieldLabel is not associated with the Select trigger`);
  }
}
console.log('PASS: all three Field labels associate with their Select triggers');
JS
node "$(dirname "$0")/../../../../scripts/browser-errors.mjs" "$session"
