import { shapeMap } from '@foldkit-visuals/fluid/tokens'
import type { Presentation } from '@foldkit-visuals/fluid/presentation'

const query = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)

const shape = query.get('shape')

const mode = query.get('hoverMode') ?? query.get('hover')

export const exampleHoverConfig = {
  hoverMode: mode === 'standard' ? 'standard' : 'fluid',
} satisfies Pick<Presentation, 'hoverMode'>

export const examplePresentation: Pick<Presentation, 'shape' | 'hoverMode'> =
  shape === 'sharp' || shape === 'rounded' || shape === 'pill'
    ? { ...exampleHoverConfig, shape }
    : { ...exampleHoverConfig }

export const exampleSelectionRadius = shapeMap[examplePresentation.shape ?? 'rounded'].mergedRadius
