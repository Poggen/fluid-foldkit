import { Effect } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { familyRootDocument } from '../../test/fixtures/family-root-document'

const output = process.argv[2]
if (output === undefined) throw new Error('Expected isolated output HTML path')
const subject = familyRootDocument('root-family')
const rendered = await Effect.runPromise(
  renderToString({ block: subject.block, layer: subject.layer }, {}, { isHydratable: false }),
)
await Bun.write(
  output,
  `<!doctype html><html><head><meta charset="UTF-8"><title>Family root reserve</title></head><body><main id="root">${rendered.html}</main><script type="module" src="/src/family-root-entry.ts"></script></body></html>`,
)
