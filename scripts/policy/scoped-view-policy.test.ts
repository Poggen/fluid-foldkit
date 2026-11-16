import { expect, test } from 'bun:test'
import { checkedScopedViewOverrides, inspectScopedViews } from './scoped-view-policy'

const source = `
import { createLazy } from 'foldkit/html'
import { Effect } from 'effect'
type H = Parameters<typeof Composition.makeView.withInputs>
const makeView = () => {
  const lazy = createLazy()
  const renderChild = (model, h) => h.div([], [model.value])
  return Composition.makeView.withInputs((model, inputs, h) => lazy(renderChild, [model, h]))
}
const plans = Effect.gen(function* () {
  const children = yield* Composition.acquireChildren()
  return { children, view: makeView() }
})
export const layer = Root.makeLayer(plans)
`
test('real enrolled Layers and stable factory pass their construction check', () => {
  expect(inspectScopedViews(source)).toEqual([])
  expect(checkedScopedViewOverrides().flatMap((override) => override.files)).toEqual(
    expect.arrayContaining([
      'app/src/gallery/block.ts',
      'app/src/reference/view.ts',
      'app/src/reference/authored-charts.ts',
      'app/src/reference/authored-chart-variants.ts',
      'app/src/gallery/fluid/blocks/configured-sidebar/view/view.ts',
    ]),
  )
})
for (const [name, changed, reason] of [
  [
    'slot inside rendering',
    source
      .replace('  const lazy = createLazy()', '')
      .replace(
        '=> lazy(renderChild, [model, h])',
        '=> { const lazy = createLazy(); return lazy(renderChild, [model, h]) }',
      ),
    'module const or Effect.sync producer',
  ],
  [
    'inline callback',
    source.replace('lazy(renderChild, [model, h])', 'lazy((model, h) => h.empty, [model, h])'),
    'stable named view',
  ],
  [
    'callback recreated by render',
    source
      .replace('  const renderChild = (model, h) => h.div([], [model.value])', '')
      .replace(
        '=> lazy(renderChild, [model, h])',
        '=> { const renderChild = () => h.empty; return lazy(renderChild, [model, h]) }',
      ),
    'stable in module or construction scope',
  ],
  [
    'factory called twice',
    source.replace('view: makeView()', 'view: makeView(), another: makeView()'),
    'exactly once',
  ],
  [
    'factory called by update',
    source
      .replace('view: makeView()', 'view: otherView')
      .replace('export const layer', 'const update = () => makeView()\nexport const layer'),
    'exactly once',
  ],
  [
    'unchecked children',
    source.replace('yield* Composition.acquireChildren()', 'yield* Effect.succeed({})'),
    'acquire checked',
  ],
  [
    'unused plans',
    source.replace('Root.makeLayer(plans)', 'Root.makeLayer(implementation)'),
    'consume the constructed plans',
  ],
] as const) {
  test(`rejects ${name}`, () => expect(inspectScopedViews(changed).join('; ')).toContain(reason))
}

const helper = `
import { createKeyedLazy } from 'foldkit/html'
import { renderInput as render } from './render'
export const makeDemos = () => {
  const lazy = createKeyedLazy()
  return (model, h) => lazy('input', render<Model>, [model, h])
}
`
const composer = `
import { makeDemos } from './helper'
export const makeView = () => {
  const demos = makeDemos()
  return Composition.makeView.withInputs((model, inputs, h) => demos(model, h))
}
`
const layer = `
import { Effect } from 'effect'
import { makeView } from './composer'
const plans = Effect.gen(function* () {
  const children = yield* Composition.acquireChildren()
  return { children, view: makeView() }
})
export const layer = Root.makeLayer(plans)
`
const renderer = 'export const renderInput = (model, h) => h.div([], [model.value])'
const inspectHelper = (
  helperText = helper,
  composerText = composer,
  layerText = layer,
  rendererText = renderer,
) =>
  inspectScopedViews(helperText, composerText, {
    file: '/fixtures/helper.ts',
    consumerFile: '/fixtures/composer.ts',
    sources: {
      '/fixtures/layer.ts': layerText,
      '/fixtures/render.ts': rendererText,
    },
  })

