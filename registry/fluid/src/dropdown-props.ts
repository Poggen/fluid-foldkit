// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { ChildAttribute, Html } from 'foldkit/html'
import type { Presentation } from './presentation.js'
import type { DropdownItemContext } from './dropdown-item.js'
import type { TargetMotionOptions as MotionOptions } from './motion-target.js'
import type { DropdownMountArgs } from './dropdown-observation.js'

export interface DropdownProps extends Presentation {
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly contentClassName?: string
  readonly contentAttributes?: ReadonlyArray<ChildAttribute>
  readonly contentRender?: (
    attributes: ReadonlyArray<ChildAttribute>,
    children: ReadonlyArray<Html | string>,
  ) => Html
  readonly trigger?: (attributes: ReadonlyArray<ChildAttribute>, presentation: Presentation) => Html
  readonly triggerAttributes?: ReadonlyArray<ChildAttribute>
  /** Base Select opens after mousedown focus; ordinary menus activate on click. */
  readonly triggerPressEvent?: 'mousedown' | 'click'
  readonly openOnHover?: boolean
  readonly direction?: 'ltr' | 'rtl'
  readonly side?: (typeof DropdownMountArgs.Type)['side']
  readonly align?: (typeof DropdownMountArgs.Type)['align']
  readonly sideOffset?: number
  readonly alignOffset?: number
  readonly content: (context: DropdownItemContext) => ReadonlyArray<Html>
  readonly animate: (node: Html, options: MotionOptions) => Html
}
