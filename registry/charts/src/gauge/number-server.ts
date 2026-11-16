import { CustomElement } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { Data } from 'number-flow/lite'

const ReserveNumber = CustomElement.define({
  tag: 'fk-bklit-number-reserve',
  properties: {},
  events: {},
})

/** Hydration-safe visible NumberFlow fallback. The registered Mount acquires the live native engine. */
export function numberServerView<Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  data: Data,
): Html {
  return ReserveNumber.withMessage(h)(
    [
      h.DataAttribute('will-change', ''),
      h.Class(
        'inline-block [direction:ltr] whitespace-nowrap [line-height:var(--number-flow-char-height,1em)]!',
      ),
    ],
    [
      h.span(
        [
          h.Class(
            '[font-kerning:none] inline-block [line-height:var(--number-flow-char-height,1em)]! [padding:calc(round(nearest,calc(var(--number-flow-mask-height,0.25em)/2),1px)*2)_0]',
          ),
          h.Role('img'),
          h.AriaLabel(data.valueAsString),
        ],
        [data.valueAsString],
      ),
    ],
  )
}