test('construction-only helper chains accept imported generic render functions', () => {
  expect(inspectHelper()).toEqual([])
  expect(
    inspectHelper(
      helper,
      composer,
      layer,
      'export function renderInput(model, h) { return h.div([], [model.value]) }',
    ),
  ).toEqual([])
})

test('one helper construction per independent view is permitted', () => {
  const second = composer.replace('const makeView', 'const makeOtherView')
  const secondLayer = layer
    .replaceAll('makeView', 'makeOtherView')
    .replace("'./composer'", "'./other'")
  expect(
    inspectScopedViews(helper, composer, {
      file: '/fixtures/helper.ts',
      consumerFile: '/fixtures/composer.ts',
      sources: {
        '/fixtures/layer.ts': layer,
        '/fixtures/other.ts': second,
        '/fixtures/other-layer.ts': secondLayer,
        '/fixtures/render.ts': renderer,
      },
    }),
  ).toEqual([])
})

for (const [name, helperText, composerText, layerText, rendererText, reason] of [
  [
    'helper constructed during rendering',
    helper,
    composer
      .replace('  const demos = makeDemos()\n', '')
      .replace('=> demos(model, h)', '=> makeDemos()(model, h)'),
    layer,
    renderer,
    'exactly once',
  ],
  [
    'helper constructed twice',
    helper,
    composer.replace(
      'const demos = makeDemos()',
      'const demos = makeDemos(); const other = makeDemos()',
    ),
    layer,
    renderer,
    'exactly once',
  ],
  [
    'consumer factory constructed twice',
    helper,
    composer,
    layer.replace('view: makeView()', 'view: makeView(), another: makeView()'),
    renderer,
    'exactly once',
  ],
  [
    'helper escapes its construction site',
    helper,
    composer.replace('const demos = makeDemos()', 'const demos = useFactory(makeDemos)'),
    layer,
    renderer,
    'exactly once',
  ],
  [
    'helper constructed in a loop',
    helper,
    composer.replace(
      'const demos = makeDemos()',
      'const demos = []; for (const x of values) demos.push(makeDemos())',
    ),
    layer,
    renderer,
    'exactly once',
  ],
  [
    'lazy slot escapes through returned record',
    helper.replace(
      "return (model, h) => lazy('input', render<Model>, [model, h])",
      'return { lazy }',
    ),
    composer,
    layer,
    renderer,
    'cannot escape',
  ],
  [
    'render callback shadows imported stable function',
    helper.replace(
      "return (model, h) => lazy('input', render<Model>, [model, h])",
      "return (model, h) => { const render = () => h.empty; return lazy('input', render, [model, h]) }",
    ),
    composer,
    layer,
    renderer,
    'stable in module or construction scope',
  ],
  [
    'render parameter shadows imported stable function',
    helper.replace('(model, h) => lazy', '(model, h, render) => lazy'),
    composer,
    layer,
    renderer,
    'stable in module or construction scope',
  ],
  [
    'imported renderer constructed dynamically',
    helper,
    composer,
    layer,
    'export const renderInput = makeRenderer()',
    'stable in module or construction scope',
  ],
  [
    'imported renderer is mutable',
    helper,
    composer,
    layer,
    'export let renderInput = (model, h) => h.empty',
    'stable in module or construction scope',
  ],
  [
    'factory imported under two aliases and called twice',
    helper,
    composer
      .replace('import { makeDemos }', 'import { makeDemos, makeDemos as another }')
      .replace('const demos = makeDemos()', 'const demos = makeDemos(); const other = another()'),
    layer,
    renderer,
    'exactly once',
  ],
] as const) {
  test(`rejects ${name}`, () => {
    expect(inspectHelper(helperText, composerText, layerText, rendererText).join('; ')).toContain(
      reason,
    )
  })
}

