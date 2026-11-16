import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import type { DropdownResources } from '@foldkit-visuals/fluid/dropdown/environment'
import type { DialogResources } from '@foldkit-visuals/fluid/dialog'
import { homeRouter, selectionFamilyRouter } from './selection-family-routes.js'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { SelectBlock, layer as SelectLayer, createSelectLayer } from '@foldkit-visuals/fluid/select'
import type { SelectOption } from '@foldkit-visuals/fluid/select'
import { ComboboxBlock, layer as ComboboxLayer } from '@foldkit-visuals/fluid/combobox'
import { CommandMenuBlock, CommandMenuLayer } from '@foldkit-visuals/fluid/command-menu'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import './selection-family.css'
import { selectSourceProgram } from './selection-select-source.js'
import { comboboxSourceProgram } from './selection-combobox-source.js'
const fruitPreset = new URLSearchParams(window.location.search).get('preset') === 'select'
const sourcePreset = new URLSearchParams(window.location.search).get('preset') === 'source'
const componentItems = [
  'Accordion',
  'Badge',
  'Button',
  'Card',
  'CheckboxGroup',
  'ColorPicker',
  'Combobox',
  'Dialog',
  'Dropdown',
  'InputGroup',
  'RadioGroup',
  'Select',
  'Sidebar',
  'Slider',
  'Switch',
  'Table',
  'Tabs',
].map((label) => ({
  label,
  value: label.replaceAll(/(?<lower>[a-z])(?<upper>[A-Z])/gu, '$<lower>-$<upper>').toLowerCase(),
}))
const selectionItems = (): ReadonlyArray<SelectOption> => {
  if (fruitPreset) {
    return ['Apple', 'Banana', 'Cherry', 'Mango'].map((label) => ({
      label,
      value: label.toLowerCase(),
    }))
  }
  if (sourcePreset) {
    return ['Owner', 'Editor', 'Viewer', 'Guest'].map((label) => ({ value: label, label }))
  }
  return [
    { value: 'design', label: 'Design', group: 'Workspace' },
    { value: 'engineering', label: 'Engineering', group: 'Workspace' },
    { value: 'product', label: 'Product', group: 'Workspace' },
    { value: 'archive', label: 'Archived workspace', group: 'Other', disabled: true },
  ]
}
const items = selectionItems()
const initialSelection = sourcePreset ? 'Viewer' : 'design'
const initialCompactSelection = sourcePreset ? 'Viewer' : 'engineering'
const commands = [
  {
    value: 'new',
    label: 'New document',
    group: 'Create',
    shortcut: 'mod+n',
    keywords: ['write', 'page'],
  },
  { value: 'project', label: 'New project', group: 'Create', shortcut: 'mod+shift+p' },
  {
    value: 'search',
    label: 'Search workspace',
    group: 'Navigate',
    shortcut: 'mod+k',
    keywords: ['find'],
  },
  {
    value: 'settings',
    label: 'Settings',
    group: 'Navigate',
    description: 'Preferences',
    shortcut: 'mod+,',
  },
  { value: 'unavailable', label: 'Publish workspace', group: 'Workspace', disabled: true },
]
const Model = Schema.Struct({
  select: SelectBlock.Model,
  compact: SelectBlock.Model,
  combobox: ComboboxBlock.Model,
  multiple: ComboboxBlock.Model,
  commands: CommandMenuBlock.Model,
  last: Schema.String,
})
const Message = defineMessageUnion({})
const effects = Block.makeEffectsContract<never, DropdownResources | DialogResources>()
export const ChoicesExampleKey = Symbol('ChoicesExample')
export const ChoicesExampleBlock = Block.make('ChoicesExample', {
  key: ChoicesExampleKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})
