import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Schema } from 'effect'
import {
  componentUseRules,
  designSystemRules,
  designSystemSettings,
} from './design-system-policy.ts'
import { prepareDesignSystemTheme } from './design-system-theme.ts'

const root = path.resolve(import.meta.dirname, '../..')
const h = `import type { HtmlBuilder } from 'foldkit/html';\nfunction render(h: HtmlBuilder<never>) {`
const button = `import { Button as Action } from '@foldkit-visuals/fluid/button';\n`
const fixtures = {
  'shadowed-direct': `${h} return h.div([h.Class('flex'), h.Class('grid')], []); }`,
  'shadowed-conditional-spread': `${h} return h.span([h.Class('text-sm'), ...(custom ? [] : [h.Class('text-xs')])], []); }`,
  'shadowed-array-alias': `${h} const attrs = [h.Class('flex')]; return h.div([...attrs, ...attrs], []); }`,
  'shadowed-local-helper': `${h} function attrs() { return [h.Class('flex')]; } return h.div([...attrs(), h.Class('grid')], []); }`,
  'shadowed-typed-helper': `${h} return h.div([...attrs(h), h.Class('grid')], []); } function attrs(builder: HtmlBuilder<never>) { return [builder.Class('flex')]; }`,
  'shadowed-inert-alias': `import { inertHtml as html } from 'foldkit/html'; const h = html; h.div([h.Class('flex'), h.Class('grid')], []);`,
  'shadowed-keyed': `${h} return h.keyed('div')('item', [h.Class('flex'), h.Class('grid')], []); }`,
  'shadowed-logical': `${h} const attrs = active && [h.Class('flex')]; return h.div([...(attrs || []), h.Class('grid')], []); }`,
  'valid-exclusive-classes': `${h} return h.div(active ? [h.Class('flex')] : [h.Class('grid')], []); }`,
  'valid-exclusive-spread': `${h} return h.div([...(active ? [h.Class('flex')] : [h.Class('grid')])], []); }`,
  'valid-nested-elements': `${h} return h.div([h.Class('flex')], [h.span([h.Class('grid')], [])]); }`,
  'valid-unrelated-class-api': `const h = {div: (attrs: unknown[]) => attrs, Class: (text: string) => text}; h.div([h.Class('flex'), h.Class('grid')]);`,
  'valid-raw-class-attribute': `${h} return h.div([h.Class('flex'), h.Attribute('class', 'grid')], []); }`,
  'valid-unknown-attrs': `${h} return h.div([...props.attributes, ...importedAttrs(), h.Class('flex')], []); }`,
  'valid-non-element-array': `${h} return [h.Class('flex'), h.Class('grid')]; }`,
  'valid-marker': `${h} return h.Class('showcase-grid reference-preview'); }`,
  'invalid-marker': `${h} return h.Class('site-customzier'); }`,
  'invalid-class': `${h} return h.Class('bg-red-500 bg-[#fa00fa] not-a-real-utility'); }`,
  'renamed-builder': `import type { HtmlBuilder as Builder } from 'foldkit/html'; function render(html: Builder<never>) { return html.Class('bg-red-500 bg-[#fa00fa] unknown-utility'); }`,
  'valid-classes': `${h} return h.Class('bg-background text-foreground p-4 scroll-fade ts-chart-tooltip__body'); }`,
  'valid-project-theme': `${h} return h.Class('text-site-body text-chart-label'); }`,
  'restyled-alias': `${button}${h} return Action({ children: [], className: 'hover:!bg-red-500 px-12 [padding:13px]' }, h); }`,
  'restyled-spread': `${button}${h} const style = {className: 'rounded-full'}; return Action({...style, children: []}, h); }`,
  'restyled-attributes': `${button}${h} return Action({children: [], attributes: [h.Class('p-12'), h.Style({fontSize: '30px'})]}, h); }`,
  'restyled-tabs': `import {TabsBlock as Tabs} from '@foldkit-visuals/fluid/tabs'; const Preview = Parent.makeRequiredFieldBinding(Tabs, {field: 'tabs'}).withOutMessagePolicy({}); Preview.embedView({model, viewInputs: {className: 'p-8'}});`,
  'restyled-generic-tabs': `import {Tabs} from '@foldkit/ui'; const NativeTabs = Tabs.makeBlock(Value); const Preview = Parent.makeRequiredFieldBinding(NativeTabs, {field: 'tabs'}); Preview.embedView({model, viewInputs: {className: 'p-8'}});`,
  'restyled-class-list': `${button}${h} return Action({children: [], className: cn(['px-4'], {'rounded-full': active})}, h); }`,
  'restyled-namespace': `import * as Fluid from '@foldkit-visuals/fluid/button'; ${h} return Fluid.Button({children: [], className: 'bg-background'}, h); }`,
  'valid-geometry': `${h} return h.Class('w-[213px] rounded-[13px] text-[length:var(--fs-body)] bg-[var(--accent)]'); }`,
  'valid-button': `${button}${h} return Action({variant: 'ghost', buttonSize: 'compact', className: 'w-full mt-2', children: []}, h); }`,
  'unrelated-component': `import {Button} from 'another-library'; Button({className: 'p-12'});`,
  'handmade-tabs': `${h} const html = h; return html.button([html.Role('tab')], ['Preview']); }`,
  'inferred-builder': `const view = Composition.makeView((model, html) => html.button([html.Role('tab')], ['Preview']));`,
  'inferred-inputs-builder': `const view = Composition.makeView.withInputs((model, inputs, html) => html.div([html.Role('listbox')], []));`,
  'namespace-builder': `import type * as Html from 'foldkit/html'; function render(h: Html.HtmlBuilder<never>) {return h.button([h.Role('tab')], [])}`,
  'attribute-role': `${h} return h.div([h.Attribute('role', 'listbox')], []); }`,
  'handmade-switch': `${h} return h.button([h.Role('switch')], []); }`,
  'native-checkbox': `${h} return h.input([h.Type('checkbox')]); }`,
  'valid-roles': `${h} return h.div([h.Role('tabpanel')], [h.p([h.Role('status')], ['Ready'])]); }`,
  'unrelated-role': `function render(h: {Role(value: string): string}) { return h.Role('tab'); }`,
} as const

