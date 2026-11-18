import { createTargetMotionScope } from '../../src/motion-target.js'
import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion } from 'foldkit/message'
import { ContextMenuBlock, layer as ContextMenuLayer } from '../../src/context-menu.js'
import { DropdownItem } from '../../src/dropdown-item.js'
import { DropdownSeparator } from '../../src/dropdown-parts.js'
import type { Presentation } from '../../src/presentation.js'
import { HoverMode } from '../../src/hover.js'

export interface ContextMenuExampleInputs extends Presentation {
  readonly label?: string
  readonly filteredFiles?: boolean
  readonly showShortcuts?: boolean
}
const actions = [
  { label: 'Open', shortcut: '↵' },
  { label: 'Duplicate', shortcut: '⌘D' },
  { label: 'Archive', shortcut: '⌘E' },
]
const key = Symbol('ContextMenuExample')
export const ContextMenuExampleBlock = Block.make('ContextMenuExample', {
  key,
  InitArgs: Schema.Tuple([Schema.String]),
  ChildInitContext: Schema.String,
  Model: Schema.Struct({ menu: ContextMenuBlock.Model, lastAction: Schema.String }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    RequestedDisabled: { disabled: Schema.Boolean },
    RequestedHoverMode: { mode: HoverMode },
  }),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof ContextMenuBlock>['programRequirements']
  >(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ContextMenuExampleInputs>() },
})
const Root = ContextMenuExampleBlock
const Menu = Root.makeRequiredFieldBinding(ContextMenuBlock, {
  field: 'menu',
  init: { contextToArgs: (id: string) => [{ id }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(ContextMenuBlock, {
    Events: ({ events }) =>
      Root.makeFieldsStep((model) => ({
        lastAction: () => {
          const selected = events.find((event) => event._tag === 'Selected')
          return selected === undefined
            ? model.lastAction
            : (actions[Number(selected.index)]?.label ?? model.lastAction)
        },
      })),
  }),
})
const Composition = Root.makeComposition({ bindings: [Menu] })
export const layer = Layer.suspend(() => {
  const motion = createTargetMotionScope('context-menu-example')
  return Root.makeLayer({
    init: Composition.makeInit((id) => ({ childInitContext: id, model: { lastAction: '' } })),
    update: Composition.makeUpdate({}),
    inMessageUpdate: Composition.makeInMessageUpdate({
      RequestedDisabled: Root.makeStep.fromMessage(({ disabled }) =>
        Menu.requestDisabled({ disabled }),
      ),
      RequestedHoverMode: Root.makeStep.fromMessage(({ mode }) => Menu.requestHoverMode({ mode })),
    }),
    view: Composition.makeView.withInputs((model, inputs, h) =>
      h.div(
        [h.Class('w-full')],
        [
          h.block(
            Menu.embedView({
              slotId: 'menu',
              model: model.menu,
              viewInputs: {
                ...inputs,
                animate: motion.node,
                ...(inputs.filteredFiles ? { filter: '[data-context-file]' } : {}),
                trigger: (attributes) =>
                  h.div(
                    [
                      ...attributes,
                      h.Class(
                        'flex min-h-40 w-full items-center justify-center border border-dashed border-border rounded-xl p-6 text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      ),
                    ],
                    inputs.filteredFiles
                      ? [
                          'Right-click a file',
                          ...['README.md', 'design.fig', 'notes.txt'].map((name) =>
                            h.button(
                              [
                                h.Type('button'),
                                h.DataAttribute('context-file', name),
                                h.Class(
                                  'mx-1 rounded-md border border-border px-2 py-1 hover:bg-hover',
                                ),
                              ],
                              [name],
                            ),
                          ),
                        ]
                      : [inputs.label ?? 'Right-click here'],
                  ),
                content: (menu) => [
                  ...actions.map((action, index) =>
                    DropdownItem(
                      {
                        index,
                        label: action.label,
                        animate: motion.node,
                        children:
                          inputs.showShortcuts === false
                            ? []
                            : [
                                h.span(
                                  [h.Class('ml-auto text-xs text-muted-foreground')],
                                  [action.shortcut],
                                ),
                              ],
                      },
                      menu,
                      h,
                    ),
                  ),
                  DropdownSeparator({}, h),
                  DropdownItem(
                    { index: 3, label: 'Delete', disabled: true, animate: motion.node },
                    menu,
                    h,
                  ),
                ],
              },
            }),
          ),
          h.p(
            [h.Class('text-site-caption text-muted-foreground mt-3'), h.AriaLive('polite')],
            [
              model.lastAction === ''
                ? 'Use right-click, Shift+F10, or a long press.'
                : `${model.lastAction} selected`,
            ],
          ),
        ],
      ),
    ),
  }).pipe(Layer.provide(Layer.merge(ContextMenuLayer, motion.layer)))
})
