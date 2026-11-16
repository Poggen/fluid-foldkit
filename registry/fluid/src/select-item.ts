// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import { resolvePresentation } from './presentation.js'
import type { Icon, Presentation } from './presentation.js'
import { popupShape } from './lib/shape.js'
import { cn } from './lib/utils.js'
import type { TargetMotionOptions as MotionOptions } from './motion-target.js'

export interface SelectItemContext extends Presentation {
  readonly id: string
  readonly activeIndex: number | null
  readonly multiple: boolean
  readonly inMenu: boolean
  readonly checkedIndex?: number
  readonly checkedIndices?: ReadonlyArray<number>
}

export interface SelectItemProps {
  readonly id?: string
  readonly index: number
  readonly label: string
  readonly checked?: boolean
  readonly disabled?: boolean
  readonly closeOnClick?: boolean
  readonly icon?: Icon
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly leading?: Html
  readonly children?: ReadonlyArray<Html>
  readonly render?: (
    attributes: ReadonlyArray<ChildAttribute>,
    children: ReadonlyArray<Html>,
  ) => Html
  readonly animate: (node: Html, options: MotionOptions) => Html
}

const inlineTabIndex = (props: SelectItemProps, context: SelectItemContext): number =>
  !context.inMenu &&
  props.disabled !== true &&
  props.index === (context.checkedIndex ?? context.checkedIndices?.[0] ?? 0)
    ? 0
    : -1

export function SelectItem<Message>(
  props: SelectItemProps,
  context: SelectItemContext,
  h: HtmlBuilder<Message>,
): Html {
  const { size, shape: inheritedShape } = resolvePresentation(context)
  const shape = popupShape(inheritedShape.variant)

  const active = context.activeIndex === props.index
  const emphasized = active || props.checked === true

  const attributes = [
    ...childAttributes([
      h.Id(props.id ?? `${context.id}-item-${props.index}`),
      h.Role('option'),
      h.AriaSelected(props.checked ?? false),
      h.Tabindex(inlineTabIndex(props, context)),
      h.AriaLabel(props.label),
      ...(props.disabled === true ? [h.AriaDisabled(true)] : []),
      h.DataAttribute('fluid-dropdown-row', ''),
      h.DataAttribute('fluid-hover-index', String(props.index)),
      h.DataAttribute('fluid-hover-item', String(props.index)),
      h.DataAttribute('label', props.label),
      h.DataAttribute('close-on-click', 'false'),
      h.Class(
        cn(
          `relative z-10 flex ${size.control} shrink-0 items-center ${size.gap} ${shape.item} ${size.itemPx} ${size.text} cursor-pointer outline-none select-none`,
          'transition-[color] duration-80',
          emphasized ? 'text-foreground' : 'text-muted-foreground',
          props.disabled === true && 'opacity-50 pointer-events-none',
          props.className,
        ),
      ),
    ]),
    ...(props.attributes ?? []),
  ]

  const children: Array<Html> = [
    ...(props.leading === undefined ? [] : [props.leading]),
    ...(props.icon === undefined
      ? []
      : [
          props.icon(
            {
              size: size.icon,
              strokeWidth: emphasized ? 2 : 1.5,
              className: 'shrink-0 transition-[color,stroke-width] duration-80',
            },
            h,
          ),
        ]),
    h.span(
      [h.Class('flex-1 min-w-0 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1')],
      [props.label],
    ),
    (() => {
      const path = props.animate(h.path([h.D('M4 12L9 17L20 6')]), {
        initial: false,
        animate: {
          pathLength: props.checked === true ? 1 : 0,
          transition: { duration: 0.08, ease: 'easeOut' },
        },
        exit: { pathLength: 0, transition: { duration: 0.04, ease: 'easeIn' } },
        present: props.checked ?? false,
      })

      return h.span(
        [
          h.AriaHidden(true),
          h.Class(cn('shrink-0', size.variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4')),
        ],
        [
          props.animate(
            h.svg(
              [
                h.Width(String(size.icon)),
                h.Height(String(size.icon)),
                h.ViewBox('0 0 24 24'),
                h.Fill('none'),
                h.Stroke('currentColor'),
                h.StrokeWidth('2'),
                h.StrokeLinecap('round'),
                h.StrokeLinejoin('round'),
                h.Class('text-foreground'),
              ],
              [path],
            ),
            {
              initial: false,
              animate: { opacity: props.checked === true ? 1 : 0 },
              exit: { opacity: 0, transition: { delay: 0.04, duration: 0 } },
              present: props.checked ?? false,
            },
          ),
        ],
      )
    })(),
    ...(props.children ?? []),
  ]

  return props.render ? props.render(attributes, children) : h.div(attributes, children)
}
