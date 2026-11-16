import { Option } from 'effect'
import type { Configuration as CopyConfiguration } from '../../playground/configs/input-copy'
import type { Configuration as TooltipConfiguration } from '../../playground/configs/tooltip'
import { Copy, Tooltips } from './interactive-bindings'
import { FluidGalleryBlock } from './block'
export const reconcileSimpleTooltip = (c: CopyConfiguration | TooltipConfiguration) =>
  FluidGalleryBlock.makeStep((model) => {
    if (c._tag === 'input-copy')
      return model.copy.value === c.value &&
        model.copy.variant === c.variant &&
        model.copy.align === c.align &&
        model.copy.disabled === c.disabled
        ? FluidGalleryBlock.makeNoopStep()
        : Copy.requestConfigure({
            value: c.value,
            variant: c.variant,
            align: c.align,
            disabled: c.disabled,
          })
    const current = model.tooltips.rows.basic?.presentation.configuration
    return current?.side === c.side &&
      current.sideOffset === c.sideOffset &&
      Option.getOrNull(current.delayDuration) === c.delayDuration &&
      Option.getOrNull(current.followCursor) === (c.followCursor === 'none' ? null : c.followCursor)
      ? FluidGalleryBlock.makeNoopStep()
      : Tooltips.requestConfigure({
          key: 'basic',
          options: {
            side: c.side,
            sideOffset: c.sideOffset,
            delayDuration: c.delayDuration,
            followCursor: c.followCursor === 'none' ? undefined : c.followCursor,
          },
        })
  })
