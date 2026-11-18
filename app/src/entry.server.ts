import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'
import { application, knownPath } from './application'
import { initialThemeScript } from './theme'
import { ApplicationFlags, prepareApplicationFlagsFor } from './application-flags'

export const renderDocument: Server.DocumentRenderer = (rendered, assets) =>
  Server.renderDocument(
    rendered,
    import.meta.env.DEV
      ? { ...assets, stylesheets: ['/src/styles.css?direct', ...assets.stylesheets] }
      : assets,
    { head: `<script>${initialThemeScript}</script>` },
  )

export const renderPageEffect = (
  request: Request,
  options: { readonly buildId?: string; readonly trace?: boolean } = {},
) =>
  Effect.gen(function* () {
    const url = new URL(request.url)
    const prepare = prepareApplicationFlagsFor(request.url)
    const flags = yield* options.trace
      ? prepare.pipe(Effect.withSpan('showcase.ssr.flags', {}, { captureStackTrace: false }))
      : prepare
    const render = Server.renderToString(
      application,
      { Flags: ApplicationFlags, routing: {} },
      {
        url: request.url,
        flags,
        ...(options.buildId === undefined ? {} : { buildId: options.buildId }),
      },
    )
    const rendered = yield* options.trace
      ? render.pipe(Effect.withSpan('showcase.ssr.render', {}, { captureStackTrace: false }))
      : render
    return Server.Rendered(rendered, {
      status: knownPath(url.pathname) ? 200 : 404,
      headers: { 'cache-control': 'no-cache' },
    })
  })

export const renderPage: (request: Request) => Promise<Server.EntryResult> = (request: Request) =>
  Effect.runPromise(renderPageEffect(request), { signal: request.signal })
