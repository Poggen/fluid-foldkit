# Fluid Foldkit

Native [Foldkit](https://github.com/foldkit/foldkit) ports of
[Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism) by Micka Touillaud
and [Bklit / TanStack Charts](https://github.com/toomingos/bklit-tanstack-charts-migration).
The showcase is the documentation, with live examples, source, API references,
and composition guides. Components use Blocks, Bindings, and Effect Layers.
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
override the deployment's public registry origin.

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

## Verify

Install Google Chrome for the showcase suite and Chromium for the independent
consumer, then run:

```sh
bunx --no-install agent-browser install
bun run check
bun run format:check
bun run test:consumer
```

`check` runs architecture guards, Effect diagnostics, tsrs typechecks, lint,
unit tests, builds, and production browser tests. Linux CI installs Playwright
Chromium from `app/` and runs with `CI=1`.

The showcase carries one [temporary Foldkit runtime patch](patches/foldkit@0.170.0-canary.54f8bcd443b4.patch).
It avoids unnecessary subscription publication and DOM work. Its exact contents
and installed runtime hashes are enforced by the dependency-patch guard.
Registry consumers use the unpatched public SDK.

[MIT](LICENSE). Retained source and asset notices are consolidated in [NOTICE](NOTICE)
and included in generated distributions.
