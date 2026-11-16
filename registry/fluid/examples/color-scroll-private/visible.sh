#!/bin/sh
set -eu
color_scroll_session=$1
shift
agent-browser --session "$color_scroll_session" tab t1
agent-browser --session "$color_scroll_session" eval 'if(document.visibilityState!=="visible")throw new Error("PARITY_SETUP_HIDDEN");({visibility:document.visibilityState,url:location.href})'
agent-browser --session "$color_scroll_session" "$@"
