import { Option } from 'effect'
import { Update } from 'foldkit'
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
    const configured =
      current?.hoverable === c.hoverable &&
      current.side === c.side &&
      current.sideOffset === c.sideOffset &&
      Option.getOrNull(current.delayDuration) === c.delayDuration &&
      Option.getOrNull(current.followCursor) === (c.followCursor === 'none' ? null : c.followCursor)
    return Update.combineSteps([
      ...(model.tooltips.groups['playground-tooltip']?.presentation === c.presentation
        ? []
        : [
            Tooltips.requestGroup({ groupKey: 'playground-tooltip', presentation: c.presentation }),
          ]),
      ...(configured
        ? []
        : ['basic', 'tooltip-neighbor', 'tooltip-third'].map((key) =>
            Tooltips.requestConfigure({
              key,
              options: {
                hoverable: c.hoverable,
                side: c.side,
                sideOffset: c.sideOffset,
                delayDuration: c.delayDuration,
                followCursor: c.followCursor === 'none' ? undefined : c.followCursor,
              },
            }),
          )),
    ])
  })
