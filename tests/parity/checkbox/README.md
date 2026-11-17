# Checkbox interaction fixture

```sh
bun run --cwd app test test/generated-inputs.test.ts
bunx --no-install vite build tests/parity/checkbox --config tests/parity/checkbox/vite.config.mjs
bun run --cwd app build
bunx --no-install playwright test --config tests/parity/checkbox/playwright.config.mjs
```

The dedicated browser fixture checks controlled refusal, mixed state, forms, glyph replacement and retained exits with reduced motion on and off. It starts production previews on ports 5741 and 5742. The regular app test gate compiles and executes copied examples for all four checked/mixed combinations.

The component follows Base UI activation. A mixed checkbox requests `!checked`; the original's Radix implementation requests `true` for either checked value.
