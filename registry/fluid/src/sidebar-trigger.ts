/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { Button } from './button.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import type { DocumentTooltipTriggerInputs } from './tooltip-native-public.js'

export const SidebarTrigger: <Message, Requirements>(
  inputs: SidebarTriggerProps,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function SidebarTrigger<Message, Requirements>(
  inputs: SidebarTriggerProps,
  h: HtmlBuilder<Message, Requirements>,
) {
  const presentation = resolvePresentation(inputs)
  return Button(
    {
      ...(inputs.context === undefined ? {} : { context: inputs.context }),
      ...(inputs.shape === undefined ? {} : { shape: inputs.shape }),
      ...(inputs.size === undefined ? {} : { size: inputs.size }),
      ...(inputs.surface === undefined ? {} : { surface: inputs.surface }),
      ...(inputs.hoverMode === undefined ? {} : { hoverMode: inputs.hoverMode }),
      variant: 'ghost',
      buttonSize:
        inputs.compact === true || presentation.size.variant === 'compact'
          ? 'icon-compact'
          : 'icon',
      className: inputs.className ?? '',
      attributes: [...inputs.attributes, h.DataAttribute('sidebar', 'trigger')],

      render: (attributes, children) =>
        inputs.button(
          attributes.flatMap((attribute) =>
            '_tag' in attribute ? childAttributes([attribute]) : [attribute],
          ),
          children,
        ),
      children:
        inputs.label !== undefined && inputs.label !== ''
          ? [inputs.label]
          : [
              presentation.icons[inputs.side === 'right' ? 'panel-right' : 'panel-left'](
                { size: inputs.compact === true ? 16 : presentation.size.icon },
                h,
              ),
            ],
    },
    h,
  ) satisfies Html
}

export type SidebarTriggerButton = Parameters<
  DocumentTooltipTriggerInputs['renderTrigger']
>[1]['button']

export interface SidebarTriggerProps extends Presentation {
  readonly attributes: ReadonlyArray<ChildAttribute>
  readonly button: SidebarTriggerButton
  readonly side: 'left' | 'right'
  readonly compact?: boolean
  readonly className?: string
  readonly label?: string
}
