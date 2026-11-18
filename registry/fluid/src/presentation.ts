import type { HoverMode } from './hover-observation.js'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { shapeMap, type ShapeVariant } from './lib/shape.js'
import { sizeMap, type SizeVariant } from './lib/size.js'
import { defaultIcons, type IconName } from './icons.js'

export const createPresentationContext: (
  options?: Presentation & {
    readonly icons?: IconMap
    readonly reducedMotion?: PresentationValues['reducedMotion']
    readonly prefersReducedMotion?: boolean
    readonly hasShapeProvider?: boolean
    readonly hasSizeProvider?: boolean
  },
) => PresentationContext = function createPresentationContext(
  options: Presentation & {
    readonly icons?: IconMap
    readonly reducedMotion?: PresentationValues['reducedMotion']
    readonly prefersReducedMotion?: boolean
    readonly hasShapeProvider?: boolean
    readonly hasSizeProvider?: boolean
  } = {},
) {
  const resolved = resolvePresentation(options)

  const value: PresentationValues = {
    hoverMode: resolved.hoverMode,
    shape: resolved.shape.variant,
    size: resolved.size.variant,
    surface: resolved.surface,
    icons: options.icons ?? resolved.icons,
    reducedMotion: options.reducedMotion ?? resolved.reducedMotion,
    prefersReducedMotion: options.prefersReducedMotion ?? resolved.prefersReducedMotion,
    hasShapeProvider: options.hasShapeProvider ?? resolved.hasShapeProvider,
    hasSizeProvider: options.hasSizeProvider ?? resolved.hasSizeProvider,
  }

  return () => value
}

export interface IconOptions {
  readonly size?: number
  readonly strokeWidth?: number
  readonly className?: string
}

export type Icon = <Message>(options: IconOptions, h: HtmlBuilder<Message>) => Html

export type IconMap = Readonly<Record<IconName, Icon>>

export interface PresentationValues {
  readonly hoverMode?: HoverMode
  readonly shape: ShapeVariant
  readonly size: SizeVariant
  readonly surface: number
  readonly icons: IconMap
  readonly reducedMotion: 'user' | 'always' | 'never'
  readonly prefersReducedMotion: boolean
  readonly hasShapeProvider: boolean
  readonly hasSizeProvider: boolean
}

/** A top-level projection keeps icon functions outside checked Model/ViewInput records. */
export type PresentationContext = () => PresentationValues

export interface Presentation {
  readonly hoverMode?: HoverMode
  readonly shape?: ShapeVariant
  readonly size?: SizeVariant
  readonly surface?: number
  readonly context?: PresentationContext
}

export function resolvePresentation(options: Presentation = {}) {
  const inherited = options.context?.()

  return {
    hoverMode: options.hoverMode ?? inherited?.hoverMode ?? 'fluid',
    shape: shapeMap[options.shape ?? inherited?.shape ?? 'rounded'],
    size: sizeMap[options.size ?? inherited?.size ?? 'default'],
    surface: Math.max(1, Math.min(8, options.surface ?? inherited?.surface ?? 1)),
    icons: inherited?.icons ?? defaultIcons,
    reducedMotion: inherited?.reducedMotion ?? 'never',
    prefersReducedMotion: inherited?.prefersReducedMotion ?? false,
    hasShapeProvider: inherited?.hasShapeProvider ?? false,
    hasSizeProvider: inherited?.hasSizeProvider ?? false,
  }
}
