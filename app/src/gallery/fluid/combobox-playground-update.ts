import { Update } from 'foldkit'
import type { Configuration } from '../../playground/configs/combobox'
import type { ComponentPresentation } from '../../settings'
import { FluidGalleryBlock } from './block'
import { Combo } from './details-bindings'
export const reconcileCombobox = (config: Configuration, _presentation: ComponentPresentation) =>
  FluidGalleryBlock.makeStep((model) =>
    Update.combineSteps(
      model.combo.multiple === config.multiple &&
        model.combo.disabled === config.disabled &&
        model.combo.hideSelected === (config.multiple && config.hideSelected) &&
        model.combo.allowCreate === config.creatable
        ? []
        : [
            Combo.requestConfigure({
              items: model.combo.items,
              multiple: config.multiple,
              disabled: config.disabled,
              hideSelected: config.multiple && config.hideSelected,
              allowCreate: config.creatable,
            }),
          ],
    ),
  )
