import { Context, Effect, Layer, Option, Queue, Stream, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { TabsItemObservation } from './tabs-state.js'

const rovingIndex: (key: string, current: number, length: number, rtl: boolean) => number =
  function rovingIndex(key: string, current: number, length: number, rtl: boolean) {
    if (key === 'Home' || key === 'PageUp') {
      return 0
    }

    if (key === 'End' || key === 'PageDown') {
      return length - 1
    }

    const delta = (key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1)

    return (current + delta + length) % length
  }

export const acceptedSelectionTabStop: (root: HTMLElement, selectedIndex: number) => number | null =
  function acceptedSelectionTabStop(root: HTMLElement, selectedIndex: number) {
    if (root.contains(root.ownerDocument.activeElement)) {
      return null
    }

    const item = [...root.querySelectorAll<HTMLElement>('[data-fluid-hover-index]')].find(
      (candidate) =>
        candidate.closest('[data-slot=fluid-tabs]') === root &&
        candidate.dataset.fluidHoverIndex === String(selectedIndex),
    )

    if (
      item === undefined ||
      item.hasAttribute('disabled') ||
      item.getAttribute('aria-disabled') === 'true'
    ) {
      return null
    }

    return selectedIndex
  }

export const TabsObservation = defineMessageUnion({
  CapturedMount: {},
  CapturedItems: { items: Schema.Array(TabsItemObservation) },
  CapturedMouse: { inside: Schema.Boolean },
  CapturedFocus: { index: Schema.Int, visible: Schema.Boolean },
  CapturedBlur: { inside: Schema.Boolean },
  CapturedSelection: { index: Schema.Int },
})

type Emit = (observation: typeof TabsObservation.Type) => void

interface RootObservation {
  readonly endpoints: Map<Element, Emit>
  readonly dispose: () => void
}

export class TabsObserverRoots extends Context.Service<
  TabsObserverRoots,
  Map<HTMLElement, RootObservation>
>()('@foldkit-visuals/fluid/TabsObserverRoots') {}

export const TabsObserverRootsLayer = Layer.effect(
  TabsObserverRoots,
  Effect.acquireRelease(
    Effect.sync(() => new Map<HTMLElement, RootObservation>()),
    (roots) =>
      Effect.sync(() => {
        for (const root of roots.values()) {
          root.endpoints.clear()
          root.dispose()
        }

        roots.clear()
      }),
  ),
)

const disabled = (item: HTMLElement) => item.getAttribute('aria-disabled') === 'true'

function mountTabsRoot(element: HTMLElement, publish: Emit) {
  let live = true
  const emit: Emit = (observation) => {
    if (live) {
      publish(observation)
    }
  }

  const ownedItems = () =>
    [...element.querySelectorAll<HTMLElement>('[data-fluid-hover-index]')].filter(
      (item) => item.closest('[data-slot=fluid-tabs]') === element,
    )

  const itemOf = (target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return null
    }

    const item = target.closest<HTMLElement>('[data-fluid-hover-index]')

    return item && item.closest('[data-slot=fluid-tabs]') === element ? item : null
  }

  const publishItems = () => {
    emit(
      TabsObservation.CapturedItems({
        items: ownedItems().map((item) => {
          const label = item.querySelector<HTMLElement>('[data-tabs-label-measure]')

          return {
            index: Number(item.dataset.fluidHoverIndex),
            disabled:
              item.hasAttribute('disabled') || item.getAttribute('aria-disabled') === 'true',
            collapsible: item.dataset.tabsCollapsible !== undefined,
            width: Option.fromUndefinedOr(label?.offsetWidth),
          }
        }),
      }),
    )
  }

  const resize = new ResizeObserver(publishItems)

  const observe = () => {
    resize.disconnect()
    resize.observe(element)

    for (const item of ownedItems()) {
      resize.observe(item)
      const label = item.querySelector('[data-tabs-label-measure]')

      if (label) {
        resize.observe(label)
      }
    }

    publishItems()
  }

  const mutations = new MutationObserver(observe)
  mutations.observe(element, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'aria-disabled', 'data-tabs-collapsible'],
  })

  const mouse = (event: MouseEvent) => {
    emit(TabsObservation.CapturedMouse({ inside: event.type !== 'mouseleave' }))
  }

  const focus = (event: FocusEvent) => {
    if (event.target === element) {
      return
    }

    const item = itemOf(event.target)

    if (item) {
      emit(
        TabsObservation.CapturedFocus({
          index: Number(item.dataset.fluidHoverIndex),
          visible: item.matches(':focus-visible'),
        }),
      )
    }
  }

  const blur = (event: FocusEvent) => {
    emit(
      TabsObservation.CapturedBlur({
        inside: event.relatedTarget instanceof Node && element.contains(event.relatedTarget),
      }),
    )
  }

  const select = (item: HTMLElement) => {
    if (!disabled(item)) {
      emit(
        TabsObservation.CapturedSelection({
          index: Number(item.dataset.fluidHoverIndex),
        }),
      )
    }
  }

  const mouseDown = (event: MouseEvent) => {
    if (event.defaultPrevented) {
      return
    }

    const item = itemOf(event.target)

    if (!item) {
      return
    }

    if (element.dataset.tabsFocusOnClick === 'false') {
      event.preventDefault()
    }
  }

  const click = (event: MouseEvent) => {
    if (event.defaultPrevented) {
      return
    }

    const item = itemOf(event.target)

    if (item && event.button === 0) {
      select(item)
    }
  }

  const activateKey: (event: KeyboardEvent, item: HTMLElement) => boolean = (
    event: KeyboardEvent,
    item: HTMLElement,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return false
    }

    if (disabled(item)) {
      event.preventDefault()

      return true
    }

    return true
  }

  const keyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) {
      return
    }

    const item = itemOf(event.target)

    if (!item || event.target !== item || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }

    if (activateKey(event, item)) {
      return
    }

    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']

    if (event.shiftKey || !keys.includes(event.key)) {
      return
    }

    const items = ownedItems()

    if (items.length === 0) {
      return
    }

    const current = items.indexOf(item)
    const next = rovingIndex(event.key, current, items.length, element.dir === 'rtl')

    event.preventDefault()

    items[next]?.focus()
  }

  element.addEventListener('mousedown', mouseDown)
  element.addEventListener('click', click)
  element.addEventListener('keydown', keyDown)
  element.addEventListener('mousemove', mouse)
  element.addEventListener('mouseleave', mouse)
  element.addEventListener('focusin', focus)
  element.addEventListener('focusout', blur)
  emit(TabsObservation.CapturedMount())
  observe()

  return () => {
    live = false

    element.removeEventListener('mousedown', mouseDown)
    element.removeEventListener('click', click)
    element.removeEventListener('keydown', keyDown)
    resize.disconnect()
    mutations.disconnect()
    element.removeEventListener('mousemove', mouse)
    element.removeEventListener('mouseleave', mouse)
    element.removeEventListener('focusin', focus)
    element.removeEventListener('focusout', blur)
  }
}

