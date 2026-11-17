# ThinkingSteps policy

The root opens from the first available value in this order. Controlled `open`, a reader's manual choice, `running`, then the current `defaultOpen`. Its default is true. A controlled activation emits `OpenChanged` and waits for the parent to accept it. It does not create a manual preference. Parent configuration emits no `OpenChanged`.

`requestConfigure` still requires `open` and `disabled`. Pass `open: null` to release control. Its additive `running` and `defaultOpen` fields preserve their stored inputs when omitted, so existing callers initialized with `defaultOpen: false` remain closed. Pass `running: null` to remove running, and `defaultOpen: null` to restore the source default true. A React prop adapter must send null when either optional prop is removed.

`ThinkingStepDetailsBlock` keeps its separate policy. It defaults closed and only uses `defaultOpen` during initialization. Root-only running and later default changes do not affect details.

`ThinkingStepBlock` accepts complete, active, pending, upcoming, and error. Pending has no rendered row. Active shimmers. Upcoming uses muted normal-weight text; error uses destructive text. Root shimmer follows running independently of whether its panel is open.

Root and step `meta` values are view callbacks. Step `href` is also a view input. Only HTTP, HTTPS, and paths starting with a single slash become links. Links open in a new tab with `rel="noreferrer"` and an accessible new-tab note. Other strings render plain labels.

The adjacent `thinking-trace.ts` composes reasoning, tool results and a plan through Bindings. Its parent owns the simulated workflow timer. The reusable components own disclosure intent, retained collapse and hover completion, step measurement, and presentation.
