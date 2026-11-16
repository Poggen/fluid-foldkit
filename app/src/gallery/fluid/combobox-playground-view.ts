import { createKeyedLazy } from 'foldkit/html'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import type { Configuration } from '../../playground/configs/combobox'
import type { ResolvedSettings } from '../../settings'
import { motion } from '../../motion'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Combo } from './details-bindings'
const render = (
  combo: FluidGalleryModel['combo'],
  config: Configuration,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = createPresentationContext({
    shape,
    size,
    hoverMode: hover,
    hasShapeProvider: true,
    hasSizeProvider: true,
  })
  return h.block(
    Combo.embedView({
      slotId: 'combo',
      model: combo,
      viewInputs: {
        context,
        animate: motion.node,
        placeholder: config.placeholder,
        variant: config.variant,
        clearable: config.clearable,
        ...(config.icon ? { icon: defaultIcons.search } : {}),
        ...(config.error ? { error: 'Choose at least one component.' } : {}),
        emptyText: 'No component found.',
        allSelectedText: 'All components selected.',
        ariaLabel: 'Components',
      },
    }),
  )
}
export const makeComboboxPlaygroundView = () => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    config: Configuration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    lazy('combobox-playground', render, [
      model.combo,
      config,
      config.appearance.shape ?? settings.shape,
      config.appearance.size ?? settings.size,
      config.appearance.hover ?? settings.hover,
      h,
    ])
}
