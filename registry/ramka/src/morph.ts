/** @license
 * React-free adaptation of Ramka's View Transition morph engine.
 * Copyright (c) 2026 Artur Bień, MIT licensed; see LICENSE and NOTICE.
 * Upstream: bf58a38a92f8905a7014f23da38db06f41479c34.
 *
 * Owns physical DOM effects only. Foldkit's caller owns accepted open state,
 * cancellation generations, and the notification that this promise settled.
 */
import { createCompositedMorph } from './morph/vt-composited-morph.js'
import { resolveMorphBorderRadius, applyFirefoxFullBleedCaptureInset } from './morph/geometry.js'
import { pageNeedsNameIsolation } from './morph/vt-name-isolation.js'
import { ensureVtStructuralStyles } from './morph/vt-structural-styles.js'
import { isViewTransitionPreset } from './morph/vt-timing.js'
import type { LightboxViewTransitionPreset } from './morph/vt-timing.js'
import {
  DEFAULT_DECODE_MAX_WAIT,
  VIEW_TRANSITION_NAME,
  isLowEndDevice,
} from './morph/vt-constants.js'
import { createMediaPlaceholder } from './morph/placeholder.js'
import type { MediaPlaceholder } from './morph/placeholder.js'
import { createMorphStyles } from './morph/styles.js'
import {
  decodeImage,
  pendingImage,
  untilAbort,
  renderFrames,
  settleSnapshotRoot,
  guardTouch,
} from './morph/readiness.js'

export interface MorphOptions {
  readonly viewTransition?: boolean | LightboxViewTransitionPreset
  /** Dissolve the trigger and item snapshots in the selected direction. */
  readonly crossfade?: boolean | 'both' | 'open' | 'close'
  readonly awaitImageDecode?: boolean | number
  /** Native View Transition readiness; fallback and reduced-motion opens skip it. */
  readonly beforeOpen?: (context: {
    destination: HTMLElement | null
    signal: AbortSignal
  }) => void | Promise<void>
  /** Synchronous notification on every close, including reduced motion. */
  readonly beforeClose?: (context: { destination: HTMLElement | null }) => void
  readonly nonce?: string
}
export interface MorphRequest {
  readonly open: boolean
  /** Actual phase endpoints: trigger → media on open, media → trigger on close. */
  readonly source: HTMLElement | null
  readonly destination: HTMLElement | null
  /** Active item media when a shared Stage owns the capture endpoint. */
  readonly media?: HTMLElement | null
  readonly panel: HTMLElement
  /** Resolve after the physical commit and its accepted view have rendered. */
  readonly commit: () => void | Promise<void>
  /** Batch host measurements with endpoint geometry, before capture styling invalidates layout. */
  readonly beforeCapture?: () => void | Stop
  readonly signal: AbortSignal
  readonly reducedMotion: boolean
  readonly options?: MorphOptions
}

type Stop = () => void
const activeDocuments = new WeakMap<Document, Stop>()
const radiusOwners = new WeakMap<Document, { owners: Set<symbol>; restore: Stop[] }>()

function retainRadii(document: Document, owner: symbol) {
  let retained = radiusOwners.get(document)
  if (!retained) {
    retained = {
      owners: new Set(),
      restore: ['--lightbox-morph-radius-trigger', '--lightbox-morph-radius-item'].map((name) =>
        property(document.documentElement, name),
      ),
    }
    radiusOwners.set(document, retained)
  }
  retained.owners.add(owner)
  const lease = retained
  return () => {
    lease.owners.delete(owner)
    if (lease.owners.size > 0) return
    for (const restore of lease.restore) restore()
    radiusOwners.delete(document)
  }
}

function property(element: HTMLElement, name: string) {
  const value = element.style.getPropertyValue(name)
  const priority = element.style.getPropertyPriority(name)
  return () => {
    if (value) element.style.setProperty(name, value, priority)
    else element.style.removeProperty(name)
  }
}
function attribute(element: HTMLElement, name: string) {
  const value = element.getAttribute(name)
  return () => {
    if (value == null) element.removeAttribute(name)
    else element.setAttribute(name, value)
  }
}
function sizeResolvable(element: HTMLElement | null): element is HTMLElement {
  if (!element?.isConnected) return false
  const { width, height } = element.getBoundingClientRect()
  return width > 0 && height > 0
}

function prepare(panel: HTMLElement) {
  const restore = [
    attribute(panel, 'open'),
    attribute(panel, 'inert'),
    property(panel, 'visibility'),
  ]
  panel.style.setProperty('visibility', 'hidden', 'important')
  panel.setAttribute('inert', '')
  if (panel.tagName === 'DIALOG') panel.setAttribute('open', '')
  let restored = false
  return () => {
    if (restored) return
    restored = true
    for (const undo of restore.reverse()) undo()
  }
}

