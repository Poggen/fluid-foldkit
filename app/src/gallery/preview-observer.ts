import { Effect, Queue, Stream } from 'effect'
import { Message } from './definition'
import { isPreviewHref } from './admission'
import type { PreviewHeights } from './geometry'

export const observePreviews = (
  element: Element,
  admissionRevision: number,
  reserved: PreviewHeights = {},
  layout = '',
) =>
  Stream.callback<
    typeof Message.ObservedPreviews.Type | typeof Message.MeasuredPreviewHeights.Type
  >((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const view = element.ownerDocument.defaultView
        if (!view) throw new Error('Preview admission requires a document')
        const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-preview-href]'))
        const projected = new Map<HTMLElement, { width: number; content: HTMLElement }>()
        const stages = new Map<HTMLElement, HTMLElement>()
        const dirty = new Set<HTMLElement>()
        const targets = new Map<Element, HTMLElement>()
        const sent = new Map<string, string>()
        let frame = 0
        const clearProjection = (stage: HTMLElement, content: HTMLElement) => {
          stage.style.removeProperty('min-height')
          content.style.removeProperty('min-height')
          projected.delete(stage)
        }
        for (const card of cards) {
          const stage = card.querySelector<HTMLElement>('.preview-stage')
          const content = stage?.querySelector<HTMLElement>('.preview-content')
          const href = card.getAttribute('data-preview-href')
          if (
            stage === null ||
            stage === undefined ||
            content === null ||
            content === undefined ||
            href === null
          )
            throw new Error('Preview admission requires an inner stage')
          stages.set(stage, card)
          const measurement = reserved[href]
          const height =
            measurement?.width === card.offsetWidth && measurement.layout === layout
              ? measurement.height
              : undefined
          if (card.dataset.deferred === 'true' && height !== undefined) {
            // Match the preceding visit without retaining the retired component's state.
            stage.style.minHeight = `${height}px`
            content.style.minHeight = '0px'
            projected.set(stage, { width: card.offsetWidth, content })
          }
        }
        const measure = () => {
          frame = 0
          const heights: Record<string, { width: number; layout: string; height: number }> = {}
          const changed = Array.from(dirty)
          dirty.clear()
          for (const stage of changed) {
            const card = stages.get(stage)
            if (card === undefined) continue
            const projection = projected.get(stage)
            if (
              projection !== undefined &&
              (projection.width !== card.offsetWidth || card.dataset.deferred !== 'true')
            )
              clearProjection(stage, projection.content)
            if (card.dataset.deferred === 'true') continue
            const href = card.getAttribute('data-preview-href')
            if (href === null) continue
            const height = stage.offsetHeight
            const key = `${card.offsetWidth}:${height}`
            if (height > 0 && sent.get(href) !== key) {
              sent.set(href, key)
              heights[href] = { width: card.offsetWidth, layout, height }
            }
          }
          if (Object.keys(heights).length > 0)
            Queue.offerUnsafe(queue, Message.MeasuredPreviewHeights({ heights, admissionRevision }))
        }
        const scheduleMeasurement = (stage: HTMLElement) => {
          dirty.add(stage)
          if (frame === 0) frame = view.requestAnimationFrame(measure)
        }
        const resize = new view.ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.target instanceof view.HTMLElement && stages.has(entry.target))
              scheduleMeasurement(entry.target)
          }
        })
        for (const stage of stages.keys()) resize.observe(stage)
        const admission = new view.MutationObserver((entries) => {
          for (const entry of entries) {
            if (!(entry.target instanceof view.HTMLElement)) continue
            const stage = entry.target.querySelector<HTMLElement>('.preview-stage')
            if (stage !== null && stages.has(stage)) scheduleMeasurement(stage)
          }
        })
        admission.observe(element, {
          subtree: true,
          attributes: true,
          attributeFilter: ['data-deferred'],
        })
        const intersection = new view.IntersectionObserver(
          (entries) => {
            const hrefs = entries
              .filter((entry) => entry.isIntersecting)
              .flatMap((entry) => {
                intersection.unobserve(entry.target)
                const href = targets.get(entry.target)?.getAttribute('data-preview-href')
                return href !== undefined && href !== null && isPreviewHref(href) ? [href] : []
              })
            if (hrefs.length)
              Queue.offerUnsafe(queue, Message.ObservedPreviews({ hrefs, admissionRevision }))
          },
          { rootMargin: '1200px 0px' },
        )
        for (const [stage, card] of stages) {
          if (card.dataset.deferred === 'true') {
            const target = stage.querySelector('.preview-content') ?? stage
            targets.set(target, card)
            intersection.observe(target)
          }
        }
        return () => {
          intersection.disconnect()
          resize.disconnect()
          admission.disconnect()
          view.cancelAnimationFrame(frame)
          for (const [stage, projection] of projected) clearProjection(stage, projection.content)
          stages.clear()
          dirty.clear()
          targets.clear()
        }
      }),
      (release) => Effect.sync(release),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )
