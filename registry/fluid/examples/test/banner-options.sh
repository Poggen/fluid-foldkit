#!/bin/sh
# Run only while this lane owns the coordinated active-browser capture lease.
set -eu
: "${BANNER_RECEIPT_ROOT:?Set an absolute lane receipt directory}"
: "${BANNER_RENDERER:?Set native or original}"
mkdir -p "$BANNER_RECEIPT_ROOT"
case "$BANNER_RENDERER" in
 native) banner_port="${BANNER_PORT:-4521}" ;;
 original) banner_port="${BANNER_PORT:-4522}" ;;
 *) exit 2 ;;
esac
banner_session="${BANNER_SESSION:-fluid-banner-$BANNER_RENDERER}"
banner_script_path="$(dirname "$0")/banner-options.browser.js"
banner_run="$(date +%s)"
for banner_theme in ${BANNER_THEMES:-light dark}; do
  for banner_batch in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    agent-browser --session "$banner_session" open "http://127.0.0.1:$banner_port/banner.html?batch=$banner_batch&theme=$banner_theme&receipt-run=$banner_run" >/dev/null
    agent-browser --session "$banner_session" tab t1 >/dev/null
    agent-browser --session "$banner_session" --json eval --stdin < "$banner_script_path" > "$BANNER_RECEIPT_ROOT/banner-options-$BANNER_RENDERER-$banner_theme-$banner_batch.json"
    printf '%s %s %s\n' "$BANNER_RENDERER" "$banner_theme" "$banner_batch"
  done
done
