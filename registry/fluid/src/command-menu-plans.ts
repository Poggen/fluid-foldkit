// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Array as EffectArray, Layer, Option, Predicate } from 'effect'
import type { Block } from 'foldkit'
import { Update } from 'foldkit'
import { VirtualList } from '@foldkit/ui'
import { commandGroupKey, commandGroups } from './command-menu-virtual.js'
import { childAttributes } from 'foldkit/html'
import { ScrollAreaBlock, layer as ScrollAreaLayer } from './scroll-area.js'
import { HoverBlock, layer as HoverLayer } from './hover.js'
import { HoverHighlightBlock, layer as HoverHighlightLayer } from './hover-highlight.js'
import { resolvePresentation } from './presentation.js'
import { spring } from './lib/springs.js'
import { popupShape } from './lib/shape.js'
import { cn } from './lib/utils.js'
import { commandMenuVirtualPlans } from './command-menu-virtual-plans.js'
import { commandMenuItemView } from './command-menu-item-content.js'
import { defaultCommandMenuFilter, commandMenuRows } from './command-menu-contracts.js'
import type {
  CommandMenuConfig,
  CommandMenuOptions,
  CommandMenuItem,
} from './command-menu-contracts.js'
import { commandMenuContract, Observe, ObserveLayer } from './command-menu-definition.js'