test('configured helper chains retain construction-only lifetime and renderer identity checks', () => {
  const configured = `
import { makeDemos } from './helper'
export const makeConfigured = () => {
  const demos = makeDemos()
  return (model, h) => demos(model, h)
}
`
  const configuredComposer = composer
    .replace(
      "import { makeDemos } from './helper'",
      "import { makeConfigured } from './configured'",
    )
    .replace('makeDemos()', 'makeConfigured()')
  const inspect = (configuration: string, helperText = helper) =>
    inspectScopedViews(helperText, configuredComposer, {
      file: '/fixtures/helper.ts',
      consumerFile: '/fixtures/composer.ts',
      sources: {
        '/fixtures/configured.ts': configuration,
        '/fixtures/layer.ts': layer,
        '/fixtures/render.ts': renderer,
      },
    })
  expect(inspect(configured)).toEqual([])
  expect(
    inspect(
      configured.replace(
        'const demos = makeDemos()',
        'const demos = makeDemos(); const other = makeDemos()',
      ),
    ).join('; '),
  ).toContain('exactly once')
  expect(
    inspect(
      configured
        .replace('  const demos = makeDemos()\n', '')
        .replace('=> demos(model, h)', '=> makeDemos()(model, h)'),
    ).join('; '),
  ).toContain('exactly once')
  expect(
    inspect(configured, helper.replace('render<Model>', '(model, h) => h.empty')).join('; '),
  ).toContain('stable named view')
})

test('document views retain the same scoped construction proof', () => {
  const documentView = source.replace(
    'Composition.makeView.withInputs((model, inputs, h)',
    'Composition.makeView((model, h)',
  )
  expect(inspectScopedViews(documentView)).toEqual([])
  expect(
    inspectScopedViews(
      documentView.replace('view: makeView()', 'view: makeView(), second: makeView()'),
    ),
  ).not.toEqual([])
})

// These syntax fixtures exercise the policy's admission boundary; SDK types own
// the init/update contracts. Public constructor identity is still mandatory here.
const ordinary = source
  .replace(
    "import { Effect } from 'effect'",
    "import { Layer } from 'effect'\nimport { Block } from 'foldkit'",
  )
  .replace(
    source.slice(source.indexOf('const plans =')),
    `
const key = Symbol('Root')
const Root = Block.make('Root', { key })
const implementation = { init, update }
export const layer = Layer.suspend(() =>
  Root.makeLayer({ ...implementation, view: makeView() }),
).pipe(Layer.provide(ChildrenLayer))
`,
  )

test('public suspended record completion preserves per-acquisition view construction', () => {
  expect(inspectScopedViews(ordinary)).toEqual([])
  expect(
    inspectScopedViews(
      ordinary
        .replace('{ Layer }', '{ Layer as EffectLayer }')
        .replaceAll('Layer.', 'EffectLayer.'),
    ),
  ).toEqual([])
  expect(inspectScopedViews(ordinary.replace('...implementation, ', 'init, update, '))).toEqual([])
  expect(
    inspectScopedViews(
      ordinary
        .replace('() =>\n  Root.makeLayer', '() => { return Root.makeLayer')
        .replace('view: makeView() }),\n)', 'view: makeView() }); }\n)'),
    ),
  ).toEqual([])
})

