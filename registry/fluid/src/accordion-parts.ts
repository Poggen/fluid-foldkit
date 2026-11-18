import { sourceStyleAttributes } from './lib/source-style-attributes.js'
/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { Predicate } from 'effect'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { accordionTriggerId } from './accordion-identifiers.js'
import { cn } from './lib/utils.js'
import { fontWeights } from './lib/font-weight.js'
import { spring } from './lib/springs.js'
import { hoverItemAttributes } from './hover.js'
import type { MotionOptions } from './motion.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { accordionPanelMotion } from './accordion-panel-motion.js'
import { accordionMotionUpdate } from './accordion-observer.js'
import type { AccordionItemState, AccordionTint } from './accordion-state.js'

const scopeItem: <Message, Requirements>(
  props: AccordionItemProps<Message, Requirements>,
  item: AccordionItemState | undefined,
  open: boolean,
) => AccordionItemState = function scopeItem<Message, Requirements>(
  props: AccordionItemProps<Message, Requirements>,
  item: AccordionItemState | undefined,
  open: boolean,
) {
  const ownDisabled = props.disabled ?? item?.disabled ?? false
  const highlight = props.highlight ?? item?.highlight ?? 'item'

  return {
    value: props.value,
    index: props.index ?? item?.index ?? null,
    disabled: ownDisabled,
    highlight,
    open,
    initialOpen: item?.initialOpen ?? open,
    triggerId: item?.triggerId ?? null,
    toggling: item?.toggling ?? false,
    hidden: item?.hidden ?? !open,
    generation: item?.generation ?? 0,
  } satisfies AccordionItemState
}

export const AccordionItem: <Message, Requirements>(
  props: NoInfer<AccordionItemProps<Message, Requirements>>,
  context: NoInfer<AccordionContext<ItemMountAttribute<Message, Requirements>>>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function AccordionItem<Message, Requirements>(
  props: NoInfer<AccordionItemProps<Message, Requirements>>,
  context: NoInfer<AccordionContext<ItemMountAttribute<Message, Requirements>>>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const item = itemFor(context, props.value)
  const open = item?.open ?? context.values.includes(props.value)
  const scopedItem = scopeItem(props, item, open)
  const ownDisabled = scopedItem.disabled
  const disabled = context.disabled || ownDisabled
  const { highlight } = scopedItem
  const { shape } = resolvePresentation(context)
  const tint = context.tints.find((slot) => slot.value === props.value)

  const scoped = {
    ...context,
    items: context.items.some((row) => row.value === props.value)
      ? context.items.map((row) => (row.value === props.value ? scopedItem : row))
      : [...context.items, scopedItem],
  }

  const children = Predicate.isFunction(props.children)
    ? props.children(scoped)
    : (props.children ?? [])

  return h.keyed('div')(
    props.value,
    [
      h.DataAttribute('accordion-item', props.value),
      h.DataAttribute('accordion-highlight', highlight),
      h.DataAttribute('accordion-own-disabled', String(ownDisabled)),
      ...(scopedItem.index === null
        ? []
        : [h.DataAttribute('accordion-index', String(scopedItem.index))]),
      ...(disabled ? [h.DataAttribute('disabled', '')] : []),
      h.DataAttribute(open ? 'open' : 'closed', ''),
      h.DataAttribute('index', String(context.items.findIndex((row) => row.value === props.value))),
      ...(open ? [] : [h.DataAttribute('hidden', '')]),
      h.DataAttribute('orientation', context.orientation),
      h.Class(cn(!context.grouped && 'relative', props.className)),
      ...(props.attributes ?? []),
    ],
    [
      !context.grouped && highlight === 'item' && tint
        ? context.animate(
            h.keyed('div')('expanded', [
              h.Class(
                cn(
                  'opacity-[0]',
                  `absolute inset-0 ${shape.bg} bg-accent/20 dark:bg-accent/12 pointer-events-none`,
                ),
              ),
              ...context.tintAttributes(tint.value, tint.generation, false),
            ]),
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0, transition: spring.moderate.exit },
              transition: { duration: 0.12 },
              present: tint.present,
            },
          )
        : null,
      ...children,
    ],
  ) satisfies Html
}

