import { Boolean, Effect, Layer, Queue, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Button } from '@foldkit-visuals/fluid/button'
import { SelectBlock, layer as SelectLayer } from '@foldkit-visuals/fluid/select'
import {
  CommandMenuTabsBlock,
  CommandMenuTabsLayer,
  CommandMenuFilters,
} from '@foldkit-visuals/fluid/command-menu-tabs'
import type { DropdownResources } from '@foldkit-visuals/fluid/dropdown/environment'
import type { DialogResources } from '@foldkit-visuals/fluid/dialog'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { PresentationContext } from '@foldkit-visuals/fluid/presentation'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'

export const Options = Schema.Struct({ compact: Schema.Boolean, trailing: Schema.Boolean })
export type Options = typeof Options.Type
const choices = [
  { value: 'all', label: 'All' },
  { value: 'Actions', label: 'Actions' },
]
const sortChoices = [
  { value: 'default', label: 'Default' },
  { value: 'az', label: 'A to Z' },
]
const records = [
  { label: 'Zebra', group: 'Actions' },
  { label: 'Alpha', group: 'Actions' },
  { label: 'Home', group: 'Navigation' },
]
const Message = defineMessageUnion({ ClickedSize: {}, ClickedReset: {} })
const key = Symbol('CommandFiltersExample')
export const CommandFiltersExampleBlock = Block.make('CommandFiltersExample', {
  key,
  Model: Schema.Struct({
    compact: Schema.Boolean,
    trailing: Schema.Boolean,
    tabs: CommandMenuTabsBlock.Model,
    filter: SelectBlock.Model,
    sort: SelectBlock.Model,
  }),
  Message,
  InitArgs: Schema.Tuple([Options]),
  effects: Block.makeEffectsContract<never, DropdownResources | DialogResources>(),
  view: { kind: 'Document' },
})
const RawTabs = CommandFiltersExampleBlock.makeRequiredFieldBinding(CommandMenuTabsBlock, {
  field: 'tabs',
  init: {
    contextToArgs: () => [
      { id: 'filter-tabs', inputId: 'filter-search', tabs: choices, value: 'all' },
    ],
  },
})
const Tabs = RawTabs.withOutMessagePolicy({
  fold: CommandFiltersExampleBlock.makeOutMessageFold(CommandMenuTabsBlock, {
    ValueChanged: ({ value }) => RawTabs.requestConfigureValue({ value }),
  }),
})
const RawFilter = CommandFiltersExampleBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'filter',
  init: { contextToArgs: () => [{ id: 'filters-type', items: choices, value: 'all' }] },
})
const Filter = RawFilter.withOutMessagePolicy({
  fold: CommandFiltersExampleBlock.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) => RawFilter.requestConfigure({ items: choices, value }),
    OpenChanged: CommandFiltersExampleBlock.makeNoopStep,
  }),
})
const RawSort = CommandFiltersExampleBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'sort',
  init: { contextToArgs: () => [{ id: 'filters-sort', items: sortChoices, value: 'default' }] },
})
const Sort = RawSort.withOutMessagePolicy({
  fold: CommandFiltersExampleBlock.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) => RawSort.requestConfigure({ items: sortChoices, value }),
    OpenChanged: CommandFiltersExampleBlock.makeNoopStep,
  }),
})
const ObserveSizeKey = CommandFiltersExampleBlock.makeMountStream('ObserveSizeKey', {
  messages: [Message.ClickedSize],
})
const sizeKeyLayer = ObserveSizeKey.toLayer(
  Effect.succeed(({ element }) =>
    Stream.callback<typeof Message.ClickedSize.Type>((queue) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'F2') return
            event.preventDefault()
            Queue.offerUnsafe(queue, Message.ClickedSize())
          }
          element.ownerDocument.addEventListener('keydown', onKey)
          return () => element.ownerDocument.removeEventListener('keydown', onKey)
        }),
        (release) => Effect.sync(release),
      ),
    ),
  ),
)
const CommandFiltersExampleComposition = CommandFiltersExampleBlock.makeComposition({
  bindings: [Tabs, Filter, Sort],
  mounts: [ObserveSizeKey],
})
const motion = createMotionScope('command-filters-example')
export const commandFiltersLayer = CommandFiltersExampleBlock.makeLayer({
  init: CommandFiltersExampleComposition.makeInit((options: Options) => ({ model: options })),
  EffectsLayer: sizeKeyLayer,
  update: CommandFiltersExampleComposition.makeUpdate({
    ClickedSize: CommandFiltersExampleBlock.makeFieldsStep(() => ({ compact: Boolean.not })),
    ClickedReset: CommandFiltersExampleBlock.makeStep(() =>
      Update.combineSteps([
        RawFilter.requestConfigure({ items: choices, value: 'all' }),
        RawSort.requestConfigure({ items: sortChoices, value: 'default' }),
      ]),
    ),
  }),
  view: CommandFiltersExampleComposition.makeView((model, h) => {
    const context = createPresentationContext({
      size: model.compact ? 'compact' : 'default',
      shape: 'sharp',
      surface: 4,
      hoverMode: 'standard',
      reducedMotion: 'always',
      prefersReducedMotion: true,
      hasShapeProvider: true,
      hasSizeProvider: true,
      icons: { ...defaultIcons, plus: defaultIcons.settings },
    })
    const filters = (ambientContext: PresentationContext) =>
      CommandMenuFilters(
        {
          context: ambientContext,
          inTabsRow: model.trailing,
          children: (filterContext) => [
            h.output(
              [h.Id('filter-context'), h.Hidden(true)],
              [
                JSON.stringify({
                  size: filterContext().size,
                  shape: filterContext().shape,
                  surface: filterContext().surface,
                  hoverMode: filterContext().hoverMode,
                  reducedMotion: filterContext().reducedMotion,
                  prefersReducedMotion: filterContext().prefersReducedMotion,
                  hasShapeProvider: filterContext().hasShapeProvider,
                  hasSizeProvider: filterContext().hasSizeProvider,
                }),
              ],
            ),
            h.block(
              Filter.embedView({
                slotId: 'filter',
                model: model.filter,
                viewInputs: {
                  context: filterContext,
                  animate: motion.node,
                  variant: 'borderless',
                  ariaLabel: 'Filter commands',
                  icon: filterContext().icons.plus,
                  itemIconFor: () => filterContext().icons.plus,
                },
              }),
            ),
            h.block(
              Sort.embedView({
                slotId: 'sort',
                model: model.sort,
                viewInputs: {
                  context: filterContext,
                  animate: motion.node,
                  variant: 'borderless',
                  ariaLabel: 'Sort commands',
                },
              }),
            ),
            Button(
              {
                context: filterContext,
                variant: 'ghost',
                children: ['Reset'],
                leadingIcon: filterContext().icons.plus,
                attributes: [h.Id('filter-reset'), h.OnClick(Message.ClickedReset())],
              },
              h,
            ),
            Button(
              {
                context: filterContext,
                size: 'default',
                variant: 'ghost',
                children: ['Explicit default'],
                attributes: [h.Id('filter-explicit')],
              },
              h,
            ),
          ],
        },
        h,
      )
    const visible = records.filter(
      (row) =>
        (model.filter.value === 'all' || row.group === model.filter.value) &&
        (model.tabs.value === 'all' || row.group === model.tabs.value),
    )
    if (model.sort.value === 'az') visible.sort((a, b) => a.label.localeCompare(b.label))
    return {
      title: 'Command filter presentation',
      body: h.main(
        [
          h.Class(
            "p-6 max-w-275 [&_h1]:text-[28px] [&_h1]:leading-[34px] [&_h1]:[font-variation-settings:'wght'_550,'opsz'_18] [&_h1]:mb-2 [&_h2]:text-[16px] [&_h2]:leading-[22px] [&_h2]:[font-variation-settings:'wght'_550,'opsz'_18] [&_h2]:m-[16px_0_8px] [&_output]:text-[13px] [&_output]:leading-[20px]",
          ),
          h.OnMount(ObserveSizeKey()),
        ],
        [
          h.h1([], ['Command filter presentation']),
          Button(
            {
              context,
              variant: 'ghost',
              children: ['Toggle parent size'],
              attributes: [h.Id('toggle-size'), h.OnClick(Message.ClickedSize())],
            },
            h,
          ),
          h.input([h.Id('filter-search'), h.AriaLabel('Command search')]),
          model.trailing
            ? h.block(
                Tabs.embedView({
                  slotId: 'tabs',
                  model: model.tabs,
                  viewInputs: {
                    context,
                    animate: motion.node,
                    filters: (tabsContext) =>
                      h.div(
                        [],
                        [
                          filters(tabsContext),
                          Button(
                            {
                              context: tabsContext,
                              variant: 'ghost',
                              children: ['Ambient trailing'],
                              attributes: [h.Id('ambient-trailing')],
                            },
                            h,
                          ),
                        ],
                      ),
                  },
                }),
              )
            : filters(context),
          h.output([h.Id('filter-results')], [visible.map((row) => row.label).join(', ')]),
          h.output(
            [h.Id('filter-state')],
            [
              JSON.stringify({
                compact: model.compact,
                filter: model.filter.value,
                sort: model.sort.value,
              }),
            ],
          ),
        ],
      ),
    }
  }),
}).pipe(Layer.provide(Layer.mergeAll(CommandMenuTabsLayer, SelectLayer, motion.layer)))
