// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Context, Effect, Layer, Queue, Schema, Stream } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { AccordionItemConfig, AccordionLayout } from './accordion-state.js'

export const accordionObservationFields = {
  ObservedTriggers: { disabledValues: Schema.Array(Schema.String) },
  ObservedTriggerIds: {
    ids: Schema.Array(Schema.Struct({ value: Schema.String, id: Schema.String })),
  },
  ObservedItems: { items: Schema.Array(AccordionItemConfig) },
  ObservedLayout: { layout: Schema.Array(AccordionLayout) },
  ObservedFocus: { value: Schema.NullOr(Schema.String), visible: Schema.Boolean },
  ObservedPointer: { value: Schema.NullOr(Schema.String), content: Schema.Boolean },
  CompletedPanel: { value: Schema.String, generation: Schema.Natural },
  ObservedReducedMotion: { reduce: Schema.Boolean },
}

const Observation = defineMessageUnion(accordionObservationFields)

export const ACCORDION_UPDATE = 'fluid-accordion-update'

export const ACCORDION_COMPLETE = 'fluid-accordion-complete'

export const accordionMotionUpdate = (element: HTMLElement | SVGElement) =>
  element.dispatchEvent(new CustomEvent(ACCORDION_UPDATE, { bubbles: true }))

export const accordionMotionComplete = (element: HTMLElement | SVGElement) =>
  element.dispatchEvent(new CustomEvent(ACCORDION_COMPLETE, { bubbles: true }))

type Emit = (message: typeof Observation.Type) => void

interface AccordionRoot {
  readonly endpoints: Map<Element, Emit>
  readonly dispose: () => void
}

export class AccordionRoots extends Context.Service<
  AccordionRoots,
  Map<HTMLElement, AccordionRoot>
>()('@foldkit-visuals/fluid/AccordionRoots') {}

export const AccordionRootsLayer = Layer.effect(
  AccordionRoots,
  Effect.acquireRelease(
    Effect.sync(() => new Map<HTMLElement, AccordionRoot>()),
    (roots) =>
      Effect.sync(() => {
        for (const root of roots.values()) {
          root.dispose()
        }

        roots.clear()
      }),
  ),
)

const rowOf = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>('[data-accordion-item]') : null

const valueOf = (node: HTMLElement | null) => node?.dataset.accordionItem ?? null