const Definition = ChoicesExampleBlock
const Select = Definition.makeRequiredFieldBinding(SelectBlock, {
  field: 'select',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'team',
        items,
        defaultValue: fruitPreset ? '' : initialSelection,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) => Definition.makeFieldsStep(() => ({ last: () => `Select: ${value}` })),
    OpenChanged: Definition.makeNoopStep,
  }),
})
const Compact = Definition.makeRequiredFieldBinding(SelectBlock, {
  field: 'compact',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'compact-team',
        items,
        defaultValue: fruitPreset ? '' : initialCompactSelection,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) =>
      Definition.makeFieldsStep(() => ({ last: () => `Compact select: ${value}` })),
    OpenChanged: Definition.makeNoopStep,
  }),
})
const Combo = Definition.makeRequiredFieldBinding(ComboboxBlock, {
  field: 'combobox',
  init: {
    contextToArgs: () => [
      { ...exampleHoverConfig, id: 'search-team', items: sourcePreset ? componentItems : items },
    ],
  },
}).withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(ComboboxBlock, {
    Selected: ({ value }) =>
      Definition.makeFieldsStep(() => ({
        last: () => `Combobox: ${Option.getOrElse(value, () => 'cleared')}`,
      })),
    ValuesChanged: ({ values }) =>
      Definition.makeFieldsStep(() => ({ last: () => `Combobox: ${values.join(', ')}` })),
    CreateRequested: ({ query }) =>
      Definition.makeFieldsStep(() => ({ last: () => `Create requested: ${query}` })),
  }),
})
const RawMultiple = Definition.makeRequiredFieldBinding(ComboboxBlock, {
  field: 'multiple',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'multiple-teams',
        items: sourcePreset ? componentItems : items,
        multiple: true,
        hideSelected: !sourcePreset,
        allowCreate: !sourcePreset,
        defaultValue: sourcePreset ? ['button', 'combobox'] : ['design'],
      },
    ],
  },
})
const Multiple = RawMultiple.withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(ComboboxBlock, {
    Selected: Definition.makeNoopStep,
    ValuesChanged: ({ values }) =>
      Definition.makeFieldsStep(() => ({ last: () => `Teams: ${values.join(', ')}` })),
    CreateRequested: ({ query }) =>
      RawMultiple.requestAcceptCreated({
        item: { value: query.toLocaleLowerCase().replaceAll(/\s+/gu, '-'), label: query },
      }),
  }),
})
const Commands = Definition.makeRequiredFieldBinding(CommandMenuBlock, {
  field: 'commands',
  init: {
    contextToArgs: () => [
      { ...exampleHoverConfig, id: 'commands', items: commands, suggestions: ['new', 'search'] },
    ],
  },
}).withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(CommandMenuBlock, {
    Selected: ({ item }) =>
      Definition.makeFieldsStep(() => ({ last: () => `Command: ${item.label}` })),
    QueryChanged: Definition.makeNoopStep,
  }),
})
const Composition = Definition.makeComposition({
  bindings: [Select, Compact, Combo, Multiple, Commands],
})
const init = Composition.makeInit(() => ({ model: { last: 'Choose an item or run a command.' } }))
const update = Composition.makeUpdate({})
export const ChoicesExampleLayer = Layer.unwrap(
  Effect.sync(() => {
    const motion = createMotionScope('fluid-choices')
    const selectInputs = {
      ariaLabel: 'Team',
      placeholder: fruitPreset ? 'Select a fruit…' : 'Select…',
      animate: motion.node,
      name: 'team',
    }
    const multipleInputs = {
      animate: motion.node,
      ariaLabel: 'Choose teams',
      clearable: !sourcePreset,
      placeholder: sourcePreset ? 'Pick components…' : 'Add a team…',
    }
    const view = Composition.makeView((model, h) => ({
      title: 'Fluid choices & commands',
      body: h.main(
        [
          h.Class(
            'max-w-240 m-[0_auto] p-[40px_24px] [&_h1]:text-[26px] [&_h1]:mb-3 [&_section]:m-[28px_0] [&_h2]:text-[16px] [&_h2]:mb-3 [&_output]:block [&_output]:p-[12px_0] [&_output]:[color:var(--muted-foreground)]',
          ),
        ],
        [
          h.a([h.Href(homeRouter())], ['← All components']),
          h.h1([], ['Choices & commands']),
          h.a(
            [
              h.Href(
                sourcePreset ? '/selection-family.html' : '/selection-family.html?preset=source',
              ),
            ],
            [sourcePreset ? 'Workspace examples' : 'Original Fluid showcase presets'],
          ),
          h.p(
            [],
            [
              h.a(
                [h.Href(selectionFamilyRouter({ preset: 'source', component: 'select' }))],
                ['Original Select example'],
              ),
              ' · ',
              h.a(
                [h.Href(selectionFamilyRouter({ preset: 'source', component: 'combobox' }))],
                ['Original Combobox example'],
              ),
            ],
          ),
          h.p(
            [],
            [
              'Native keyboard navigation, disabled items, searching and retained selection acknowledgement.',
            ],
          ),
          h.section(
            [],
            [
              h.h2([], ['Select']),
              h.div(
                [h.Class('flex flex-wrap gap-5 [align-items:start]')],
                [
                  h.block(
                    Select.embedView({
                      slotId: model.select.id,
                      model: model.select,
                      viewInputs: sourcePreset
                        ? { ...selectInputs, className: 'w-[280px]' }
                        : selectInputs,
                    }),
                  ),
                  h.block(
                    Compact.embedView({
                      slotId: model.compact.id,
                      model: model.compact,
                      viewInputs: {
                        ariaLabel: 'Compact team',
                        placeholder: fruitPreset ? 'Select a fruit…' : 'Select…',
                        size: fruitPreset ? 'default' : 'compact',
                        shape: fruitPreset ? 'rounded' : 'pill',
                        animate: motion.node,
                        ...examplePresentation,
                      },
                    }),
                  ),
                ],
              ),
            ],
          ),
          h.section(
            [],
            [
              h.h2([], ['Combobox']),
              h.block(
                Combo.embedView({
                  slotId: model.combobox.id,
                  model: model.combobox,
                  viewInputs: {
                    animate: motion.node,
                    ariaLabel: 'Search teams',
                    clearable: true,
                    placeholder: 'Search teams…',
                    ...examplePresentation,
                  },
                }),
              ),
            ],
          ),
          h.section(
            [],
            [
              h.h2([], ['Multiple choices & creation']),
              h.block(
                Multiple.embedView({
                  slotId: model.multiple.id,
                  model: model.multiple,
                  viewInputs: sourcePreset
                    ? { ...multipleInputs, className: 'w-[280px]' }
                    : multipleInputs,
                }),
              ),
            ],
          ),
          h.section(
            [],
            [
              h.h2([], ['Command menu']),
              h.block(
                Commands.embedView({
                  slotId: model.commands.id,
                  model: model.commands,
                  viewInputs: {
                    animate: motion.node,
                    className: 'choices-command w-110 max-w-full [border:1px_solid_var(--border)]',
                    footer: h.div(
                      [h.Class('border-t border-border p-2 text-muted-foreground text-xs')],
                      ['↑↓ Navigate · Enter Select · Esc Clear'],
                    ),
                    ...examplePresentation,
                  },
                }),
              ),
            ],
          ),
          h.output([h.AriaLive('polite')], [model.last]),
        ],
      ),
    }))
    const implementation = { init, update, view }
    return ChoicesExampleBlock.makeLayer<typeof implementation>(implementation).pipe(
      Layer.provide(Layer.mergeAll(SelectLayer, ComboboxLayer, CommandMenuLayer)),
      Layer.provideMerge(motion.layer),
    )
  }),
)
const component = new URLSearchParams(window.location.search).get('component')
if (sourcePreset && component === 'select') {
  Runtime.run(selectSourceProgram(document.querySelector<HTMLElement>('#root')))
} else if (sourcePreset && component === 'combobox') {
  Runtime.run(comboboxSourceProgram(document.querySelector<HTMLElement>('#root')))
} else {
  const configuration = {
    block: ChoicesExampleBlock,
    layer: ChoicesExampleLayer,
    container: document.querySelector<HTMLElement>('#root'),
  }
  Runtime.run(
    Program.make(configuration).provide({
      services: createSelectLayer(document),
    }),
  )
}