const renderTriggerOverlay: <Message, Requirements>(
  props: AccordionPartProps<Message, Requirements>,
  context: AccordionContext<ItemMountAttribute<Message, Requirements>>,
  h: HtmlBuilder<Message, Requirements>,
  trigger: Html,
) => Html = function renderTriggerOverlay<Message, Requirements>(
  props: AccordionPartProps<Message, Requirements>,
  context: AccordionContext<ItemMountAttribute<Message, Requirements>>,
  h: HtmlBuilder<Message, Requirements>,
  trigger: Html,
) {
  const { shape } = resolvePresentation(context)
  const item = itemFor(context, props.value)

  const hover = context.hovered.find((slot) => slot.value === props.value)
  const tint = context.tints.find((slot) => slot.value === props.value)

  const overlay = (slot: AccordionTint, accent: boolean) => {
    if (!accent && context.hoverMode === 'standard') {
      return slot.present
        ? h.keyed('div')('hover', [
            h.Class(`absolute inset-0 ${shape.bg} bg-hover pointer-events-none`),
          ])
        : null
    }
    return context.animate(
      h.keyed('div')(accent ? 'expanded' : 'hover', [
        h.Class(
          cn(
            'opacity-[0]',
            `absolute inset-0 ${shape.bg} ${accent ? 'bg-accent/20 dark:bg-accent/12' : 'bg-hover'} pointer-events-none`,
          ),
        ),
        ...context.tintAttributes(slot.value, slot.generation, !accent),
      ]),
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: accent ? spring.moderate.exit : spring.fast.exit },
        transition: { duration: accent ? 0.12 : 0.08 },
        present: slot.present,
      },
    )
  }

  return h.div(
    [
      ...context.itemMount,
      h.Class('relative'),
      h.DataAttribute('accordion-trigger-wrapper', props.value),
    ],
    [
      (item?.highlight ?? 'item') === 'trigger' &&
      tint &&
      (!tint.present || context.pointerValue === props.value)
        ? overlay(tint, true)
        : null,
      hover ? overlay(hover, false) : null,
      trigger,
    ],
  ) satisfies Html
}

