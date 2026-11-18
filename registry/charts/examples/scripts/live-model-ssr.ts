// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics-next-line nodeBuiltinImport:off -- Build fixture generator reads and writes the serialized HTML artifact outside the application runtime.
import { readFile, writeFile } from 'node:fs/promises'
import { Effect } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { liveModelExample } from '../src/live-model.fixture'

const path = new URL('../live-model-ssr.html', import.meta.url)
const template = (await readFile(path, 'utf8')).replace(
  /(?:<!-- prettier-ignore -->\s*)?(<main id="root" data-epoch="\d+">)/u,
  '<!-- prettier-ignore -->\n$1',
)
const opening = /<main id="root" data-epoch="(\d+)">/u.exec(template)
const epoch = opening?.[1]

if (opening === null || epoch === undefined) {
  throw new Error('LiveLine hydration fixture requires its existing root and epoch')
}

const start = opening.index + opening[0].length
const end = template.indexOf('</main>', start)

if (end === -1) throw new Error('LiveLine hydration fixture requires a closing main element')

const rendered = await Effect.runPromise(
  renderToString(
    liveModelExample(Number(epoch)),
    {},
    { runtimeId: 'root', buildId: 'live-model-proof-v1' },
  ),
)

await writeFile(path, `${template.slice(0, start)}\n${rendered.html}\n${template.slice(end)}`)
