// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Option, Schema } from 'effect'

export const Side = Schema.Literals(['top', 'right', 'bottom', 'left'])
export type Side = typeof Side.Type
export const Configuration = Schema.Struct({
  side: Side,
  sideOffset: Schema.Number,
  delayDuration: Schema.Option(Schema.Number),
  forceOpen: Schema.Option(Schema.Boolean),
  followCursor: Schema.Option(Schema.Literals(['x', 'y'])),
})
export type Configuration = typeof Configuration.Type
export interface TooltipOptions {
  readonly side?: Side | undefined
  readonly sideOffset?: number | undefined
  readonly delayDuration?: number | undefined
  readonly forceOpen?: boolean | undefined
  readonly followCursor?: 'x' | 'y' | undefined
}
export const configuration = (options: TooltipOptions): Configuration => ({
  side: options.side ?? 'top',
  sideOffset: options.sideOffset ?? 8,
  delayDuration: Option.fromUndefinedOr(options.delayDuration),
  forceOpen: Option.fromUndefinedOr(options.forceOpen),
  followCursor: Option.fromUndefinedOr(options.followCursor),
})
export const Presentation = Schema.Struct({
  internalOpen: Schema.Boolean,
  lastOpenReason: Schema.String,
  phase: Schema.Literals(['absent', 'present', 'exiting']),
  generation: Schema.Natural,
  configuration: Configuration,
})
export type Presentation = typeof Presentation.Type
export const effectiveOpen = (presentation: Presentation) =>
  Option.getOrElse(presentation.configuration.forceOpen, () => presentation.internalOpen)
export const Group = Schema.Struct({
  delayDuration: Schema.Number,
  skipDelayDuration: Schema.Number,
  disableHoverableContent: Schema.Boolean,
  active: Schema.Option(Schema.String),
  cooldownGeneration: Schema.Natural,
})
export type Group = typeof Group.Type
interface GroupOptions {
  readonly delayDuration?: number | undefined
  readonly skipDelayDuration?: number | undefined
  readonly disableHoverableContent?: boolean | undefined
}

export const groupConfiguration = (options: GroupOptions, ownsGroup: boolean) => ({
  delayDuration: options.delayDuration ?? 200,
  skipDelayDuration: options.skipDelayDuration ?? (ownsGroup ? 400 : 300),
  disableHoverableContent: options.disableHoverableContent ?? false,
})

export const initialGroup = (options: GroupOptions = {}, ownsGroup = false): Group => ({
  ...groupConfiguration(options, ownsGroup),
  active: Option.none(),
  cooldownGeneration: 0,
})
export const InteractionContext = Schema.Struct({ presentation: Presentation, group: Group })
export type InteractionContext = typeof InteractionContext.Type
export const Admission = Schema.Struct({
  key: Schema.String,
  next: Schema.Boolean,
  reason: Schema.String,
  sequence: Schema.Natural,
})
export type Admission = typeof Admission.Type
export const EffectiveChange = Schema.Struct({ key: Schema.String, open: Schema.Boolean })
export type EffectiveChange = typeof EffectiveChange.Type
export const Transaction = Schema.Struct({
  admissions: Schema.Array(Admission),
  changes: Schema.Array(EffectiveChange),
})
export type Transaction = typeof Transaction.Type
