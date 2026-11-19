# Fluid Foldkit

Native [Foldkit](https://github.com/foldkit/foldkit) ports of
[Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism) by Micka Touillaud
and [Bklit / TanStack Charts](https://github.com/toomingos/bklit-tanstack-charts-migration).
The showcase is the documentation, with live examples, source, API references,
and composition guides. Components use Blocks, Bindings, and Effect Layers.
[Runtime and source contracts](ARCHITECTURE.md) describe the lifetime, motion,
identity, and provenance constraints.
Composition and showcase refinements draw on [Tim Hanlon’s Foldkit port](https://github.com/timhanlon/fluid-functionalism-foldkit).

[Live showcase and installation guide](https://fluid-foldkit.vercel.app).

## Run

Use the pinned Node and Bun toolchain in [mise.toml](mise.toml).

```sh
mise trust
mise install
bun install --frozen-lockfile
bun run reference:setup
bun run registry:build
bun run dev
```

Open [the showcase](http://127.0.0.1:5280/) and its
[installation guide](http://127.0.0.1:5280/installation).
`reference:setup` fetches the pinned Foldkit Domains authoring example.
`bun run build && bun run start` builds and serves production output.
`PORT` and `ORIGIN` configure the production server.

Vercel builds use `bun run build:vercel`. The generated deployment serves static
assets and registries from the CDN and uses Foldkit's emitted Fetch handler for
SSR. Git pushes deploy through the linked Vercel project. `REGISTRY_ORIGIN` can
override the deployment's public registry origin. Vercel builds enable Web Analytics
through the showcase's browser entry; local builds leave it disabled.

For production, connect a public Vercel Blob store to the project. Each build
archives its hashed browser assets before promotion. When an open tab requests
a chunk from an older deployment, the CDN serves the archived file at its
original URL. The store credential belongs in the production build environment.

## Source

- `app/` owns the SSR showcase, server, and browser tests.
- `registry/fluid/` and `registry/charts/` own component source, unit tests, and live examples. Each family keeps its required Motion version.
- `components/docs/` contains shared source and preview controls.
- `lib/` contains the shared catalogue and showcase assets.
- `scripts/` builds registries and runs repository checks.
- `tests/` contains independent consumers, exploration, and parity hosts.

The private workspace manifests list component import subpaths. Generated
registries are written to `public/r/`; the production server is in `app/dist/`.
The installation guide explains editable source installation through shadcn.
The public registries are hosted at `https://fluid-foldkit.vercel.app/r/`.

The showcase uses Foldkit Query for font and attachment loading, and an
application-owned KeyedQuery for component references. Search and Google Fonts
menus opt into CommandMenu's `virtualized` config, backed by native VirtualList.

Chart `YAxis.domain` sets exact finite, increasing bounds per axis and takes
precedence over primary `yDomain`. Bar and Composed also accept `yDomain`.
Horizontal bars support `BarXAxis({ type: 'number', formatValue })` for numeric ticks.
`SankeyNode.formatValue` formats visible node values separately from tooltips.
`HeatmapBin.observed: false` leaves an unavailable date blank and noninteractive
without shifting weekday positions; omitted or true keeps observed zero values.

## Verify

Install Google Chrome for the showcase suite and Chromium for the independent
consumer, then run:

```sh
bunx --no-install agent-browser install
bun run check
bun run format:check
bun run test:consumer
REGISTRY_CONSUMER_ORIGIN=https://fluid-foldkit.vercel.app bun run test:consumer
```

Oxlint includes the complete Landmines recommended preset alongside the Foldkit
and repository rules. Native browser keepers cover real layout and browser APIs;
unit tests retain narrowly documented finite host controls for race and failure paths.

`check` runs architecture guards, Effect diagnostics, tsrs typechecks, lint,
generated consumer admission, unit tests, builds, and production browser tests.
Pull requests, merge groups and pushes to main run the complete GitHub Actions gate. Release tags reuse the commit's verification. Playwright discovers the current suite on every run. CI balances it across 16 Chromium shards using measured Linux durations and verifies each shard’s executed count against its assignment. Every shard tests the same production build. Each shard uploads its report and failure traces. The `check` job requires every lane to pass.

`bun run test:admission` checks copied Sidebar state retention and all generated
CommandMenu layouts with tsrs and the real Foldkit runtime before unit tests. Linux CI installs Playwright
Chromium from `app/` and runs with `CI=1`.

The showcase carries one [temporary Foldkit runtime patch](patches/foldkit@0.170.0-canary.54f8bcd443b4.patch).
It avoids unnecessary subscription publication and DOM work. Its exact contents
and installed runtime hashes are enforced by the dependency-patch guard.
Registry consumers use the unpatched public SDK.

[MIT](LICENSE). Retained source and asset notices are consolidated in [NOTICE](NOTICE)
and included in generated distributions.
