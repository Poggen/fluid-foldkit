import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { createKeyedLazy } from 'foldkit/html'
import type { Configuration as ButtonConfiguration } from '../../playground/configs/button'
import type { Configuration as AccordionConfiguration } from '../../playground/configs/accordion'
import type { ResolvedSettings } from '../../settings'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { configuredContext } from './configuration-presentation'
import { renderAccordion } from './core-controls-view'
const renderButton = (
  c: ButtonConfiguration,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) =>
  Button(
    {
      context: configuredContext({ shape, size, hover }, c.appearance),
      variant: c.variant,
      buttonSize: c.iconOnly
        ? c.buttonSize === 'compact'
          ? 'icon-compact'
          : 'icon'
        : c.buttonSize,
      loading: c.loading,
      active: c.active,
      disabled: c.disabled,
      ...(c.leadingIcon ? { leadingIcon: defaultIcons.plus } : {}),
      ...(c.trailingIcon ? { trailingIcon: defaultIcons['arrow-right'] } : {}),
      children: c.iconOnly ? [defaultIcons.plus({}, h)] : [c.label],
      attributes: [h.AriaLabel(c.label)],
    },
    h,
  )
export const makeSimplePureView = () => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    c: ButtonConfiguration | AccordionConfiguration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    c._tag === 'button'
      ? lazy('button', renderButton, [c, settings.shape, settings.size, settings.hover, h])
      : h.div(
          [h.Class('flex w-full justify-center px-4 py-10 sm:px-6')],
          [
            lazy('accordion', renderAccordion, [
              model.accordion,
              c.appearance.shape ?? settings.shape,
              c.appearance.size ?? settings.size,
              c.appearance.hover ?? settings.hover,
              '/docs/accordion',
              h,
            ]),
          ],
        )
}