const Diagnostic = Schema.Struct({
  filename: Schema.String,
  code: Schema.optional(Schema.String),
  message: Schema.String,
  severity: Schema.String,
})
const Report = Schema.Struct({ diagnostics: Schema.Array(Diagnostic) })
type Report = typeof Report.Type

let directory = ''
let diagnostics: Report['diagnostics'] = []

beforeAll(() => {
  prepareDesignSystemTheme(root)
  directory = mkdtempSync(path.join(root, '.verification/design-system-test-'))
  for (const [name, text] of Object.entries(fixtures))
    writeFileSync(path.join(directory, `${name}.ts`), text)
  const config = path.join(directory, 'oxlint.json')
  writeFileSync(
    config,
    JSON.stringify({
      categories: { correctness: 'off' },
      jsPlugins: [
        { name: 'shadcn', specifier: import.meta.resolve('@shadcn/lint').replace('file://', '') },
        {
          name: 'foldkit-design',
          specifier: path.join(root, 'scripts/policy/design-system-plugin.ts'),
        },
      ],
      settings: designSystemSettings,
      rules: { ...designSystemRules, ...componentUseRules },
    }),
  )
  const result = Bun.spawnSync(
    [
      path.join(root, 'node_modules/.bin/oxlint'),
      '--config',
      config,
      '--format',
      'json',
      '--no-ignore',
      ...Object.keys(fixtures).map((name) => path.join(directory, `${name}.ts`)),
    ],
    { cwd: root },
  )
  if (result.exitCode > 1) throw new Error(result.stderr.toString() + result.stdout.toString())
  expect(result.stderr.toString()).not.toContain('could not be built')
  expect(result.exitCode).toBe(1)
  diagnostics = Schema.decodeUnknownSync(Report)(JSON.parse(result.stdout.toString())).diagnostics
  expect(diagnostics.every((diagnostic) => diagnostic.severity === 'error')).toBe(true)
}, 30_000)

afterAll(() => {
  if (directory) rmSync(directory, { recursive: true, force: true })
})

const codesFor = (name: keyof typeof fixtures) =>
  diagnostics
    .filter((diagnostic) => path.basename(diagnostic.filename) === `${name}.ts`)
    .map((diagnostic) => diagnostic.code)

test('unregistered nearby hook spelling remains an unknown class', () => {
  expect(codesFor('invalid-marker')).toContain('shadcn(no-unknown-classes)')
  expect(
    diagnostics.find((item) => path.basename(item.filename) === 'invalid-marker.ts')?.message,
  ).toContain('site-customzier')
})

for (const name of ['invalid-class', 'renamed-builder'] as const) {
  test(`${name}: actual shadcn rules see invalid Foldkit class strings`, () => {
    expect(codesFor(name)).toContain('shadcn(no-raw-colors)')
    expect(codesFor(name)).toContain('shadcn(no-unknown-classes)')
    expect(codesFor(name)).toContain('shadcn(no-arbitrary-values)')
  })
}
for (const name of [
  'restyled-alias',
  'restyled-spread',
  'restyled-attributes',
  'restyled-tabs',
  'restyled-generic-tabs',
  'restyled-class-list',
  'restyled-namespace',
] as const) {
  test(`${name}: component appearance belongs to its component`, () => {
    expect(codesFor(name)).toContain('foldkit-design(no-restyle)')
  })
}
for (const name of [
  'handmade-tabs',
  'attribute-role',
  'handmade-switch',
  'inferred-builder',
  'inferred-inputs-builder',
  'namespace-builder',
] as const) {
  test(`${name}: native components own interaction contracts`, () => {
    expect(codesFor(name)).toContain('foldkit-design(use-components)')
  })
}
for (const name of [
  'shadowed-direct',
  'shadowed-conditional-spread',
  'shadowed-array-alias',
  'shadowed-local-helper',
  'shadowed-typed-helper',
  'shadowed-inert-alias',
  'shadowed-keyed',
  'shadowed-logical',
] as const) {
  test(`${name}: one Class attribute owns each element class recipe`, () => {
    expect(codesFor(name)).toEqual(['foldkit-design(no-shadowed-class)'])
  })
}
for (const name of [
  'valid-exclusive-classes',
  'valid-exclusive-spread',
  'valid-nested-elements',
  'valid-unrelated-class-api',
  'valid-raw-class-attribute',
  'valid-unknown-attrs',
  'valid-non-element-array',
  'valid-classes',
  'valid-project-theme',
  'valid-marker',
  'valid-button',
  'unrelated-component',
  'valid-roles',
  'unrelated-role',
  'native-checkbox',
  'valid-geometry',
] as const) {
  test(`${name}: valid composition and unrelated APIs pass`, () => {
    expect(codesFor(name)).toEqual([])
  })
}
