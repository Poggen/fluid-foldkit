import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
const run = promisify(execFile)
const workspace = path.resolve(import.meta.dirname, '../../../..')
const output = process.argv[2]
if (!output) throw Error('Usage: line-area-ssr.mjs <absolute-receipt-directory>')
await fs.mkdir(output, { recursive: true })
const sourceResult = await run(
  'bun',
  ['registry/charts/examples/source-baseline/line-area-ssr.mjs'],
  {
    cwd: workspace,
    maxBuffer: 4_000_000,
  },
)
const nativeResult = await run('bun', ['registry/charts/test/line-area-ssr-probe.ts'], {
  cwd: workspace,
  maxBuffer: 4_000_000,
})
const source = JSON.parse(sourceResult.stdout)
const native = JSON.parse(nativeResult.stdout)
await fs.writeFile(path.join(output, 'source-ssr.json'), JSON.stringify(source, null, 2) + '\n')
await fs.writeFile(path.join(output, 'native-ssr.json'), JSON.stringify(native, null, 2) + '\n')
function geometry(html) {
  const paths = [...html.matchAll(/<path[^>]* d="([^"]+)"/g)].map((match) => match[1])
  return {
    svgCount: [...html.matchAll(/<svg\b/g)].length,
    paths: paths.length,
    pathHash: createHash('sha256').update(paths.join('\n')).digest('hex'),
    labels: [...html.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]),
    circles: [...html.matchAll(/<circle\b/g)].length,
  }
}
const families = {}
for (const family of ['line', 'area']) {
  const html = new RegExp(`<section[^>]*id="${family}-fixture"[^>]*>(.*?)</section>`).exec(
    native.html,
  )?.[1]
  if (html === undefined) throw Error('Missing native family')
  const a = geometry(source[family])
  const b = geometry(html)
  families[family] = { source: a, native: b, equal: JSON.stringify(a) === JSON.stringify(b) }
}
const receipt = {
  globals: native.globals,
  meaning:
    'Actual public-barrel SSR against frozen source geometry. No browser pixel/hydration claim.',
  families,
}
await fs.writeFile(
  path.join(output, 'ssr-comparison.json'),
  JSON.stringify(receipt, null, 2) + '\n',
)
if (
  Object.values(native.globals).some((value) => value !== 'undefined') ||
  Object.values(families).some((family) => !family.equal)
)
  throw Error('SSR contract failed')
console.log('Source/native Line and Area server geometry equal; browser globals undefined')
