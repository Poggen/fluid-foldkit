// Derived from Fluid Functionalism cc276ca0. MIT; see NOTICE
import type { HoverMode } from './hover-observation.js'
import type { Html } from 'foldkit/html'
import { resolveIcons, type IconName } from './icons.js'
import { popupShape, shapeMap, type ShapeVariant } from './lib/shape.js'
import { sizeMap, type SizeVariant } from './lib/size.js'
import { typeScale, type TypeScaleRole } from './lib/type-scale.js'
import {
  createPresentationContext,
  resolvePresentation,
  type Icon,
  type PresentationContext,
} from './presentation.js'

export interface ContextChildren {
  readonly context?: PresentationContext
  readonly children: (context: PresentationContext) => Html
}

export function SurfaceProvider(props: ContextChildren & { readonly value: number }): Html {
  return props.children(createPresentationContext({ ...props, surface: props.value }))
}

export function useSurface(context?: PresentationContext): number {
  return resolvePresentation(context === undefined ? {} : { context }).surface
}

export function ShapeProvider(
  props: ContextChildren & { readonly shape?: ShapeVariant; readonly defaultShape?: ShapeVariant },
): Html {
  return props.children(
    createPresentationContext({
      ...props,
      shape: props.shape ?? props.defaultShape ?? 'rounded',
      hasShapeProvider: true,
    }),
  )
}

export function useShape(context?: PresentationContext) {
  return shapeMap[context?.().shape ?? 'rounded']
}

export function usePopupShape(context?: PresentationContext) {
  return popupShape(context?.().shape ?? 'rounded')
}

export function useShapeContext<Message>(
  context: PresentationContext | undefined,
  setShape: (shape: ShapeVariant) => Message,
) {
  const value = context?.()

  if (!value?.hasShapeProvider)
    throw new Error('useShapeContext must be used within a ShapeProvider')

  return { shape: value.shape, classes: shapeMap[value.shape], setShape }
}

export function SizeProvider(
  props: ContextChildren & { readonly size?: SizeVariant; readonly defaultSize?: SizeVariant },
): Html {
  return props.children(
    createPresentationContext({
      ...props,
      size: props.size ?? props.defaultSize ?? 'default',
      hasSizeProvider: true,
    }),
  )
}

export function useSizeVariant(
  context?: PresentationContext,
  override?: SizeVariant | null,
): SizeVariant {
  return override ?? context?.().size ?? 'default'
}

export function useSize(context?: PresentationContext, override?: SizeVariant | null) {
  return sizeMap[useSizeVariant(context, override)]
}

export function useSizeContext<Message>(
  context: PresentationContext | undefined,
  setSize: (size: SizeVariant) => Message,
) {
  const value = context?.()

  if (!value?.hasSizeProvider) throw new Error('useSizeContext must be used within a SizeProvider')

  return { size: value.size, classes: sizeMap[value.size], setSize }
}

export function useTypeScale(
  context?: PresentationContext,
  override?: SizeVariant | null,
): Record<TypeScaleRole, number> {
  const size = useSizeVariant(context, override)

  return {
    display: typeScale.display[size],
    title: typeScale.title[size],
    subtitle: typeScale.subtitle[size],
    body: typeScale.body[size],
    caption: typeScale.caption[size],
    micro: typeScale.micro[size],
  }
}

export function IconProvider(
  props: ContextChildren & { readonly icons?: Partial<Record<IconName, Icon>> },
): Html {
  // Each source provider resets missing roles to Lucide, even inside another icon provider.
  return props.children(createPresentationContext({ ...props, icons: resolveIcons(props.icons) }))
}

export function useIcons(context?: PresentationContext) {
  return resolvePresentation(context === undefined ? {} : { context }).icons
}

export function useIcon(name: IconName, context?: PresentationContext): Icon {
  return useIcons(context)[name]
}

export function FluidProvider(
  props: ContextChildren & {
    readonly shape?: ShapeVariant
    readonly hoverMode?: HoverMode
    readonly size?: SizeVariant
    readonly icons?: Partial<Record<IconName, Icon>>
    readonly prefersReducedMotion?: boolean
  },
): Html {
  return props.children(
    createPresentationContext({
      ...props,
      shape: props.shape ?? 'rounded',
      size: props.size ?? 'default',
      icons: resolveIcons(props.icons),
      reducedMotion: 'user',
      hasShapeProvider: true,
      hasSizeProvider: true,
    }),
  )
}