export const commandMenuPlans = <const Key extends symbol>(
  CommandMenuBlock: ReturnType<typeof Block.make<'CommandMenu', Key, typeof commandMenuContract>>,
  options: CommandMenuOptions,
) => {
  const { Model, Message, OutMessage, InMessage } = commandMenuContract
  const filter = options.filter ?? defaultCommandMenuFilter

  const rowsFor = (model: typeof Model.Type) =>
    commandMenuRows(model.items, model.query, model.suggestions, model.suggestionsLabel, filter)

  const activeIndexFor = (model: typeof Model.Type, rows: ReadonlyArray<CommandMenuItem>) => {
    const first = rows.findIndex((item) => item.disabled !== true)
    return Option.getOrNull(model.activeIndex) ?? (first === -1 ? null : first)
  }

  const Scroll = CommandMenuBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
    field: 'scroll',
    init: { contextToArgs: (config: CommandMenuConfig) => [{ id: `${config.id}-scroll` }] },
  }).withOutMessagePolicy({
    fold: CommandMenuBlock.makeOutMessageFold(ScrollAreaBlock, {
      Scrolled: CommandMenuBlock.makeNoopStep,
    }),
  })

  const Highlight = CommandMenuBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
    field: 'highlight',
    init: {
      contextToArgs: (config: CommandMenuConfig) => [
        { id: `${config.id}-highlight`, mode: config.hoverMode ?? 'fluid' },
      ],
    },
  })

  const Hover = CommandMenuBlock.makeRequiredFieldBinding(HoverBlock, {
    field: 'hover',
    init: {
      contextToArgs: (config: CommandMenuConfig) => [
        { id: `${config.id}-list`, mode: config.hoverMode ?? 'fluid' },
      ],
    },
  }).withOutMessagePolicy({
    fold: CommandMenuBlock.makeOutMessageFold(HoverBlock, {
      Changed: (snapshot) =>
        CommandMenuBlock.makeStep((model) => {
          const first = rowsFor(model).findIndex((item) => item.disabled !== true)

          const activeIndex =
            snapshot.activeIndex ??
            Option.getOrNull(model.activeIndex) ??
            (first === -1 ? null : first)

          return Update.combineSteps([
            CommandMenuBlock.makeFieldsStep(() => ({
              activeIndex: () => Option.fromNullOr(activeIndex),
            })),
            Highlight.informOfSource({
              snapshot: { ...snapshot, activeIndex },
              hidden: false,
              mode: model.hover.mode,
            }),
          ])
        }),
    }),
  })

  const {
    Lists,
    synchronizeLists,
    revealActive: revealVirtualActive,
  } = commandMenuVirtualPlans(CommandMenuBlock, rowsFor)

  const revealActive = CommandMenuBlock.makeStep((model) =>
    model.virtualized && Option.contains(model.activeIndex, 0)
      ? Scroll.requestScroll({ left: 0, top: 0 })
      : revealVirtualActive,
  )

  const CommandMenuComposition = CommandMenuBlock.makeComposition({
    bindings: [Hover, Highlight, Scroll, Lists],
    mounts: [Observe],
  })

  const init = CommandMenuComposition.makeInit((config: CommandMenuConfig) => ({
    childInitContext: config,
    model: {
      id: config.id,
      virtualized: config.virtualized ?? false,
      virtualLists: {},
      items: config.items,
      query: config.query ?? config.defaultQuery ?? '',
      defaultQuery: config.defaultQuery ?? '',
      controlled: config.query !== undefined,
      suggestions: config.suggestions ?? [],
      suggestionsLabel: config.suggestionsLabel ?? 'Suggestions',
      activeIndex: Option.none(),
      height: Option.none(),
      mac: config.platform === 'mac',
    },
    steps: [synchronizeLists],
  }))

  const selectValue = (value: string) =>
    CommandMenuBlock.makeStep((model) => {
      const item = model.items.find((entry) => entry.value === value)

      return item === undefined || item.disabled === true
        ? { model }
        : { model, outMessage: OutMessage.Selected({ item }) }
    })

  const update = CommandMenuComposition.makeUpdate({
    ObservedPlatform: (model, { mac }) => ({ model: modifyFields(model, { mac: () => mac }) }),
    ObservedHeight: (model, { height }) => ({
      model: Option.contains(model.height, height)
        ? model
        : modifyFields(model, { height: () => Option.some(height) }),
    }),
    RequestedQuery: CommandMenuBlock.makeStep(
      (model, { query }: typeof Message.RequestedQuery.Type) => {
        const nextQuery = model.controlled ? model.query : query

        const rows = commandMenuRows(
          model.items,
          nextQuery,
          model.suggestions,
          model.suggestionsLabel,
          filter,
        )

        const first = rows.findIndex((item) => item.disabled !== true)

        const steps = Update.combineSteps([
          CommandMenuBlock.makeFieldsStep(() => ({
            query: () => nextQuery,
            activeIndex: () => (first === -1 ? Option.none() : Option.some(first)),
          })),
          synchronizeLists,
          revealActive,
          Hover.requestHighlight({ index: first === -1 ? null : first }),
        ])

        return (registered: Parameters<typeof steps>[0]) =>
          Update.withOutMessage(steps(registered), OutMessage.QueryChanged({ query }))
      },
    ),
    RequestedMove: CommandMenuBlock.makeStep(
      (model, { direction }: typeof Message.RequestedMove.Type) => {
        const rows = rowsFor(model)
        const enabled = rows.flatMap((item, index) => (item.disabled === true ? [] : [index]))

        const current = Option.match(model.activeIndex, {
          onNone: () => -1,
          onSome: (index) => enabled.indexOf(index),
        })

        let position: number

        if (direction === 'first') {
          position = 0
        } else if (direction === 'last') {
          position = enabled.length - 1
        } else if (direction === 'next') {
          position = (current + 1) % enabled.length
        } else {
          position =
            current < 0 ? enabled.length - 1 : (current - 1 + enabled.length) % enabled.length
        }

        const index = enabled[position] ?? null

        return Update.combineSteps([
          CommandMenuBlock.makeFieldsStep(() => ({ activeIndex: () => Option.fromNullOr(index) })),
          revealActive,
          Hover.requestHighlight({ index }),
        ])
      },
    ),
    Entered: CommandMenuBlock.makeStep((model) => {
      const rows = rowsFor(model)
      const index = activeIndexFor(model, rows)
      const item = index === null ? undefined : rows[index]

      return item === undefined ? CommandMenuBlock.makeNoopStep() : selectValue(item.value)
    }),
    RequestedSelect: CommandMenuBlock.makeStep(
      (_model, { value }: typeof Message.RequestedSelect.Type) => selectValue(value),
    ),
  })

  const inMessageUpdate = CommandMenuComposition.makeInMessageUpdate({
    RequestedHoverMode: CommandMenuBlock.makeStep(
      (_model, { mode }: typeof InMessage.RequestedHoverMode.Type) =>
        Hover.requestConfigure({
          options: { mode, axis: 'y', nearest: true, gapClick: true, maxDistance: Infinity },
        }),
    ),
    RequestedRetire: CommandMenuBlock.makeStep((model) =>
      Update.combineSteps([
        Hover.requestHighlight({ index: null }),
        Scroll.requestScroll({ left: 0, top: 0 }),
        CommandMenuBlock.makeFieldsStep(() => ({
          query: () => (model.controlled ? model.query : model.defaultQuery),
          activeIndex: () => Option.none(),
          height: () => Option.none(),
        })),
        synchronizeLists,
      ]),
    ),
    RequestedConfigure: CommandMenuBlock.makeStep(
      (model, { items, query }: typeof InMessage.RequestedConfigure.Type) => {
        const nextQuery = Option.getOrElse(query, () => model.query)

        const rows = commandMenuRows(
          items,
          nextQuery,
          model.suggestions,
          model.suggestionsLabel,
          filter,
        )

        const first = rows.findIndex((item) => item.disabled !== true)

        return Update.combineSteps([
          CommandMenuBlock.makeFieldsStep(() => ({
            items: () => items,
            query: () => nextQuery,
            controlled: () => Option.isSome(query),
            activeIndex: () => (first === -1 ? Option.none() : Option.some(first)),
          })),
          synchronizeLists,
          revealActive,
          Hover.requestHighlight({ index: first === -1 ? null : first }),
        ])
      },
    ),
  })

  const view = CommandMenuComposition.makeView.withInputs((model, inputs, h) => {
    const { className, ...contentInputs } = inputs
    const { size, icons, reducedMotion, shape } = resolvePresentation(inputs)
    const rows = rowsFor(model)
    const groups = commandGroups(rows)
    const active = activeIndexFor(model, rows)

    const input = h.input([
      h.Id(`${model.id}-input`),
      h.Type('text'),
      h.Role('combobox'),
      h.AriaExpanded(true),
      h.AriaControls(`${model.id}-list`),
      h.AriaAutocomplete('list'),
      ...(active === null ? [] : [h.AriaActiveDescendant(`${model.id}-item-${active}`)]),
      h.Autocomplete('off'),
      h.Autocorrect('off'),
      h.Spellcheck(false),
      h.Value(model.query),
      h.Placeholder(inputs.placeholder ?? 'Type a command or search…'),
      h.Class(
        cn(
          'min-w-0 flex-1 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
          size.variant === 'compact'
            ? 'text-[length:var(--fs-subtitle-compact,13px)] leading-5'
            : 'text-[length:var(--fs-subtitle,14px)] leading-6',
        ),
      ),
      h.OnInput((query) => Message.RequestedQuery({ query })),
    ])

    const list = h.block(
      Hover.embedView({
        slotId: model.hover.id,
        model: model.hover,
        viewInputs: {
          className:
            'relative flex flex-col gap-1 p-1 outline-none data-[empty]:justify-center data-[empty]:p-0',
          attributes: childAttributes([
            h.Role('listbox'),
            ...(rows.length === 0 ? [h.DataAttribute('empty', '')] : []),
          ]),
          content: (hover) => {
            const row = (item: CommandMenuItem) =>
              commandMenuItemView(
                {
                  item,
                  index: rows.indexOf(item),
                  active,
                  id: model.id,
                  total: rows.length,
                  virtualized: model.virtualized,
                  inputs: { ...contentInputs, mac: inputs.mac ?? model.mac },
                  attributes: childAttributes(
                    hover.itemAttributes(rows.indexOf(item), item.disabled === true),
                  ),
                  select: (value) => Message.RequestedSelect({ value }),
                },
                h,
              )
            return [
              h.block(
                Highlight.embedView({
                  slotId: model.highlight.id,
                  model: model.highlight,
                  viewInputs: {
                    className: popupShape(shape.variant).bg,
                    mode: model.hover.mode,
                    animate: (node, present, rect, reduce) =>
                      inputs.animate(node, {
                        initial: false,
                        animate: { ...rect, opacity: 1 },
                        exit: { opacity: 0 },
                        present,
                        transition: reduce ? { duration: 0 } : spring.moderate,
                      }),
                  },
                }),
              ),
              ...EffectArray.match(rows, {
                onEmpty: () => [
                  h.div(
                    [
                      h.Class(
                        'px-3 py-6 text-center text-muted-foreground min-h-(--fluid-results-height,64px)',
                      ),
                      h.DataAttribute('fluid-empty-results', ''),
                    ],
                    [inputs.emptyText ?? 'No results found.'],
                  ),
                ],
                onNonEmpty: () => [],
              }),
              ...Array.from(groups, ([heading, items], groupIndex) =>
                h.div(
                  [
                    h.Role('group'),
                    h.Class('flex flex-col'),
                    ...(heading === undefined
                      ? []
                      : [h.AriaLabelledBy(`${model.id}-group-${groupIndex}`)]),
                  ],
                  [
                    ...(heading === undefined
                      ? []
                      : [
                          h.div(
                            [
                              h.Id(`${model.id}-group-${groupIndex}`),
                              h.Role('presentation'),
                              h.Class(
                                `flex shrink-0 items-center text-muted-foreground ${size.variant === 'compact' ? 'h-6 px-1.5' : 'h-7 px-2'} ${size.type.caption}`,
                              ),
                            ],
                            [heading],
                          ),
                        ]),
                    ...(model.virtualized
                      ? (() => {
                          const key = commandGroupKey(heading)
                          const list = model.virtualLists[key]
                          return list === undefined
                            ? []
                            : [
                                h.block(
                                  Lists.embedView({
                                    key,
                                    slotId: list.id,
                                    model: list,
                                    viewInputs: {
                                      items,
                                      itemToKey: (item) => item.value,
                                      itemToView: row,
                                      dynamicRowHeights: true,
                                      overscan: 3,
                                      containerElement: 'div',
                                      rowElement: 'div',
                                      containerAttributes: childAttributes([
                                        h.Role('presentation'),
                                      ]),
                                      itemToAttributes: () =>
                                        childAttributes([h.Role('presentation')]),
                                    },
                                  }),
                                ),
                              ]
                        })()
                      : items.map(row)),
                  ],
                ),
              ),
            ]
          },
        },
      }),
    )

    return h.div(
      [
        h.Id(model.id),
        h.DataAttribute('in-dialog', String(inputs.inDialog ?? false)),
        h.DataAttribute('virtualized', String(model.virtualized)),
        h.OnMount(Observe()),
        h.Class(cn('relative w-full max-h-[inherit] overflow-hidden', className)),
      ],
      [
        inputs.animate(
          h.div(
            [h.Class('max-h-[inherit] overflow-hidden')],
            [
              h.div(
                [
                  h.DataAttribute('command-column', ''),
                  h.Class('flex max-h-[inherit] min-h-0 flex-col'),
                ],
                [
                  h.div(
                    [
                      h.Class(
                        cn(
                          'group/command-input flex shrink-0 items-center',
                          size.variant === 'compact' ? 'h-10 gap-2 px-3' : 'h-12 gap-2.5 px-4',
                        ),
                      ),
                    ],
                    [
                      ...(inputs.inputIcon === null
                        ? []
                        : [
                            (inputs.inputIcon ?? icons.search)(
                              {
                                size: size.icon,
                                strokeWidth: 1.5,
                                className:
                                  'shrink-0 text-muted-foreground transition-[color,stroke-width] duration-80 group-focus-within/command-input:text-foreground group-focus-within/command-input:stroke-[2]',
                              },
                              h,
                            ),
                          ]),
                      input,
                    ],
                  ),
                  ...(inputs.header === undefined ? [] : [inputs.header()]),
                  h.block(
                    Scroll.embedView({
                      slotId: 'scroll',
                      model: model.scroll,
                      viewInputs: {
                        ...inputs,
                        className:
                          'scroll-divider flex min-h-0 flex-1 flex-col border-t border-border/60 [&::before]:!-top-px [&:last-child::after]:!hidden',
                        viewportClassName:
                          'min-h-0 flex-1 [&>div[style]]:!block [&>div[style]]:!min-w-0 [--scroll-fade-size:32px] scroll-fade',
                        children: [],
                        content: () => [list],
                      },
                    }),
                  ),
                  ...(inputs.footer === undefined
                    ? []
                    : [
                        Predicate.isFunction(inputs.footer)
                          ? inputs.footer(
                              active === null ? undefined : rows[active],
                              inputs.mac ?? model.mac,
                            )
                          : inputs.footer,
                      ]),
                ],
              ),
            ],
          ),
          {
            initial: false,
            animate: Option.match(model.height, {
              onNone: () => ({}),
              onSome: (height) => ({ height }),
            }),
            transition: spring.moderate,
            reducedMotion,
          },
        ),
      ],
    )
  })

  return { init, update, inMessageUpdate, view, EffectsLayer: ObserveLayer }
}

export const commandMenuChildrenLayer = Layer.mergeAll(
  ScrollAreaLayer,
  HoverLayer,
  HoverHighlightLayer,
  VirtualList.layer,
)
