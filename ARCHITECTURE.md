# Runtime and source contracts

The pinned Foldkit Blocks, Bindings and implementation Layers own state and
lifetime. Composition guards accept explicit factory chains and renderer
identities; transparent relative modules and named exports preserve that proof.
Executable aliases, star exports and package lookups cannot prove a scoped
factory's lifetime.

Motion resources belong to their physical DOM lifetime. Server rendering must
leave the client motion scope untouched. Snapshot roots measure before ancestor
mutations, while projection follows accepted application state. Do not advance
the shared global Motion frame loop. Retire old physical views before a retained
Binding reacquires a replacement. Completion and parent acknowledgements must
refer to the final committed generation.

Chart hover generally projects onto scoped host attributes or CSS custom
properties. It must preserve the renderer definition and keyed mark identity.
Sunburst paint order remains independent of zoom: removing and reinserting a
sector in one task interrupts CSS transitions. Live charts retain fixed window
slot counts, and nonfinite samples retain the previous painted value instead
of passing NaN into the renderer.

Font and layout observations belong to the rendered chart's document. Font,
visibility, resize and rebind changes admit fresh measurement without publishing
unchanged dimensions. Geometry remains derived from each chart's own layout,
including source-specific hit testing and keyboard order.

Upstream copyright and provenance remain attached to component source as
`@license` comments and in NOTICE. Required Vitest environment and compiler
JSDoc directives remain functional; their narrow lint compatibility annotations
cover only those directives.

Tests use the actual Foldkit runtime and public consumer inputs. Generated Sidebar
and CommandMenu admission checks run directly before unit tests through
`test:admission`; their child failures stop the root gate. Node-only reference
oracles live in test fixtures outside browser source.

The Landmines recommended preset applies in full. Exact native-host controls in
unit tests preserve finite geometry, unsupported APIs, invalid font metrics and
race delivery that HappyDOM cannot supply. Their statement-level explanations
name independent browser keepers. `font-contracts.e2e.ts` checks native Canvas,
font admission and callback retirement; `host-geometry-contracts.e2e.ts` checks
real tab, popup and collapse layout; `color-scrub-contracts.e2e.ts` uses an actual
sandbox pointer-lock denial. These controls do not replace application logic.
Required copyright notices remain exact, and compiler diagnostics keep their
existing severities.
