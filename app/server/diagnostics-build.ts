import { basename, extname, resolve } from 'node:path'
import { preprocessCSS, resolveConfig } from 'vite'

const cssConfig = await resolveConfig(
  { root: new URL('../', import.meta.url).pathname },
  'build',
  'production',
  'production',
)

// Preserve the showcase's Vite asset imports without loading a second compiled SDK graph.
const result = await Bun.build({
  entrypoints: [new URL('./diagnostics.ts', import.meta.url).pathname],
  target: 'bun',
  define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true' },
  plugins: [
    {
      name: 'diagnostic-raw-source',
      setup(build) {
        build.onResolve({ filter: /\.css\?inline$/u }, (args) => ({
          path: Bun.resolveSync(args.path.slice(0, -7), args.resolveDir),
          namespace: 'diagnostic-inline-css',
        }))
        build.onLoad({ filter: /.*/u, namespace: 'diagnostic-inline-css' }, async (args) => ({
          contents: (await preprocessCSS(await Bun.file(args.path).text(), args.path, cssConfig))
            .code,
          loader: 'text',
        }))
        build.onResolve({ filter: /\?raw$/u }, (args) => ({
          path: resolve(args.resolveDir, args.path),
          namespace: 'diagnostic-raw',
        }))
        build.onLoad({ filter: /.*/u, namespace: 'diagnostic-raw' }, async (args) => ({
          contents: await Bun.file(args.path.slice(0, -4)).text(),
          loader: 'text',
        }))
        build.onResolve({ filter: /\?url$/u }, (args) => ({
          path: resolve(args.resolveDir, args.path.slice(0, -4)),
          namespace: 'diagnostic-url',
        }))
        build.onLoad({ filter: /.*/u, namespace: 'diagnostic-url' }, async (args) => {
          const extension = extname(args.path)
          const stem = basename(args.path, extension)
          const directory = resolve(
            process.env.DIAGNOSTICS_DIST ?? new URL('../dist', import.meta.url).pathname,
            'client/assets',
          )
          const matches = [
            ...new Bun.Glob(`${stem}-*${extension}`).scanSync({ cwd: directory, onlyFiles: true }),
          ]
          if (matches.length === 1)
            return { contents: JSON.stringify(`/assets/${matches[0]}`), loader: 'json' }
          const file = Bun.file(args.path)
          if (matches.length === 0 && file.size <= 4096) {
            const encoded = Buffer.from(await file.arrayBuffer()).toString('base64')
            return {
              contents: JSON.stringify(`data:${file.type};base64,${encoded}`),
              loader: 'json',
            }
          }
          throw new Error(`Expected one built URL asset for ${basename(args.path)}`)
        })
      },
    },
  ],
})
if (!result.success) throw new AggregateError(result.logs, 'Diagnostic host build failed')
const output = result.outputs[0]
if (output === undefined) throw new Error('Diagnostic host build emitted no output')
await Bun.write('.verification/diagnostics-host.js', output)
