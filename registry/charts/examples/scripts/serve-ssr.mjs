import { createServer } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createServer as createViteServer } from 'vite'
import { injectIntoTemplate } from 'foldkit/experimental/server'

const root = path.resolve(import.meta.dirname, '..')
const vite = await createViteServer({
  root,
  cacheDir: path.join(root, 'node_modules/.vite-ssr'),
  server: { middlewareMode: true },
  appType: 'custom',
})
const template = (await fs.readFile(path.join(root, 'index.html'), 'utf8'))
  .replace('/src/entry.ts', '/src/hydrate.ts')
  .replace(
    '</head>',
    `<link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/@fs${path.resolve(root, '../../registry/charts/src/styles.css')}"></head>`,
  )
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:5243')
  if (url.pathname !== '/hydrate')
    return vite.middlewares(request, response, () => {
      response.statusCode = 404
      response.end()
    })
  try {
    const entry = await vite.ssrLoadModule('/src/ssr.ts')
    const rendered = await entry.renderPage(url.searchParams.get('fixture') ?? 'arc')
    const html = injectIntoTemplate(await vite.transformIndexHtml(request.url, template), rendered)
    response.setHeader('Content-Type', 'text/html')
    response.end(html)
  } catch (error) {
    vite.ssrFixStacktrace(error)
    response.statusCode = 500
    response.end(error.stack)
  }
})
server.listen(5243, '127.0.0.1', () => console.log('Charts SSR http://127.0.0.1:5243/hydrate'))
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    server.close()
    await vite.close()
    process.exit(0)
  })
