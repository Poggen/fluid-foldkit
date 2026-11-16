import { Data } from 'effect'
import type { Attribute } from 'foldkit/html'
import { ACTIVE_ATTR } from './lib/hover-geometry.js'

export const HOVER_ROOT_ATTR = 'data-fluid-hover-root'

export const HOVER_ITEM_ATTR = 'data-fluid-hover-item'

export const HOVER_DISABLED_ATTR = 'data-fluid-hover-disabled'

export const HOVER_HIDDEN_ATTR = 'data-fluid-hover-hidden'

export const HOVER_SCOPE_ATTR = 'data-fluid-hover-scope'

export const HOVER_POINTER_HANDLERS_ATTR = 'data-fluid-hover-pointer-handlers'

export const HOVER_MOUSE_ADMISSION_ATTRS = {
  enter: 'data-fluid-hover-mouse-enter',
  leave: 'data-fluid-hover-mouse-leave',
  move: 'data-fluid-hover-mouse-move',
  click: 'data-fluid-hover-mouse-click',
}

const HoverAttributes =
  Data.taggedEnum<Extract<Attribute<never>, { readonly _tag: 'DataAttribute' }>>()

/** Retained descendants share one physical hover scope without becoming separate controllers. */
export const hoverSubtreeAttributes = (
  hidden = false,
): ReadonlyArray<Extract<Attribute<never>, { readonly _tag: 'DataAttribute' }>> => [
  HoverAttributes.DataAttribute({ key: HOVER_SCOPE_ATTR.slice(5), value: '' }),
  ...(hidden
    ? [HoverAttributes.DataAttribute({ key: HOVER_HIDDEN_ATTR.slice(5), value: '' })]
    : []),
]

/** Registration replaces React refs; nested hover roots own their own items. */
export const hoverItemAttributes = (
  index: number,
  disabled = false,
  activeIndex: number | null = null,
): ReadonlyArray<Extract<Attribute<never>, { readonly _tag: 'DataAttribute' }>> => [
  HoverAttributes.DataAttribute({ key: HOVER_ITEM_ATTR.slice(5), value: String(index) }),
  ...(index === activeIndex
    ? [
        HoverAttributes.DataAttribute({ key: ACTIVE_ATTR.slice(5), value: '' }) satisfies Extract<
          Attribute<never>,
          { readonly _tag: 'DataAttribute' }
        >,
      ]
    : []),
  ...(disabled
    ? [
        HoverAttributes.DataAttribute({
          key: HOVER_DISABLED_ATTR.slice(5),
          value: '',
        }) satisfies Extract<Attribute<never>, { readonly _tag: 'DataAttribute' }>,
      ]
    : []),
]