export const AccordionTrigger: <Message, Requirements>(
  props: NoInfer<AccordionPartProps<Message, Requirements>>,
  context: NoInfer<AccordionContext<ItemMountAttribute<Message, Requirements>>>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function AccordionTrigger<Message, Requirements>(
  props: NoInfer<AccordionPartProps<Message, Requirements>>,
  context: NoInfer<AccordionContext<ItemMountAttribute<Message, Requirements>>>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const { size, shape, icons, reducedMotion } = resolvePresentation(context)
  const item = itemFor(context, props.value)
  const open = item?.open ?? context.values.includes(props.value)
  const disabled = context.disabled || (item?.disabled ?? false)

  const index = item?.index ?? null

  const active = context.grouped
    ? index !== null && context.activeIndex === index
    : context.pointerValue === props.value

  const state = [
    ...(open ? [h.DataAttribute('panel-open', '')] : []),
    h.DataAttribute('index', String(context.items.findIndex((row) => row.value === props.value))),
    ...(open ? [] : [h.DataAttribute('hidden', '')]),
  ]

  const trigger = context.disclosure(
    {
      value: props.value,
      isOpen: open,
      disabled,
    },
    ({ button }) =>
      h.div(
        [
          h.DataAttribute('orientation', context.orientation),
          ...(disabled ? [h.DataAttribute('disabled', '')] : []),
          h.DataAttribute(open ? 'open' : 'closed', ''),
          h.DataAttribute(
            'index',
            String(context.items.findIndex((row) => row.value === props.value)),
          ),
          ...(open ? [] : [h.DataAttribute('hidden', '')]),
        ],
        [
          h.button(
            [
              ...button,
              h.DataAttribute('accordion-trigger', props.value),
              ...state,
              h.DataAttribute('orientation', context.orientation),
              h.Class(
                cn(
                  `relative z-10 flex items-center ${size.gap} ${shape.item} ${size.px} ${size.variant === 'compact' ? 'py-1' : 'py-2'} w-full cursor-pointer outline-none select-none`,
                  !context.grouped &&
                    'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] focus-visible:ring-offset-0',
                  props.className,
                ),
              ),
              ...(props.attributes ?? []),
            ],
            [
              h.span(
                [h.Class(cn('inline-grid flex-1 text-left', size.text))],
                [
                  h.span(
                    [
                      h.Class('col-start-1 row-start-1 invisible'),
                      h.AriaHidden(true),
                      h.Style({ fontVariationSettings: fontWeights.semibold }),
                    ],
                    props.children,
                  ),
                  h.span(
                    [
                      h.Class(
                        cn(
                          'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80',
                          open || active ? 'text-foreground' : 'text-muted-foreground',
                        ),
                      ),
                      h.Style({
                        fontVariationSettings: open ? fontWeights.semibold : fontWeights.normal,
                      }),
                    ],
                    props.children,
                  ),
                ],
              ),
              context.animate(
                h.span(
                  [
                    h.Class('shrink-0 inline-flex items-center justify-center'),
                    h.Style({
                      transform: (item?.initialOpen ?? open) ? 'rotate(90deg)' : 'none',
                    }),
                  ],
                  [
                    icons['chevron-right'](
                      {
                        size: size.icon,
                        strokeWidth: open || active ? 2 : 1.5,
                        className: cn(
                          'transition-[color,stroke-width] duration-80',
                          open || active ? 'text-foreground' : 'text-muted-foreground',
                        ),
                      },
                      h,
                    ),
                  ],
                ),
                { animate: { rotate: open ? 90 : 0 }, transition: spring.fast, reducedMotion },
              ),
            ],
          ),
        ],
      ),
  )

  if (context.grouped) {
    return h.div(
      [
        ...context.itemMount,
        ...(index === null ? [] : hoverItemAttributes(index, false, context.activeIndex)),
      ],
      [trigger],
    ) satisfies Html
  }

  return renderTriggerOverlay(props, context, h, trigger) satisfies Html
}

export const AccordionContent: <Message, Requirements>(
  props: NoInfer<AccordionPartProps<Message, Requirements>>,
  context: NoInfer<AccordionContext<ItemMountAttribute<Message, Requirements>>>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function AccordionContent<Message, Requirements>(
  props: NoInfer<AccordionPartProps<Message, Requirements>>,
  context: NoInfer<AccordionContext<ItemMountAttribute<Message, Requirements>>>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const item = itemFor(context, props.value)
  const { size, reducedMotion } = resolvePresentation(context)
  const open = item?.open ?? context.values.includes(props.value)
  const hidden = item?.hidden ?? !open

  return context.disclosure(
    {
      value: props.value,
      isOpen: open,
      disabled: context.disabled || (item?.disabled ?? false),
    },
    ({ panel }) => {
      const aria = [
        ...panel,
        h.Role('region'),
        h.AriaLabelledBy(item?.triggerId ?? accordionTriggerId(context.id, props.value)),
      ]

      const motion = context.animate(
        h.div(
          sourceStyleAttributes({ height: (item?.initialOpen ?? open) ? 'auto' : '0px' }, [
            h.Class(cn('overflow-hidden', props.className)),
            h.DataAttribute('accordion-motion', props.value),
            h.DataAttribute('accordion-generation', String(item?.generation ?? 0)),
            h.DataAttribute('accordion-open', String(open)),
            h.DataAttribute('accordion-reduce-motion', String(context.reduceMotion)),
            ...(props.attributes ?? []),
          ]),
          [
            h.div(
              [
                ...context.itemMount,
                h.DataAttribute('accordion-inner', props.value),
                h.Class(
                  cn(
                    'pt-1 text-muted-foreground',
                    size.px,
                    size.text,
                    size.variant === 'compact' ? 'pb-2.5' : 'pb-3',
                  ),
                ),
              ],
              props.children,
            ),
          ],
        ),
        {
          initial: false,
          animate: {},
          resource: accordionPanelMotion,
          onUpdate: (_values, element) => {
            accordionMotionUpdate(element)
          },
          reducedMotion,
        },
      )

      return h.div(
        [
          ...aria,
          h.Hidden(hidden),
          h.DataAttribute('accordion-panel', props.value),
          h.DataAttribute('orientation', context.orientation),
          h.DataAttribute(
            'index',
            String(context.items.findIndex((row) => row.value === props.value)),
          ),
          ...(context.disabled || (item?.disabled ?? false)
            ? [h.DataAttribute('disabled', '')]
            : []),
          ...(open ? [] : [h.DataAttribute('hidden', '')]),
          h.DataAttribute(open ? 'open' : 'closed', ''),
        ],
        [motion],
      )
    },
  ) satisfies Html
}

type ItemMountAttribute<Message, Requirements> = Extract<
  NonNullable<Parameters<HtmlBuilder<Message, Requirements>['div']>[0]>[number],
  { readonly __childAttribute: true }
>

export interface AccordionContext<MountAttribute = ChildAttribute> extends Presentation {
  readonly disclosure: (
    input: Readonly<{
      value: string
      isOpen: boolean
      disabled: boolean
    }>,
    render: (
      attributes: Readonly<{
        button: ReadonlyArray<ChildAttribute>
        panel: ReadonlyArray<ChildAttribute>
      }>,
    ) => Html,
  ) => Html
  readonly itemMount: ReadonlyArray<MountAttribute>
  readonly id: string
  readonly grouped: boolean
  readonly disabled: boolean
  readonly type: 'single' | 'multiple'
  readonly collapsible: boolean
  readonly orientation: 'vertical' | 'horizontal'
  readonly highlight: 'item' | 'trigger'
  readonly reduceMotion: boolean
  readonly values: ReadonlyArray<string>
  readonly items: ReadonlyArray<AccordionItemState>
  readonly tints: ReadonlyArray<AccordionTint>
  readonly hovered: ReadonlyArray<AccordionTint>
  readonly pointerValue: string | null
  readonly activeIndex: number | null
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly tintAttributes: (
    value: string,
    generation: number,
    hover: boolean,
  ) => ReadonlyArray<ChildAttribute>
}

type PartAttribute<Message, Requirements> = NonNullable<
  Parameters<HtmlBuilder<Message, Requirements>['div']>[0]
>[number]

export interface AccordionPartProps<Message, Requirements = never> {
  readonly value: string
  readonly children?: ReadonlyArray<Html | string>
  readonly className?: string
  readonly attributes?: ReadonlyArray<PartAttribute<Message, Requirements>>
}

export interface AccordionItemProps<Message, Requirements = never> extends Omit<
  AccordionPartProps<Message, Requirements>,
  'children'
> {
  readonly children?:
    | ReadonlyArray<Html | string>
    | ((
        context: NoInfer<AccordionContext<ItemMountAttribute<Message, Requirements>>>,
      ) => ReadonlyArray<Html | string>)
  readonly index?: number
  readonly disabled?: boolean
  readonly highlight?: 'item' | 'trigger'
}

const itemFor = (context: Pick<AccordionContext, 'items'>, value: string) =>
  context.items.find((item) => item.value === value)
