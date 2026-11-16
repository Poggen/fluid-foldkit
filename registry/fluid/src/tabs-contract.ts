import type { HoverMode } from './hover-observation.js'
import type { ChildAttribute, Html } from 'foldkit/html'
import type { TargetMotionOptions } from './motion-target.js'
import type { Presentation } from './presentation.js'
import type { TabsContext } from './tabs-parts.js'
import type { TabsItemDescriptor } from './tabs-state.js'

export interface TabsConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly selectedIndex: number
  readonly activeLabel?: boolean
  readonly direction?: 'ltr' | 'rtl'
  readonly idPrefix?: string
}

export interface TabsViewInputs extends Presentation {
  readonly items: ReadonlyArray<TabsItemDescriptor>
  readonly ariaLabel?: string
  readonly focusOnClick?: boolean
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly content: (context: TabsContext) => ReadonlyArray<Html>
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
}
