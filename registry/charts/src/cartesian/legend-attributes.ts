import { Option } from 'effect'
import type { Interaction } from './state'

/** Series and profit/loss are separate source-controlled channels on the same parent owner. */
export function synchronizeLegendHover(element: HTMLElement, state: Interaction): void {
  const attributes: ReadonlyArray<readonly [string, Option.Option<number>]> = [
    ['data-bkm-legend', state.hoveredLegend],
    ['data-bkm-pl', state.hoveredProfitLossLegend],
  ]

  for (const [name, value] of attributes) {
    if (Option.isNone(value)) {
      if (element.hasAttribute(name)) {
        element.removeAttribute(name)
      }
    } else if (element.getAttribute(name) !== String(value.value)) {
      element.setAttribute(name, String(value.value))
    }
  }
}
