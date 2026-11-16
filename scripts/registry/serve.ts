import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { root } from './config.ts'

const directory = path.join(root, 'public')
const port = Number(process.env.PORT ?? 5280)
const server = Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname)
    const file = path.resolve(
      directory,
      `.${pathname.endsWith('/') ? pathname + 'index.html' : pathname}`,
    )
    if (!file.startsWith(directory + path.sep) || !existsSync(file) || !statSync(file).isFile())
      return new Response('Not found', { status: 404 })
    return new Response(Bun.file(file), { headers: { 'Cache-Control': 'no-store' } })
  },
})
console.log(`Foldkit Visuals: ${server.url}`)