export function createMorph(document: Document) {
  const styles = createMorphStyles(document)
  const compositor = createCompositedMorph(document, styles)
  let disposed = false
  let ownStop: Stop | undefined
  const radiusOwner = Symbol()
  let releaseRadii: Stop | undefined
  const placeholders = new Set<MediaPlaceholder>()

  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Native View Transition callbacks await this resource Promise and preserve capture microtask ordering.
  const transition = async (request: MorphRequest) => {
    if (request.signal.aborted || disposed) return
    activeDocuments.get(document)?.()
    for (const placeholder of placeholders) placeholder.dispose()
    const controller = new AbortController()
    const signal = controller.signal
    const cleanups: Stop[] = []
    let restorePrepare: Stop = () => {}
    let committed = false
    let commitSucceeded = false
    let commitResult: Promise<void> | undefined
    let stopped = false
    let nativeTransition: ViewTransition | undefined
    let placeholder: MediaPlaceholder | null = null
    let failed = false
    let preparationFailed = false
    let waitedSincePrepare = false
    const commit = () => {
      if (committed) return commitResult
      committed = true
      restorePrepare()
      const completion = request.commit()
      if (completion) {
        commitResult = completion.then(() => {
          commitSucceeded = true
        })
        void commitResult.catch(() => {})
        return commitResult
      }
      commitSucceeded = true
      return undefined
    }
    const cleanup = () => {
      restorePrepare()
      for (const undo of cleanups.splice(0).reverse()) undo()
      request.signal.removeEventListener('abort', stop)
      if (activeDocuments.get(document) === stop) activeDocuments.delete(document)
      if (ownStop === stop) ownStop = undefined
    }
    const stop = () => {
      if (stopped) return
      stopped = true
      controller.abort()
      placeholder?.dispose()
      nativeTransition?.skipTransition()
      compositor.cancel()
      try {
        void commit()
      } finally {
        cleanup()
      }
    }
    ownStop = stop
    activeDocuments.set(document, stop)
    request.signal.addEventListener('abort', stop, { once: true })
    const options = request.options ?? {}
    const window = document.defaultView
    styles.setNonce(options.nonce)
    try {
      if (!request.open) options.beforeClose?.({ destination: request.source })
      if (request.reducedMotion || !window) {
        const completion = commit()
        if (completion) await untilAbort(completion, signal)
        return
      }
      const canUseVT =
        options.viewTransition !== false &&
        typeof document.startViewTransition === 'function' &&
        !isLowEndDevice(document)
      if (!canUseVT) {
        if (request.open) {
          const completion = commit()
          if (completion) await untilAbort(completion, signal)
          await renderFrames(document, 1, signal)
        }
        if (signal.aborted) return
        const animations = request.panel.getAnimations?.() ?? []
        await untilAbort(
          Promise.allSettled(animations.map((animation) => animation.finished)),
          signal,
        )
        if (!signal.aborted) {
          const completion = commit()
          if (completion) await untilAbort(completion, signal)
        }
        return
      }
      cleanups.push(guardTouch(document))
      if (request.open) {
        restorePrepare = prepare(request.panel)
        placeholder = createMediaPlaceholder({
          source: request.source,
          destination: request.media === undefined ? request.destination : request.media,
          signal: request.signal,
          onDispose: () => {
            if (placeholder) placeholders.delete(placeholder)
          },
        })
        if (placeholder) placeholders.add(placeholder)
        const maxWait =
          options.awaitImageDecode === false
            ? 0
            : typeof options.awaitImageDecode === 'number'
              ? Math.max(0, options.awaitImageDecode)
              : DEFAULT_DECODE_MAX_WAIT
        const image =
          maxWait > 0
            ? pendingImage(request.media === undefined ? request.destination : request.media)
            : null
        if (image) {
          await decodeImage(image, maxWait, signal)
          waitedSincePrepare = true
        }
        if (signal.aborted) return
        if (options.beforeOpen) {
          try {
            await untilAbort(
              Promise.resolve(options.beforeOpen({ destination: request.destination, signal })),
              signal,
            )
            waitedSincePrepare = true
          } catch (error) {
            preparationFailed = true
            throw error
          }
        }
      }
      if (signal.aborted) return
      if (request.open) {
        const settle = settleSnapshotRoot(document, signal)
        if (settle) {
          await settle
          waitedSincePrepare = true
        }
      }
      if (document.getElementsByTagName('*').length >= 2500)
        await renderFrames(document, request.open && !waitedSincePrepare ? 2 : 1, signal)
      if (signal.aborted) return
      const { source, destination } = request
      const canMorph = sizeResolvable(source) && sizeResolvable(destination)
      const fromRadius = canMorph ? resolveMorphBorderRadius(source) : null
      const toRadius = canMorph ? resolveMorphBorderRadius(destination) : null
      const releaseCapturePreparation = request.beforeCapture?.()
      if (releaseCapturePreparation) cleanups.push(releaseCapturePreparation)
      ensureVtStructuralStyles(styles)
      const root = document.documentElement
      const attrs = [
        'data-ramka-view-transition',
        'data-ramka-vt-preset',
        'data-ramka-crossfade',
        'data-ramka-vt-isolate',
      ]
      cleanups.push(...attrs.map((name) => attribute(root, name)))
      const needsIsolation = pageNeedsNameIsolation(document)
      root.setAttribute('data-ramka-view-transition', request.open ? 'opening' : 'closing')
      root.setAttribute(
        'data-ramka-vt-preset',
        isViewTransitionPreset(options.viewTransition) ? options.viewTransition : 'default',
      )
      const crossfade =
        options.crossfade === true ||
        options.crossfade === 'both' ||
        options.crossfade === (request.open ? 'open' : 'close')
      root.toggleAttribute('data-ramka-crossfade', crossfade || !canMorph)
      root.toggleAttribute('data-ramka-vt-isolate', needsIsolation)
      releaseRadii ??= retainRadii(document, radiusOwner)
      for (const [name, value] of [
        ['--lightbox-morph-radius-trigger', request.open ? fromRadius : toRadius],
        ['--lightbox-morph-radius-item', request.open ? toRadius : fromRadius],
      ]) {
        if (!name) continue
        if (root.style.getPropertyValue(name) !== (value ?? '0px'))
          root.style.setProperty(name, value ?? '0px')
      }
      compositor.prewarmCompositedCssSheet()
      const restoreSource = source ? property(source, 'view-transition-name') : () => {}
      const restoreDestination = destination
        ? property(destination, 'view-transition-name')
        : () => {}
      cleanups.push(restoreSource, restoreDestination)

      if (canMorph) {
        destination.style.setProperty('view-transition-name', 'none', 'important')
        source.style.setProperty('view-transition-name', VIEW_TRANSITION_NAME, 'important')
      }
      let restoreInset: Stop = () => {}
      cleanups.push(() => restoreInset())
      if (canMorph && !request.open)
        restoreInset = applyFirefoxFullBleedCaptureInset(source) ?? (() => {})
      nativeTransition = document.startViewTransition(() => {
        if (stopped) return
        restoreInset()
        restoreInset = () => {}
        const captureDestination = () => {
          if (stopped || signal.aborted) return
          if (canMorph) {
            source.style.setProperty('view-transition-name', 'none', 'important')
            destination.style.setProperty('view-transition-name', VIEW_TRANSITION_NAME, 'important')
            if (request.open)
              restoreInset = applyFirefoxFullBleedCaptureInset(destination) ?? (() => {})
          }
        }
        const completion = commit()
        if (completion) return untilAbort(completion, signal).then(captureDestination)
        captureDestination()
      })

      void nativeTransition.ready.catch(() => {})
      if (canMorph)
        compositor.maybeUpgradeToCompositedMorph(
          nativeTransition,
          { from: fromRadius, to: toRadius },
          request.open ? source : destination,
        )
      await untilAbort(
        nativeTransition.finished.catch(() => {}),
        signal,
      )
    } catch (error) {
      failed = true
      throw error
    } finally {
      stopped = true
      try {
        if (!preparationFailed) {
          const completion = commit()
          if (completion && !signal.aborted) await untilAbort(completion, signal)
        }
      } finally {
        try {
          if (failed || signal.aborted || !commitSucceeded) placeholder?.dispose()
          else placeholder?.settle()
        } finally {
          if (ownStop === stop) compositor.cancel()
          cleanup()
        }
      }
    }
  }
  const resource: { transition: (request: MorphRequest) => Promise<void>; dispose: () => void } = {
    transition,
    dispose() {
      if (disposed) return
      disposed = true
      try {
        ownStop?.()
      } finally {
        for (const placeholder of placeholders) placeholder.dispose()
        compositor.dispose()
        styles.dispose()
        releaseRadii?.()
        releaseRadii = undefined
      }
    },
  }
  return resource
}
