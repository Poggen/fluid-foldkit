import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { tablerIcons } from '../src/icons-tabler.js'
import { phosphorIcons } from '../src/icons-phosphor.js'
import { hugeiconsIcons } from '../src/icons-hugeicons.js'

// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics-next-line nodeBuiltinImport:off -- This SSR test reads independent icon fixtures from disk as its rendering oracle.
import { readFileSync } from 'node:fs'
const parseSvg: (markup: string) => Node = function parseSvg(markup: string) {
  const stack: Array<Node> = []
  let root: Node | undefined
  for (const match of markup.matchAll(/<(\/?)([\w-]+)([^>]*)>/g)) {
    if (match[1] === '/') {
      stack.pop()
      continue
    }
    const tag = match[2]
    if (tag === undefined) throw new Error('Missing SVG tag')
    const attributes = Object.fromEntries(
      [...String(match[3]).matchAll(/([\w:-]+)="([^"]*)"/g)].map((entry) => [
        String(entry[1]),
        String(entry[2]),
      ]),
    )
    const node: Node = { tag, attributes, children: [] }
    const parent = stack.at(-1)
    if (parent) parent.children.push(node)
    else root = node
    stack.push(node)
  }
  if (root === undefined) throw new Error('Missing SVG')
  return root
}

const Cases = Schema.Array(
  Schema.Struct({
    role: Schema.String,
    options: Schema.Struct({
      size: Schema.optionalKey(Schema.Finite),
      strokeWidth: Schema.optionalKey(Schema.Finite),
      className: Schema.optionalKey(Schema.String),
    }),
    svg: Schema.Unknown,
  }),
)
const families = [
  {
    icons: tablerIcons,
    cases: Schema.decodeSync(Schema.fromJsonString(Cases))(
      readFileSync(new URL('./fixtures/icons-tabler.json', import.meta.url), 'utf8'),
    ),
  },
  {
    icons: phosphorIcons,
    cases: Schema.decodeSync(Schema.fromJsonString(Cases))(
      readFileSync(new URL('./fixtures/icons-phosphor.json', import.meta.url), 'utf8'),
    ),
  },
  {
    icons: hugeiconsIcons,
    cases: Schema.decodeSync(Schema.fromJsonString(Cases))(
      readFileSync(new URL('./fixtures/icons-hugeicons.json', import.meta.url), 'utf8'),
    ),
  },
]
const Model = Schema.Struct({})
const AlternateIconsServerDefinition = Block.makeDefinition('AlternateIconsServer', {
  Model,
  Message: Schema.Never,
})
const AlternateIconsServerComposition = AlternateIconsServerDefinition.makeComposition()
const init = AlternateIconsServerComposition.makeInit(() => ({ model: {} }))
const update = AlternateIconsServerComposition.makeUpdate({})
const view = AlternateIconsServerComposition.makeView((_model, h) => ({
  title: 'Exact alternate SVGs',
  body: h.div(
    [],
    families.flatMap(({ icons, cases }) =>
      Object.entries(icons).flatMap(([role, icon]) =>
        cases.filter((item) => item.role === role).map((item) => icon(item.options, h)),
      ),
    ),
  ),
}))
const prepare = () => AlternateIconsServerComposition.prepareBlock({ init, update, view })
const Server: Block.FromAssemblyWithView<typeof Model, typeof prepare> = Block.assemble(prepare)
interface Node {
  tag: string
  attributes: Record<string, string>
  children: Array<Node>
}
test.effect(
  'all three native families preserve 63 latest roles, defaults, custom props and exact SVG trees',
  () =>
    Effect.gen(function* () {
      const result = yield* renderToString(Server, {}, { isHydratable: false })
      const actual: ReadonlyArray<unknown> = [
        ...result.html.matchAll(/<svg\b[\s\S]*?<\/svg>/g),
      ].map((match) => parseSvg(match[0]))
      const expected = families.flatMap(({ icons, cases }) =>
        Object.keys(icons).flatMap((role) =>
          cases.filter((item) => item.role === role).map((item) => item.svg),
        ),
      )
      expect(actual.length).toBe(945)
      for (let index = 0; index < expected.length; index++)
        expect(actual[index]).toEqual(expected[index])
    }),
)
