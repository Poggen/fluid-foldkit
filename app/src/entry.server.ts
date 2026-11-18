import { Clock, Effect } from 'effect'
import { Server } from 'foldkit/experimental'
import { application, knownPath } from './application'
import { initialThemeScript } from './theme'
import { earlyInputHead } from './early-input'
import { homepageCdnHeaders } from './homepage-cache-policy'
import { prepareDocumentation } from './documentation-runtime'
import { ApplicationFlags, prepareApplicationFlagsFor } from './application-flags'

export const renderDocument: Server.DocumentRenderer = (rendered, assets) =>
  Server.renderDocument(
    rendered,
    import.meta.env.DEV
      ? { ...assets, stylesheets: ['/src/styles.css?direct', ...assets.stylesheets] }
      : {
          ...assets,
          modulePreloads: [
            ...new Set([
              ...(assets.entryScript ? [assets.entryScript] : []),
              ...(assets.modulePreloads ?? []),
            ]),
          ],
        },
    { head: `<script>${initialThemeScript}</script>${earlyInputHead}` },
  )

export const renderPageEffect = (
  request: Request,
  options: { readonly buildId?: string; readonly trace?: boolean } = {},
) =>
  Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis
    const url = new URL(request.url)
    if (url.pathname !== '/') yield* Effect.tryPromise(() => prepareDocumentation(url.pathname))
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
    const headers =
      import.meta.env.PROD && !options.trace && options.buildId === undefined
        ? homepageCdnHeaders(request, startedAt, yield* Clock.currentTimeMillis)
        : {}
    return Server.Rendered(rendered, {
      status: knownPath(url.pathname) ? 200 : 404,
      headers: { 'cache-control': 'no-cache', ...headers },
    })
  })

export const renderPage: (request: Request) => Promise<Server.EntryResult> = (request: Request) =>
  Effect.runPromise(renderPageEffect(request), { signal: request.signal })
