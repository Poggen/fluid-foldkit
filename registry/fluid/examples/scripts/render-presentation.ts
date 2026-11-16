// @effect-diagnostics-next-line nodeBuiltinImport:off -- Build observer joins the formatter and compares serialized hydration bytes before and after formatting.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
// @effect-diagnostics-next-line nodeBuiltinImport:off -- Build observer joins the formatter and compares serialized hydration bytes before and after formatting.
import { execFileSync } from 'node:child_process'
import { Effect, Schema } from 'effect'
import { createServer } from 'vite'
const root = fileURLToPath(new URL('..', import.meta.url))
const template = readFileSync(new URL('../presentation.html', import.meta.url), 'utf8')
  .replace(
    '<div id="root"></div>',
    '<!-- Preserve serialized vnode text nodes for hydration. -->\n<!-- prettier-ignore -->\n<div id="root"></div>',
  )
  .replace('/src/presentation.ts', '/src/presentation-hydration.ts')
  .replace(
    '<script type="module"',
    '<script>window.__presentationServerRoot=document.querySelector("[data-foldkit-app]");window.__presentationServerButton=document.querySelector("#inherited button")</script><script type="module"',
  )
const main = Effect.scoped(
  Effect.gen(function* () {
    const server = yield* Effect.acquireRelease(
      Effect.promise(() =>
        createServer({
          root,
          configFile: `${root}/vite.presentation.config.ts`,
          server: { middlewareMode: true },
          appType: 'custom',
        }),
      ),
      (server) => Effect.promise(() => server.close()),
    )
    const module: unknown = yield* Effect.promise(() =>
      server.ssrLoadModule('/src/presentation-server.ts'),
    )
    if (
      typeof module !== 'object' ||
      module === null ||
      !('renderPresentation' in module) ||
      typeof module.renderPresentation !== 'function'
    )
      throw new Error('Missing presentation SSR entry')
    const render = module.renderPresentation
    const output: unknown = yield* Effect.sync(() => render(template))
    const html = yield* Schema.decodeUnknownEffect(Schema.String)(output)
    yield* Effect.sync(() => {
      const target = new URL('../presentation-hydration.html', import.meta.url)
      const payload = html.match(/<main\b[\s\S]*?<\/main>/)?.[0]
      if (payload === undefined) throw new Error('Missing serialized presentation root')
      writeFileSync(target, html)
      execFileSync(fileURLToPath(new URL('../../../../node_modules/.bin/oxfmt', import.meta.url)), [
        fileURLToPath(target),
      ])
      const formatted = readFileSync(target, 'utf8').match(/<main\b[\s\S]*?<\/main>/)?.[0]
      if (payload !== formatted)
        throw new Error('Formatter changed serialized hydration text nodes')
    })
  }),
)
await Effect.runPromise(main)
