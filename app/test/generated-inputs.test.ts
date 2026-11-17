// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import ts from 'typescript-api'
import { defaults as checkbox } from '../src/playground/configs/checkbox'
import { defaults as checks } from '../src/playground/configs/checkbox-group'
import { defaults as field } from '../src/playground/configs/field'
import { simpleCode } from '../src/playground/configs/simple-code'

test('generated input examples preserve controlled state, mixed glyphs and existing descriptions', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const verification = path.join(root, '.verification')
  mkdirSync(verification, { recursive: true })
  const directory = mkdtempSync(path.join(verification, 'generated-inputs-'))
  const parts = (source: string | undefined) => {
    if (source === undefined) throw new Error('Expected generated input example')
    const ast = ts.createSourceFile('example.ts', source, ts.ScriptTarget.ESNext, true)
    const imports = ast.statements.filter(ts.isImportDeclaration).map((node) => node.getText(ast))
    const setup = ast.statements
      .filter((node) => !ts.isImportDeclaration(node) && !ts.isExpressionStatement(node))
      .map((node) => node.getText(ast))
    const views = ast.statements.filter(ts.isExpressionStatement)
    if (views.length !== 1) throw new Error('Expected one generated view')
    return {
      imports: imports.join('\n'),
      setup: setup.join('\n'),
      view: views[0]?.expression.getText(ast),
    }
  }
  const group = parts(simpleCode(checks))
  const groupModule = `${group.imports}
import { strict as assert } from 'node:assert'
import { Block, Story } from 'foldkit'
import { Effect, Layer, Schema } from 'effect'
import { layer as groupLayer } from '@foldkit-visuals/fluid/checkbox-group'
import { SelectionBackgroundsBlock, test as selectionTest } from '@foldkit-visuals/fluid/selection-backgrounds'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
const target = createTargetMotionScope('generated-group')
const animateTarget = target.node
const animateHighlight = hoverHighlightAnimation(target)
const PageKey = Symbol('GeneratedChecks')
const Page = Block.make('GeneratedChecks', {
  key: PageKey, Model: Schema.Struct({ group: CheckboxGroupBlock.Model }),
  Message: Schema.Never, InitArgs: Schema.Tuple([]), view: { kind: 'Element' },
})
${group.setup}
const composition = Page.makeComposition({ bindings: [Group] })
const layer = Page.makeLayer({
  init: composition.makeInit(() => ({ model: {} })), update: composition.makeUpdate({}),
  view: composition.makeView((model, h) => { return ${group.view} }),
}).pipe(Layer.provide(groupLayer))
await Effect.runPromise(Story.story(
  { block: Page, layer }, Story.init(),
  Story.messageIn(Group, CheckboxGroupBlock.Message.CapturedClick({ index: 0 })),
  Story.model(model => {
    assert.deepEqual(model.group.checkedItems.filter(item => item.checked).map(item => item.index).toSorted(), [0, 1, 2])
    assert.deepEqual(model.group.checkedIndices.toSorted(), [0, 1, 2])
  }),
  Story.Command.resolve(selectionTest.SynchronizeClock, SelectionBackgroundsBlock.Message.CompletedClock()),
  Story.messageIn(Group, CheckboxGroupBlock.Message.CapturedKey({ index: 1, key: ' ' })),
  Story.model(model => {
    assert.deepEqual(model.group.checkedItems.filter(item => item.checked).map(item => item.index).toSorted(), [0, 2])
    assert.deepEqual(model.group.checkedIndices.toSorted(), [0, 2])
    assert.deepEqual(model.group.selection.runs.map(run => [run.start, run.end]), [[0, 0], [2, 2]])
  }),
  Story.Command.resolve(selectionTest.SynchronizeClock, SelectionBackgroundsBlock.Message.CompletedClock()),
))
`
  const files = [groupModule]
  for (const checked of [false, true]) {
    for (const indeterminate of [false, true]) {
      const generated = parts(simpleCode({ ...checkbox, checked, indeterminate }))
      files.push(`${generated.imports}
import { strict as assert } from 'node:assert'
import { Block } from 'foldkit'
import { Effect, Layer, Schema } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { layer as checkboxLayer } from '@foldkit-visuals/fluid/checkbox'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
const target = createTargetMotionScope('generated-checkbox')
const animateTarget = target.node
const PageKey = Symbol('GeneratedCheckbox')
const Page = Block.make('GeneratedCheckbox', {
  key: PageKey, Model: Schema.Struct({ checkbox: CheckboxBlock.Model }),
  Message: Schema.Never, InitArgs: Schema.Tuple([]), view: { kind: 'Document' },
})
${generated.setup}
const HostCheckbox = Checkbox.withOutMessagePolicy({ fold: Page.makeOutMessageFold(CheckboxBlock, { Changed: Page.makeNoopStep }) })
const composition = Page.makeComposition({ bindings: [HostCheckbox] })
const layer = Page.makeLayer({
  init: composition.makeInit(() => ({ model: {} })), update: composition.makeUpdate({}),
  view: composition.makeView((model, h) => ({ title: 'Generated checkbox', body: ${generated.view} })),
}).pipe(Layer.provide(checkboxLayer), Layer.provide(target.layer))
const { html } = await Effect.runPromise(renderToString({ block: Page, layer }, {}, { isHydratable: false }))
assert.match(html, /aria-checked="${indeterminate ? 'mixed' : checked}"/u)
${indeterminate || checked ? `assert.match(html, /d="${indeterminate ? 'M7 12H17' : 'M6 12L10 16L18 8'}"/u)` : 'assert.equal(html.includes("<path"), false)'}
`)
    }
  }
  for (const showDescription of [true, false]) {
    const generated = parts(simpleCode({ ...field, invalid: true, error: '', showDescription }))
    files.push(`${generated.imports}
import { strict as assert } from 'node:assert'
import { Block } from 'foldkit'
import { Effect, Layer, Schema } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { layer as inputLayer, makeInputFileResourcesLayer } from '@foldkit-visuals/fluid/input'
import { createInputMessageFileRegistry } from '@foldkit-visuals/fluid/input-message'
const PageKey = Symbol('GeneratedField')
const Page = Block.make('GeneratedField', {
  effects: Block.makeEffectsContract<never, Block.FactsOf<typeof InputBlock>['programRequirements']>(),
  key: PageKey, Model: Schema.Struct({ input: InputBlock.Model }),
  Message: Schema.Never, InitArgs: Schema.Tuple([]), view: { kind: 'Document' },
})
${generated.setup}
const HostInput = Input.withOutMessagePolicy({ fold: Page.makeOutMessageFold(InputBlock, { Changed: Page.makeNoopStep, FilesChanged: Page.makeNoopStep }) })
const composition = Page.makeComposition({ bindings: [HostInput] })
const layer = Page.makeLayer({
  init: composition.makeInit(() => ({ model: {} })), update: composition.makeUpdate({}),
  view: composition.makeView((model, h) => ({ title: 'Generated field', body: ${generated.view} })),
}).pipe(Layer.provide(inputLayer))
const registry = createInputMessageFileRegistry()
try {
  const { html } = await Effect.runPromise(renderToString({ block: Page, layer }, {}, { isHydratable: false }).pipe(Effect.provide(makeInputFileResourcesLayer(registry))))
  const input = html.match(/<input\\b[^>]*>/u)?.[0]
  assert.ok(input)
  ${showDescription ? `assert.match(input, /aria-describedby="field-input-description"/u)` : `assert.doesNotMatch(input, /aria-describedby=/u)`}
  assert.doesNotMatch(html, /id="field-input-error"/u)
} finally { registry.dispose() }
`)
  }
  try {
    for (const [index, source] of files.entries()) {
      writeFileSync(path.join(directory, `case-${index}.ts`), source)
    }
    writeFileSync(
      path.join(directory, 'tsconfig.json'),
      JSON.stringify({ extends: path.join(root, 'tsconfig.base.json'), include: ['*.ts'] }),
    )
    execFileSync(
      path.join(root, 'node_modules/.bin/tsrs'),
      ['--noEmit', '-p', path.join(directory, 'tsconfig.json')],
      { cwd: root, stdio: 'inherit' },
    )
    for (const [index] of files.entries()) {
      expect(() =>
        execFileSync('bun', [path.join(directory, `case-${index}.ts`)], {
          cwd: root,
          stdio: 'inherit',
        }),
      ).not.toThrow()
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}, 120000)
