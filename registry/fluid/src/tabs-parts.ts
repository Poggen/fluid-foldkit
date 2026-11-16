// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Option } from 'effect'
import { childAttributes } from 'foldkit/html'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import type { TargetMotionOptions } from './motion-target.js'
import { fontWeights } from './lib/font-weight.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Icon, Presentation } from './presentation.js'
import type { TabsLabel } from './tabs-state.js'

export interface TabsLabelView {
  readonly state: typeof TabsLabel.Type
  readonly completion: ReadonlyArray<ChildAttribute>
}

export interface TabsContext extends Presentation {
  readonly measureLabel: (
    attributes: ReadonlyArray<ChildAttribute>,
    children: ReadonlyArray<Html>,
  ) => Html
  readonly itemDisabled: (index: number) => boolean
  readonly itemAttributes: (index: number) => ReadonlyArray<ChildAttribute>
  readonly id: string
  readonly idPrefix?: string
  readonly selectedIndex: number
  readonly hoveredIndex: number | null
  readonly focusedIndex: number | null
  readonly activeLabel: boolean
  readonly labels: ReadonlyArray<TabsLabelView>
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
}

export interface TabsItemProps<Message> {
  readonly index: number
  readonly label: string
  readonly icon?: Icon
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
}

function renderCollapsedLabel<Message, MountRequirements>(
  context: TabsContext,
  index: number,
  label: Html,
  slot: TabsLabelView | undefined,
  selected: boolean,
  marginLeft: number,
  reducedMotion: ReturnType<typeof resolvePresentation>['reducedMotion'],
  h: HtmlBuilder<Message, MountRequirements>,
): Html | null {
  let collapsedLabel: Html | null = null

  if (slot === undefined && selected) {
    collapsedLabel = context.animate(
      h.keyed('span')(`label-${index}`, [h.Class('overflow-hidden')], [label]),
      {
        initial: false,
        animate: { opacity: 1, marginLeft },
        transition: { ...spring.fast, opacity: { duration: 0.06 } },
        reducedMotion,
      },
    )
  } else if (slot !== undefined) {
    const target = { opacity: 1, marginLeft }
    collapsedLabel = context.animate(
      h.keyed('span')(
        `label-${index}`,
        [
          h.Class(cn('overflow-hidden', Option.isNone(slot.state.width) ? 'w-auto' : '')),
          ...slot.completion,
        ],
        [label],
      ),
      {
        initial: slot.state.initial ? { width: 0, opacity: 0, marginLeft: 0 } : false,
        animate: Option.isSome(slot.state.width)
          ? { ...target, width: slot.state.width.value }
          : target,
        exit: { width: 0, opacity: 0, marginLeft: 0 },
        present: slot.state.phase === 'Present',
        transition: { ...spring.fast, opacity: { duration: 0.06 } },
        reducedMotion,
      },
    )
  }

  return collapsedLabel
}

function renderTabsIcon<Message, MountRequirements>(
  icon: Icon | undefined,
  active: boolean,
  size: ReturnType<typeof resolvePresentation>['size']['icon'],
  h: HtmlBuilder<Message, MountRequirements>,
): Html | null {
  return (
    icon?.(
      {
        size,
        strokeWidth: active ? 2 : 1.5,
        className: cn(
          'shrink-0 transition-[color,stroke-width] duration-80',
          active ? 'text-foreground' : 'text-muted-foreground',
        ),
      },
      h,
    ) ?? null
  )
}

export function TabsItem<Message, MountRequirements>(
  props: TabsItemProps<Message>,
  context: TabsContext,
  h: HtmlBuilder<Message, MountRequirements>,
): Html {
  const { size, shape, reducedMotion } = resolvePresentation(context)
  const disabled = context.itemDisabled(props.index)
  const selected = context.selectedIndex === props.index
  const active = selected || context.hoveredIndex === props.index
  const collapsed = context.activeLabel && props.icon !== undefined
  const slot = context.labels.find((label) => label.state.index === props.index)
  const showLabel = !collapsed || selected

  const label = context.measureLabel(
    childAttributes([
      h.DataAttribute('tabs-label-measure', ''),
      h.Class(cn('inline-grid whitespace-nowrap', size.text)),
    ]),
    [
      h.span(
        [
          h.Class('col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic]'),
          h.AriaHidden(true),
          h.Style({ fontVariationSettings: fontWeights.semibold }),
        ],
        [props.label],
      ),
      h.span(
        [
          h.Class(
            cn(
              'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
              active ? 'text-foreground' : 'text-muted-foreground',
            ),
          ),
          h.Style({
            fontVariationSettings: selected ? fontWeights.semibold : fontWeights.normal,
          }),
        ],
        [props.label],
      ),
    ],
  )

  return h.keyed('button')(
    String(props.index),
    [
      ...context.itemAttributes(props.index),
      h.DataAttribute('fluid-hover-index', String(props.index)),
      h.DataAttribute('fluid-hover-item', String(props.index)),
      ...(disabled
        ? [h.DataAttribute('disabled', ''), h.DataAttribute('fluid-hover-disabled', '')]
        : []),
      ...(collapsed ? [h.DataAttribute('tabs-collapsible', '')] : []),
      ...(selected ? [h.DataAttribute('active', '')] : []),
      ...(collapsed && !showLabel ? [h.AriaLabel(props.label)] : []),
      h.Class(
        cn(
          'relative z-10 flex items-center cursor-pointer bg-transparent border-none outline-none',
          size.control,
          size.px,
          !collapsed && size.gap,
          shape.bg,
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    [
      renderTabsIcon(props.icon, active, size.icon, h),
      collapsed
        ? renderCollapsedLabel(
            context,
            props.index,
            label,
            slot,
            selected,
            size.variant === 'compact' ? 6 : 8,
            reducedMotion,
            h,
          )
        : label,
    ],
  )
}

export interface TabsPanelProps<Message> {
  readonly index: number
  readonly selectedIndex: number
  readonly idPrefix: string
  readonly children: ReadonlyArray<Html | string>
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
}

export function TabsPanel<Message>(props: TabsPanelProps<Message>, h: HtmlBuilder<Message>): Html {
  const selected = props.index === props.selectedIndex

  return h.div(
    [
      h.Id(`${props.idPrefix}-panel-${props.index}`),
      h.Role('tabpanel'),
      h.AriaLabelledBy(`${props.idPrefix}-tab-${props.index}`),
      h.Hidden(!selected),
      h.Tabindex(-1),
      h.Class(cn('outline-none', props.className)),
      ...(props.attributes ?? []),
    ],
    selected ? props.children : [],
  )
}
