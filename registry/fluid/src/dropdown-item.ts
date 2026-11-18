import { Predicate } from 'effect'
import { hoverItemAttributes } from './hover.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import { resolvePresentation } from './presentation.js'
import type { Icon, Presentation } from './presentation.js'
import { fontWeights } from './lib/font-weight.js'
import { popupShape } from './lib/shape.js'
import { cn } from './lib/utils.js'
import type { TargetMotionOptions as MotionOptions } from './motion-target.js'

export const DropdownItem: <Message>(
  props: DropdownItemProps,
  context: DropdownItemContext,
  h: HtmlBuilder<Message>,
) => Html = function DropdownItem<Message>(
  props: DropdownItemProps,
  context: DropdownItemContext,
  h: HtmlBuilder<Message>,
) {
  const { size, shape } = resolvePresentation(context)

  const active = context.activeIndex === props.index
  const emphasized = active || props.checked === true

  const { checkbox, radio, ariaChecked } = dropdownItemSemantics(props, context)

  const attributes = [
    ...childAttributes([
      h.Key(props.id ?? `${context.id}-item-${props.index}`),
      h.Id(props.id ?? `${context.id}-item-${props.index}`),
      h.Role(itemRole(checkbox, radio)),
      ...(ariaChecked === undefined ? [] : [h.AriaChecked(ariaChecked)]),
      h.Tabindex(inlineTabIndex(props, context)),
      h.AriaLabel(props.label),
      ...(props.disabled === true ? [h.AriaDisabled(true)] : []),
      h.DataAttribute('fluid-dropdown-row', ''),
      h.DataAttribute('fluid-hover-index', String(props.index)),
      ...hoverItemAttributes(props.index, props.disabled === true, context.activeIndex),
      h.DataAttribute('label', props.label),
      h.DataAttribute('close-on-click', String(props.closeOnClick ?? !context.multiple)),
      h.Class(
        cn(
          `relative z-10 flex ${size.control} shrink-0 items-center ${size.gap} ${popupShape(shape.variant).item} ${size.itemPx} cursor-pointer outline-none`,
          props.disabled === true && 'opacity-50 pointer-events-none',
          props.className,
        ),
      ),
    ]),
    ...(props.attributes ?? []),
  ]

  const children: Array<Html> = [
    ...(props.icon === undefined
      ? []
      : [
          h.span(
            [h.Class('inline-grid shrink-0')],
            [
              h.span(
                [h.Class('col-start-1 row-start-1 invisible')],
                [props.icon({ size: size.icon, strokeWidth: 2 }, h)],
              ),
              props.icon(
                {
                  size: size.icon,
                  strokeWidth: emphasized ? 2 : 1.5,
                  className: cn(
                    'col-start-1 row-start-1 transition-[color,stroke-width] duration-80',
                    emphasized ? 'text-foreground' : 'text-muted-foreground',
                  ),
                },
                h,
              ),
            ],
          ),
        ]),
    h.span(
      [h.Class(cn('inline-grid min-w-0 flex-1', size.text))],
      [
        h.span(
          [
            h.Class(
              'col-start-1 row-start-1 invisible truncate pt-[0.25em] -mt-[0.25em] pb-[0.25em] -mb-[0.25em] [text-box:trim-both_cap_alphabetic]',
            ),
            h.AriaHidden(true),
            h.Style({ fontVariationSettings: fontWeights.semibold }),
          ],
          [props.label],
        ),
        h.span(
          [
            h.Class(
              cn(
                'col-start-1 row-start-1 truncate pt-[0.25em] -mt-[0.25em] pb-[0.25em] -mb-[0.25em] transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
                emphasized ? 'text-foreground' : 'text-muted-foreground',
              ),
            ),
            h.Style({
              fontVariationSettings:
                props.checked === true ? fontWeights.semibold : fontWeights.normal,
            }),
          ],
          [props.label],
        ),
      ],
    ),
    ...(() => {
      const path = props.animate(h.path([h.D('M4 12L9 17L20 6')]), {
        initial: false,
        animate: {
          pathLength: props.checked === true ? 1 : 0,
          transition: { duration: 0.08, ease: 'easeOut' },
        },
        exit: { pathLength: 0, transition: { duration: 0.04, ease: 'easeIn' } },
        present: props.checked ?? false,
      })

      return [
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
              h.Class('text-foreground shrink-0'),
            ],
            [path],
          ),
          {
            initial: false,
            animate: { opacity: props.checked === true ? 1 : 0 },
            exit: { opacity: 0, transition: { duration: 0.04, ease: 'easeIn' } },
            present: props.checked ?? false,
          },
        ),
      ]
    })(),
    ...(props.children ?? []),
  ]

  return (
    props.render ? props.render(attributes, children) : h.div(attributes, children)
  ) satisfies Html
}

export interface DropdownItemContext extends Presentation {
  readonly id: string
  readonly activeIndex: number | null
  readonly multiple: boolean
  readonly inMenu: boolean
  readonly checkedIndex?: number
  readonly checkedIndices?: ReadonlyArray<number>
}

export interface DropdownItemProps {
  readonly id?: string
  readonly index: number
  readonly label: string
  readonly checked?: boolean
  readonly disabled?: boolean
  readonly closeOnClick?: boolean
  readonly icon?: Icon
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly children?: ReadonlyArray<Html>
  readonly render?: (
    attributes: ReadonlyArray<ChildAttribute>,
    children: ReadonlyArray<Html>,
  ) => Html
  readonly animate: (node: Html, options: MotionOptions) => Html
}

const dropdownItemSemantics = (props: DropdownItemProps, context: DropdownItemContext) => {
  const checkbox = context.multiple && Predicate.isBoolean(props.checked)

  const radio = Predicate.isBoolean(props.checked) && !checkbox

  let ariaChecked: boolean | undefined

  if (Predicate.isBoolean(props.checked)) {
    ariaChecked = !context.inMenu || checkbox ? props.checked : context.checkedIndex === props.index
  }

  return { checkbox, radio, ariaChecked }
}

const itemRole: (checkbox: boolean, radio: boolean) => string = (
  checkbox: boolean,
  radio: boolean,
) => {
  if (checkbox) {
    return 'menuitemcheckbox'
  }

  return radio ? 'menuitemradio' : 'menuitem'
}

const inlineTabIndex: (props: DropdownItemProps, context: DropdownItemContext) => number = (
  props: DropdownItemProps,
  context: DropdownItemContext,
) =>
  !context.inMenu &&
  props.disabled !== true &&
  props.index === (context.checkedIndex ?? context.checkedIndices?.[0] ?? 0)
    ? 0
    : -1
