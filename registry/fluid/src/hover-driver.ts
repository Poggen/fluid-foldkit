/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import { resolveActivator } from './lib/hover-geometry.js'
import { HoverObservation } from './hover-observation.js'

import {
  HOVER_ITEM_ATTR,
  HOVER_GEOMETRY_ORIGIN_ATTR,
  HOVER_DISABLED_ATTR,
  HOVER_HIDDEN_ATTR,
  HOVER_SCOPE_ATTR,
  HOVER_POINTER_HANDLERS_ATTR,
  HOVER_MOUSE_ADMISSION_ATTRS,
} from './hover-attributes.js'
import { collectHoverItems, measureHoverLayout } from './hover-layout.js'

/** Only browser resources, DOM measurements and coalescing live outside the Block. */
export const mountHover: (
  container: HTMLElement,
  emit: (observation: typeof HoverObservation.Type) => void,
  scopeKey: (element: Element) => string,
) => HoverDriver = function mountHover(
  container: HTMLElement,
  emit: (observation: typeof HoverObservation.Type) => void,
  scopeKey: (element: Element) => string,
) {
  const window = container.ownerDocument.defaultView

  if (window === null) {
    throw new Error('Fluid hover requires a live document')
  }

  const initialItems = collectHoverItems(container)
  const items = new Map<number, HTMLElement>()
  let moveFrame: number | undefined
  let measureFrame: number | undefined
  let disposed = false
  let pointerHandlers = false

  const publish = (observation: typeof HoverObservation.Type) => {
    if (!disposed) {
      emit(observation)
    }
  }

  const geometryOrigin = () => {
    const id = container.getAttribute(HOVER_GEOMETRY_ORIGIN_ATTR)
    return id === null ? undefined : (container.ownerDocument.getElementById(id) ?? undefined)
  }

  const runMeasurement = (ready: boolean) => {
    const measured = measureHoverLayout(container, items, scopeKey, geometryOrigin())

    if (!measured.ready) {
      return false
    }

    publish(
      HoverObservation.Measured({
        itemRects: measured.itemRects,
        rowLayout: measured.rows,
        ready: ready && measured.ready,
      }),
    )

    return measured.ready
  }

  const scheduleMeasurement = (attempts = 3) => {
    if (measureFrame !== undefined) {
      window.cancelAnimationFrame(measureFrame)
    }

    measureFrame = window.requestAnimationFrame(() => {
      measureFrame = undefined

      if (!runMeasurement(true) && attempts > 1) {
        scheduleMeasurement(attempts - 1)
      }
    })
  }

  const observer =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(() => {
          scheduleMeasurement()
        })

  observer?.observe(container)

  const registerItems = (next = collectHoverItems(container)) => {
    let changed = next.size !== items.size
    const previousOrder = [...items.keys()]
    const reordered = [...next.keys()].some((index, position) => previousOrder[position] !== index)

    for (const [index, element] of items) {
      if (next.get(index) === element) {
        continue
      }

      changed = true
      observer?.unobserve(element)
      items.delete(index)
    }

    for (const [index, element] of next) {
      if (items.get(index) === element) {
        continue
      }

      changed = true
      items.set(index, element)
      observer?.observe(element)
    }

    if (changed || reordered) {
      items.clear()

      for (const [index, element] of next) {
        items.set(index, element)
      }
    }

    if (changed) {
      publish(HoverObservation.Registered({ indices: [...items.keys()] }))
    }

    if (changed || reordered) {
      scheduleMeasurement()
    }
  }

  const registrations = new MutationObserver((records) => {
    registerItems()

    if (
      records.some(
        (record) =>
          record.attributeName === HOVER_HIDDEN_ATTR ||
          record.attributeName === HOVER_DISABLED_ATTR ||
          record.attributeName === HOVER_SCOPE_ATTR,
      )
    ) {
      runMeasurement(false)
      scheduleMeasurement()
    }
  })

  registrations.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [HOVER_ITEM_ATTR, HOVER_HIDDEN_ATTR, HOVER_DISABLED_ATTR, HOVER_SCOPE_ATTR],
  })

  const mouseMove = (event: MouseEvent) => {
    if (container.getAttribute(HOVER_MOUSE_ADMISSION_ATTRS.move) === 'false') return

    const { target } = event

    if (!(target instanceof Node) || !container.contains(target)) {
      return
    }

    const { clientX: x, clientY: y } = event

    if (moveFrame !== undefined) {
      window.cancelAnimationFrame(moveFrame)
    }

    moveFrame = window.requestAnimationFrame(() => {
      moveFrame = undefined
      const containing = [...items].filter(([, element]) => element.contains(target))
      containing.sort(([, a], [, b]) => {
        if (a === b) {
          return 0
        }

        return a.contains(b) ? -1 : 1
      })
      const origin = geometryOrigin() ?? container
      const rect = origin.getBoundingClientRect()
      publish(
        HoverObservation.PointerMoved({
          point: { x, y },
          containerRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          scroll: { x: origin.scrollLeft, y: origin.scrollTop },
          border: { x: origin.clientLeft, y: origin.clientTop },
          layoutSize: { width: origin.offsetWidth, height: origin.offsetHeight },
          targetIndices: containing.map(([index]) => index),
          disabledIndices: [...items].flatMap(([index, element]) =>
            isDisabled(element) ? [index] : [],
          ),
        }),
      )
    })
  }

  const mouseEnter = () => {
    if (container.getAttribute(HOVER_MOUSE_ADMISSION_ATTRS.enter) === 'false') return

    publish(HoverObservation.PointerEntered())
  }

  const mouseLeave = () => {
    if (container.getAttribute(HOVER_MOUSE_ADMISSION_ATTRS.leave) === 'false') return

    if (moveFrame !== undefined) {
      window.cancelAnimationFrame(moveFrame)
    }

    moveFrame = undefined
    publish(HoverObservation.PointerLeft())
  }

  const click = (event: MouseEvent) => {
    if (container.getAttribute(HOVER_MOUSE_ADMISSION_ATTRS.click) === 'false') return

    const { target } = event

    if (!(target instanceof Node) || !target.isConnected || !container.contains(target)) {
      return
    }

    publish(
      HoverObservation.Clicked({
        point: { x: event.clientX, y: event.clientY },
        targetIsItem: [...items.values()].some((element) => element.contains(target)),
        targetIsControl:
          target instanceof Element &&
          target.closest(
            "input, textarea, select, button, a, summary, [contenteditable], [role='textbox'], [role='searchbox'], [role='button']",
          ) !== null,
        items: [...items].map(([index, element]) => {
          const rect = element.getBoundingClientRect()

          return {
            index,
            disabled: isDisabled(element),
            rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          }
        }),
      }),
    )
  }

  const measureItems = () => {
    runMeasurement(false)
  }

  const setPointerHandlers = (enabled: boolean) => {
    if (disposed || enabled === pointerHandlers) {
      return
    }

    pointerHandlers = enabled

    if (enabled) {
      container.addEventListener('mousemove', mouseMove)
      container.addEventListener('mouseenter', mouseEnter)
      container.addEventListener('mouseleave', mouseLeave)
      container.addEventListener('click', click)
    } else {
      container.removeEventListener('mousemove', mouseMove)
      container.removeEventListener('mouseenter', mouseEnter)
      container.removeEventListener('mouseleave', mouseLeave)
      container.removeEventListener('click', click)
    }
  }

  setPointerHandlers(container.getAttribute(HOVER_POINTER_HANDLERS_ATTR) !== 'false')
  const scrolled = () => {
    if (geometryOrigin() !== undefined) runMeasurement(false)
  }
  window.addEventListener('scroll', scrolled, true)
  container.addEventListener(MEASURE_EVENT, measureItems)
  registerItems(initialItems)
  scheduleMeasurement()

  return {
    isCurrent: () => !disposed && container.isConnected,
    activate: (index) => {
      const element = items.get(index)

      if (element?.isConnected === true && !isDisabled(element)) {
        resolveActivator(element).click()
      }
    },
    remeasure: () => {
      scheduleMeasurement()
    },
    measureItems,
    setPointerHandlers,
    dispose: () => {
      if (disposed) {
        return
      }

      setPointerHandlers(false)
      disposed = true

      if (moveFrame !== undefined) {
        window.cancelAnimationFrame(moveFrame)
      }

      if (measureFrame !== undefined) {
        window.cancelAnimationFrame(measureFrame)
      }

      window.removeEventListener('scroll', scrolled, true)
      observer?.disconnect()
      registrations.disconnect()
      container.removeEventListener(MEASURE_EVENT, measureItems)
      items.clear()
    },
  }
}

const MEASURE_EVENT = 'fluid-hover-measure'

export interface HoverDriver {
  readonly isCurrent: () => boolean
  readonly activate: (index: number) => void
  readonly remeasure: () => void
  readonly measureItems: () => void
  readonly setPointerHandlers: (enabled: boolean) => void
  readonly dispose: () => void
}

/** The native animation callback boundary: measure changing layout in this frame. */
export const measureHoverItems: (element: HTMLElement) => void = (element: HTMLElement) => {
  element.dispatchEvent(new Event(MEASURE_EVENT))
}

const isDisabled = (element: HTMLElement) =>
  element.hasAttribute(HOVER_DISABLED_ATTR) || element.closest(`[${HOVER_HIDDEN_ATTR}]`) !== null
