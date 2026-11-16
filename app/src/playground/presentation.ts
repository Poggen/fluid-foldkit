import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { Settings } from '../settings'
import type { PreviewOptions } from './options'
export const previewPresentation = (settings: Settings, props: PreviewOptions) =>
  createPresentationContext({
    shape: props.shape ?? settings.shape,
    size: props.size === 'default' || props.size === 'compact' ? props.size : settings.size,
    hoverMode: props.hover ?? settings.hover,
    surface: props.surface ?? 1,
    hasShapeProvider: true,
    hasSizeProvider: true,
    reducedMotion: 'user',
  })
