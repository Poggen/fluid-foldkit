import { Schema } from 'effect'
import { HoverMode } from './hover.js'
import type { Html } from 'foldkit/html'
import type { MotionOptions } from './motion.js'
import type { Icon, Presentation, PresentationContext } from './presentation.js'

export const CommandMenuTab = Schema.Struct({ value: Schema.String, label: Schema.String })

export type CommandMenuTab = typeof CommandMenuTab.Type

export const CommandMenuTabsConfig = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  inputId: Schema.String,
  tabs: Schema.Array(CommandMenuTab),
  value: Schema.String,
})

export type CommandMenuTabsConfig = typeof CommandMenuTabsConfig.Type

export interface CommandMenuTabsViewInputs extends Presentation {
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly filters?: (context: PresentationContext) => Html
  readonly iconFor?: (value: string) => Icon
}