for (const [name, changed, reason] of [
  [
    'eager ordinary completion',
    ordinary.replace(
      'Layer.suspend(() =>\n  Root.makeLayer({ ...implementation, view: makeView() }),\n)',
      'Root.makeLayer({ ...implementation, view: makeView() })',
    ),
    'checked Layer.suspend',
  ],
  [
    'suspend lookalike',
    ordinary.replace("from 'effect'", "from './fake-effect'"),
    'checked Layer.suspend',
  ],
  [
    'Block constructor lookalike',
    ordinary.replace("from 'foldkit'", "from './fake-foldkit'"),
    'checked Layer.suspend',
  ],
  [
    'fake makeLayer receiver',
    ordinary.replace("Block.make('Root', { key })", '{ makeLayer: (record) => record }'),
    'checked Layer.suspend',
  ],
  [
    'view overridden after construction',
    ordinary.replace('view: makeView() }', 'view: makeView(), view: replacement }'),
    'final view',
  ],
  [
    'known spread replacing a constructed view',
    ordinary.replace('view: makeView() }', 'view: makeView(), ...{ view: replacement } }'),
    'final view',
  ],
  [
    'opaque spread after construction',
    ordinary.replace('view: makeView() }', 'view: makeView(), ...unknownOverride }'),
    'checked Layer.suspend',
  ],
  [
    'manual children hidden in a record spread',
    ordinary.replace('{ init, update }', '{ init, update, children: unchecked }'),
    'checked Layer.suspend',
  ],
  [
    'ordinary factory called twice',
    ordinary.replace('view: makeView() }', 'view: makeView(), another: makeView() }'),
    'exactly once',
  ],
  [
    'ordinary factory called during update',
    `${ordinary}\nconst updateView = () => makeView()`,
    'exactly once',
  ],
  [
    'ordinary factory rendered through a fresh callback',
    ordinary.replace(
      '=> lazy(renderChild, [model, h])',
      '=> { const renderChild = () => h.empty; return lazy(renderChild, [model, h]) }',
    ),
    'stable in module or construction scope',
  ],
  [
    'suspended Layer discarded by a pipe callback',
    ordinary.replace('Layer.provide(ChildrenLayer)', '() => replacementLayer'),
    'checked Layer.suspend',
  ],
  [
    'suspended Layer recreated during rendering',
    ordinary.replace('export const layer = Layer.suspend', 'const render = () => Layer.suspend'),
    'checked Layer.suspend',
  ],
  [
    'unchecked manual plans alongside ordinary completion',
    `${ordinary}\nconst plans = Effect.gen(function* () { return { view: otherView } })\nconst unchecked = Root.makeLayer(plans)`,
    'acquire checked',
  ],
  [
    'unconsumed manual plans alongside ordinary completion',
    `${ordinary}\nconst plans = Effect.gen(function* () { const children = yield* Composition.acquireChildren(); return { children } })`,
    'consume the constructed plans',
  ],
] as const) {
  test(`rejects ${name}`, () => expect(inspectScopedViews(changed).join('; ')).toContain(reason))
}

const ordinaryLayer = `
import { Layer } from 'effect'
import { Block } from 'foldkit'
import { makeView } from './composer'
const Root = Block.make('Root', { key: Symbol('Root') })
export const layer = Layer.suspend(() => Root.makeLayer({ init, update, view: makeView() }))
`
const barrelComposer = composer.replace(
  "{ makeDemos } from './helper'",
  "{ createDemos as makeDemos } from './views'",
)
const inspectBarrel = (barrel: string, composerText = barrelComposer) =>
  inspectScopedViews(helper, composerText, {
    file: '/fixtures/helper.ts',
    consumerFile: '/fixtures/composer.ts',
    sources: {
      '/fixtures/layer.ts': ordinaryLayer,
      '/fixtures/render.ts': renderer,
    },
    readSource: (file) => (file === '/fixtures/views/index.ts' ? barrel : undefined),
  })

test('relative index barrels preserve original factory identity through explicit named re-exports', () => {
  const barrel = "export { makeDemos as createDemos } from '../helper.js'"
  expect(inspectBarrel(barrel)).toEqual([])
  expect(
    inspectBarrel("import { makeDemos } from '../helper.ts'; export { makeDemos as createDemos }"),
  ).toEqual([])
  expect(
    inspectBarrel(
      barrel,
      barrelComposer.replace(
        'const demos = makeDemos()',
        'const demos = makeDemos(); const duplicate = makeDemos()',
      ),
    ).join('; '),
  ).toContain('exactly once')
  expect(
    inspectBarrel(
      barrel,
      barrelComposer
        .replace('  const demos = makeDemos()\n', '')
        .replace('=> demos(model, h)', '=> makeDemos()(model, h)'),
    ).join('; '),
  ).toContain('exactly once')
})

for (const [name, barrel] of [
  [
    'executable re-export barrel',
    "import { makeDemos } from '../helper'; makeDemos(); export { makeDemos as createDemos }",
  ],
  ['cyclic named export', "export { createDemos } from './index'"],
  [
    'executable factory alias',
    "import { makeDemos } from '../helper'; export const createDemos = () => makeDemos()",
  ],
] as const) {
  test(`rejects unproven ${name} construction consumers`, () => {
    expect(inspectBarrel(barrel).join('; ')).toContain('exactly once')
  })
}

test('star re-exports cannot prove lifetime even when the imported factory name exists', () => {
  const composerText = composer.replace("from './helper'", "from './views'")
  expect(inspectBarrel("export * from '../helper'", composerText).join('; ')).toContain(
    'exactly once',
  )
})
