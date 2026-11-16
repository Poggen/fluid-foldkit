import { tooltipTrigger } from './elements.js'
import { Observation } from './observation.js'

export function hasOpenTooltipChild(document: Document, id: string) {
  const popup = document.getElementById(`${id}-popup`)
  if (popup === null) return false
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-tooltip-popup][data-state="open"]'),
  ).some((child) => {
    const key = child.dataset.tooltipPopup
    const trigger = key === undefined ? null : tooltipTrigger(document, key)
    return child !== popup && trigger !== null && popup.contains(trigger)
  })
}
export function observeBaseGrace(
  document: Document,
  id: string,
  event: PointerEvent,
  time: number,
) {
  const reference = tooltipTrigger(document, id)
  const positioner = document.getElementById(`${id}-popup`)
  const floating = positioner?.querySelector<HTMLElement>('[data-tooltip-follow]') ?? null
  if (reference === null || floating === null || event.pointerType === 'touch') return undefined
  const placement = positioner?.dataset.placement?.split('-')[0]
  if (
    placement !== 'top' &&
    placement !== 'right' &&
    placement !== 'bottom' &&
    placement !== 'left'
  )
    return undefined
  const isLeave = event.type === 'pointerleave'
  const point = { x: event.clientX, y: event.clientY }
  const observation = {
    point,
    reference: reference.getBoundingClientRect(),
    floating: floating.getBoundingClientRect(),
    overReference: event.target instanceof Node && reference.contains(event.target),
    overFloating: event.target instanceof Node && floating.contains(event.target),
    isLeave,
    relatedFloating: event.relatedTarget instanceof Node && floating.contains(event.relatedTarget),
    hasOpenChild: hasOpenTooltipChild(document, id),
    time,
  }
  return isLeave
    ? Observation.StartedBaseGrace({ origin: point, side: placement, observation })
    : Observation.MovedInBaseGrace({ observation })
}
