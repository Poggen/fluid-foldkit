/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Context, Effect, Layer, Queue, Schema, Stream } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const GroupItem = Schema.Struct({ index: Schema.Int })

export const groupObservationFields = {
  CapturedMount: { hasForm: Schema.Boolean },
  CapturedItems: { items: Schema.Array(GroupItem) },
  CapturedFocus: { index: Schema.Int, visible: Schema.Boolean },
  CapturedBlur: { inside: Schema.Boolean },
  CapturedClick: { index: Schema.Int },
  CapturedReset: { index: Schema.Int },
  CapturedEntryFocus: {},
  CapturedKey: { index: Schema.Int, key: Schema.String },
}

export const GroupObservation = defineMessageUnion(groupObservationFields)

type Emit = (observation: typeof GroupObservation.Type) => void

interface RootObservation {
  readonly endpoints: Map<Element, Emit>
  readonly dispose: () => void
}

export class GroupObserverRoots extends Context.Service<
  GroupObserverRoots,
  Map<HTMLElement, RootObservation>
>()('@foldkit-visuals/fluid/GroupObserverRoots') {}

export const GroupObserverRootsLayer = Layer.effect(
  GroupObserverRoots,
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

function mountGroupRoot(element: HTMLElement, emit: Emit, radio: boolean) {
  let pointerFocusRedirect = false

  const items = () =>
    Array.from(element.querySelectorAll<HTMLElement>('[data-fluid-hover-index]')).filter(
      (item) => item.closest('[data-slot=fluid-selection-group]') === element,
    )

  const itemOf = (target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return undefined
    }

    const item = target.closest<HTMLElement>('[data-fluid-hover-index]')

    return item?.closest('[data-slot=fluid-selection-group]') === element ? item : undefined
  }

  const publishItems = () =>
    emit(
      GroupObservation.CapturedItems({
        items: items().map((item) => ({
          index: Number(item.getAttribute('data-fluid-hover-index')),
        })),
      }),
    )

  const mutations = new MutationObserver(publishItems)
  mutations.observe(element, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-fluid-hover-index'],
  })

  const focus = (event: FocusEvent) => {
    if (event.target === element) {
      emit(GroupObservation.CapturedEntryFocus())

      return
    }

    const item = itemOf(event.target)

    if (item) {
      emit(
        GroupObservation.CapturedFocus({
          index: Number(item.getAttribute('data-fluid-hover-index')),
          visible:
            !pointerFocusRedirect &&
            event.target instanceof Element &&
            event.target.matches(':focus-visible'),
        }),
      )
    }
  }

  const blur = (event: FocusEvent) =>
    emit(
      GroupObservation.CapturedBlur({
        inside: event.relatedTarget instanceof Node && element.contains(event.relatedTarget),
      }),
    )

  const down = (event: MouseEvent) => {
    const item = itemOf(event.target)

    if (!item || !(event.target instanceof Element)) {
      return
    }

    const interactive = event.target.closest(
      'button:not([tabindex="-1"]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )

    if (interactive && interactive !== item) {
      return
    }

    event.preventDefault()
    pointerFocusRedirect = true

    try {
      item.focus()
    } finally {
      pointerFocusRedirect = false
    }
  }

  const click = (event: MouseEvent) => {
    if (event.target instanceof HTMLInputElement) {
      return
    }

    const item = itemOf(event.target)

    if (item) {
      emit(
        GroupObservation.CapturedClick({
          index: Number(item.getAttribute('data-fluid-hover-index')),
        }),
      )
    }
  }

  const key = (event: KeyboardEvent) => {
    const item = itemOf(event.target)

    if (!item || event.target !== item) {
      return
    }

    if (
      [
        ' ',
        'Enter',
        'ArrowDown',
        'ArrowUp',
        'Home',
        'End',
        ...(radio ? ['ArrowLeft', 'ArrowRight'] : []),
      ].includes(event.key)
    ) {
      event.preventDefault()
    }

    emit(
      GroupObservation.CapturedKey({
        index: Number(item.getAttribute('data-fluid-hover-index')),
        key: event.key,
      }),
    )
  }

  const form = element.closest('form')

  const reset = () => {
    for (const item of items()) {
      emit(
        GroupObservation.CapturedReset({
          index: Number(item.getAttribute('data-fluid-hover-index')),
        }),
      )
    }
  }

  form?.addEventListener('reset', reset)
  element.addEventListener('focusin', focus)
  element.addEventListener('focusout', blur)
  element.addEventListener('mousedown', down)
  element.addEventListener('click', click)
  element.addEventListener('keydown', key)
  emit(GroupObservation.CapturedMount({ hasForm: element.closest('form') !== null }))
  publishItems()

  return () => {
    mutations.disconnect()
    form?.removeEventListener('reset', reset)
    element.removeEventListener('focusin', focus)
    element.removeEventListener('focusout', blur)
    element.removeEventListener('mousedown', down)
    element.removeEventListener('click', click)
    element.removeEventListener('keydown', key)
  }
}

export function observeGroup(
  element: Element,
  viewStateChanges: Stream.Stream<'Live' | 'Paused'>,
  roots: Map<HTMLElement, RootObservation>,
  radio = false,
) {
  return viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<typeof GroupObservation.Type>((queue) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const root = element.closest<HTMLElement>('[data-slot=fluid-selection-group]')

                if (!root) {
                  throw new Error('Fluid selection row requires its group')
                }

                const emit: Emit = (observation) => Queue.offerUnsafe(queue, observation)
                let current = roots.get(root)

                if (current === undefined) {
                  const endpoints = new Map<Element, Emit>([[element, emit]])

                  const dispose = mountGroupRoot(
                    root,
                    (observation) => endpoints.values().next().value?.(observation),
                    radio,
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
            ).pipe(Effect.flatMap(() => Effect.never)),
          )
        : Stream.never,
    ),
  )
}
