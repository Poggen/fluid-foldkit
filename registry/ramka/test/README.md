# Ramka verification

These tests call the actual Blocks, Bindings, renderers and mounted browser
resources. Caller callbacks perform their real work and record accepted facts.
No library module or internal state machine is replaced.

HappyDOM cannot supply native layout, Safari gesture events, CSS feature
support, View Transitions, image decode completion, ScrollTimeline or WAAPI
clocks. Narrow controls at those boundaries make cancellation, delayed delivery,
unsupported capabilities and independent `ready`/`finished` ordering reproducible.
Each controlled statement names its native browser keeper and the platform gap.
`required(value)` makes fixture existence an executable assertion instead of a
TypeScript nonnull assertion. Geometry tests live under `src/morph/test/` beside
their implementation owner.

The repository gate also exercises the actual reference page in
`app/test/ramka.e2e.ts` and editable source installed by shadcn in
`tests/consumer/` through `scripts/registry/browser.ts`. Those checks cover the
application and installation boundaries that unit tests cannot reach.

Release parity evidence compares the pinned upstream implementation with this
port: 84 native View Transition variants, plus four gesture trajectories across
Chromium, WebKit and Firefox. A separate Chromium comparison checks compositor
progress through a 400 ms JavaScript block at 6x CPU slowdown. These measurements
must be refreshed against the final source before publication; they are separate
from the deterministic unit tests and ordinary CI browser gate.