function mountAccordion(element: HTMLElement, emit: Emit) {
  const owned = (node: Element) => node.closest('[data-fluid-accordion]') === element

  const rows = () =>
    [...element.querySelectorAll<HTMLElement>('[data-accordion-item]')].filter(owned)

  const measure = () => {
    emit(
      Observation.ObservedLayout({
        layout: rows().map((row) => ({
          value: row.dataset.accordionItem ?? '',
          rect: {
            top: row.offsetTop,
            left: row.offsetLeft,
            width: row.offsetWidth,
            height: row.offsetHeight,
          },
        })),
      }),
    )
  }

  const publishItems = () => {
    emit(
      Observation.ObservedTriggers({
        disabledValues: [
          ...element.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]'),
        ].flatMap((trigger) =>
          owned(trigger) && trigger.disabled ? [trigger.dataset.accordionTrigger ?? ''] : [],
        ),
      }),
    )
    emit(
      Observation.ObservedItems({
        items: rows().map((row) => {
          const index = row.dataset.accordionIndex

          return {
            value: valueOf(row) ?? '',
            index: index === undefined ? null : Number(index),
            disabled: row.dataset.accordionOwnDisabled === 'true',
            highlight: row.dataset.accordionHighlight === 'trigger' ? 'trigger' : 'item',
          }
        }),
      }),
    )
    emit(
      Observation.ObservedTriggerIds({
        ids: [...element.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]')].flatMap(
          (trigger) =>
            owned(trigger)
              ? [{ value: trigger.dataset.accordionTrigger ?? '', id: trigger.id }]
              : [],
        ),
      }),
    )
    measure()
  }

  const resize = new ResizeObserver(measure)

  const observeSizes = () => {
    resize.disconnect()
    resize.observe(element)

    for (const node of element.querySelectorAll<HTMLElement>(
      '[data-accordion-inner], [data-accordion-item]',
    )) {
      if (owned(node)) {
        resize.observe(node)
      }
    }
  }

  const mutations = new MutationObserver(() => {
    observeSizes()
    publishItems()
  })

  mutations.observe(element, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'data-accordion-item',
      'data-accordion-index',
      'data-accordion-generation',
      'data-accordion-own-disabled',
      'data-accordion-highlight',
      'disabled',
      'id',
      'hidden',
    ],
  })

  const focus = (event: FocusEvent) => {
    const row = rowOf(event.target)

    if (row !== null && owned(row)) {
      emit(
        Observation.ObservedFocus({
          value: valueOf(row),
          visible: event.target instanceof Element && event.target.matches(':focus-visible'),
        }),
      )
    }
  }

  const blur = (event: FocusEvent) => {
    if (!(event.relatedTarget instanceof Node) || !element.contains(event.relatedTarget)) {
      emit(Observation.ObservedFocus({ value: null, visible: false }))
    }
  }

  const pointer = (event: MouseEvent) => {
    const row = rowOf(event.target)

    const content =
      event.target instanceof Element && event.target.closest('[data-accordion-panel]') !== null

    emit(
      Observation.ObservedPointer({
        value: row !== null && owned(row) ? valueOf(row) : null,
        content,
      }),
    )
  }

  const leave = () => {
    emit(Observation.ObservedPointer({ value: null, content: false }))
  }

  const complete = (event: Event) => {
    if (!(event.target instanceof HTMLElement) || !owned(event.target)) {
      return
    }

    const value = event.target.dataset.accordionMotion

    if (value === undefined) {
      return
    }

    emit(
      Observation.CompletedPanel({
        value,
        generation: Number(event.target.dataset.accordionGeneration),
      }),
    )
    measure()
  }

  const media = element.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)')

  const reduced = () => {
    emit(Observation.ObservedReducedMotion({ reduce: media?.matches ?? false }))
  }

  media?.addEventListener('change', reduced)
  element.addEventListener('focusin', focus)
  element.addEventListener('focusout', blur)
  element.addEventListener('mousemove', pointer)
  element.addEventListener('mouseleave', leave)
  element.addEventListener(ACCORDION_UPDATE, measure)
  element.addEventListener(ACCORDION_COMPLETE, complete)
  observeSizes()
  publishItems()
  reduced()

  return () => {
    resize.disconnect()
    mutations.disconnect()
    media?.removeEventListener('change', reduced)
    element.removeEventListener('focusin', focus)
    element.removeEventListener('focusout', blur)
    element.removeEventListener('mousemove', pointer)
    element.removeEventListener('mouseleave', leave)
    element.removeEventListener(ACCORDION_UPDATE, measure)
    element.removeEventListener(ACCORDION_COMPLETE, complete)
  }
}

export function observeAccordion(
  element: Element,
  viewStateChanges: Stream.Stream<'Live' | 'Paused'>,
  roots: Map<HTMLElement, AccordionRoot>,
) {
  return viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<typeof Observation.Type>((queue) => {
            const emit: Emit = (message) => {
              Queue.offerUnsafe(queue, message)
            }

            return Effect.acquireRelease(
              Effect.sync(() => {
                const root = element.closest<HTMLElement>('[data-fluid-accordion]')

                if (root === null) {
                  throw new Error('Accordion item requires root')
                }

                let current = roots.get(root)

                if (current === undefined) {
                  const endpoints = new Map<Element, Emit>([[element, emit]])

                  const dispose = mountAccordion(root, (message) => {
                    endpoints.values().next().value?.(message)
                  })

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
              (release) => Effect.sync(release),
            ).pipe(Effect.flatMap(() => Effect.never))
          })
        : Stream.never,
    ),
  )
}