export function observeTabs(
  element: Element,
  viewStateChanges: Stream.Stream<'Live' | 'Paused'>,
  roots: Map<HTMLElement, RootObservation>,
) {
  return viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<typeof TabsObservation.Type>((queue) => {
            const emit: Emit = (observation) => {
              Queue.offerUnsafe(queue, observation)
            }

            return Effect.acquireRelease(
              Effect.sync(() => {
                const root = element.closest<HTMLElement>('[data-slot=fluid-tabs]')

                if (!root) {
                  throw new Error('Fluid Tabs trigger requires its list')
                }

                let current = roots.get(root)

                if (current === undefined) {
                  const endpoints = new Map<Element, Emit>([[element, emit]])

                  const dispose = mountTabsRoot(root, (observation) =>
                    endpoints.values().next().value?.(observation),
                  )

                  current = { endpoints, dispose }
                  roots.set(root, current)
                } else {
                  current.endpoints.set(element, emit)
                }

                const observed = current

                return () => {
                  if (observed.endpoints.get(element) !== emit) {
                    return
                  }

                  observed.endpoints.delete(element)

                  if (observed.endpoints.size === 0) {
                    observed.dispose()

                    if (roots.get(root) === observed) {
                      roots.delete(root)
                    }
                  }
                }
              }),
              (dispose) => Effect.sync(dispose),
            ).pipe(Effect.flatMap(() => Effect.never))
          })
        : Stream.never,
    ),
  )
}

export function focusTabsItem(roots: Map<HTMLElement, RootObservation>, id: string, index: number) {
  for (const root of roots.keys()) {
    if (root.dataset.tabsId !== id) {
      continue
    }

    const item = [...root.querySelectorAll<HTMLElement>('[data-fluid-hover-index]')].find(
      (candidate) =>
        candidate.closest('[data-slot=fluid-tabs]') === root &&
        candidate.dataset.fluidHoverIndex === String(index),
    )

    item?.focus()

    return
  }
}

export function captureTabsRoot(roots: Map<HTMLElement, RootObservation>, id: string) {
  for (const [element, observation] of roots) {
    if (element.dataset.tabsId !== id) {
      continue
    }

    return {
      element,
      isCurrent: () =>
        element.isConnected && element.dataset.tabsId === id && roots.get(element) === observation,
    }
  }

  return null
}
