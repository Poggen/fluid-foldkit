import type { ComponentPresentation, ResolvedSettings } from '../../settings'
import type { Appearance } from '../../playground/configs/presentation'
import { demoPresentation } from './render-presentation'

export const configuredPresentation = (
  settings: ComponentPresentation,
  appearance: Appearance,
) => ({
  ...settings,
  ...appearance,
})
export const configuredContext = (
  settings: Pick<ResolvedSettings, 'shape' | 'size' | 'hover'>,
  appearance: Appearance,
  size?: 'site' | 'default' | 'compact',
) => {
  const effective = { ...settings, ...appearance }
  return demoPresentation(
    effective.shape,
    size === undefined || size === 'site' ? effective.size : size,
    effective.hover,
  )
}
