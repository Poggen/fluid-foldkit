/* @license Ramka Foldkit port. MIT. Copyright (c) 2026 Artur Bień. */
import { Option, Schema } from 'effect'
import { LightboxBlock, Model, NavigationSource, isOpenTarget } from './block.js'
import type { HostOptions } from './environment.js'
import type { GestureController } from './gestures.js'
import { attachBrowserGuards } from './browser-guards.js'
import { createMediaPlaceholder } from './morph/placeholder.js'
import type { MediaPlaceholder } from './morph/placeholder.js'
import { isAndroidBlinkSnapshotRoot } from './morph/readiness.js'
import { isFirefox } from './morph/is-firefox.js'
import { isLowEndDevice } from './morph/vt-constants.js'
import { arrowKeyIndexDelta } from './upstream/lightbox-direction.js'
import { attachSlides } from './slides.js'
import type { SlidesResource } from './slides.js'
import { attachThumbnailStrip } from './thumbnail.js'
import type { ThumbnailStripResource } from './thumbnail.js'

export function attachGallery(
  element: Element,
  options: HostOptions,
  emit: (message: typeof LightboxBlock.Message.Type) => void,
  flushRender: () => void = () => {},
) {
  const document = element.ownerDocument
  const window = document.defaultView
  if (!window) return () => {}
  const { Message } = LightboxBlock
  const commitAcknowledgements = new Set<{ generation: number; open: boolean; done: () => void }>()
  const awaitCommit = (generation: number, open: boolean, signal: AbortSignal) => {
    if (
      disposed ||
      signal.aborted ||
      (model.generation === generation && model.open === open && model.phase !== 'Preparing')
    )
      return Promise.resolve()
    // oxlint-disable-next-line landmines-style/no-comments -- Native browser boundary directive.
    // @effect-diagnostics-next-line newPromise:off -- Native view acknowledgement and animation frames resolve this scoped browser callback.
    return new Promise<void>((resolve) => {
      let timer = 0
      const waiter = {
        generation,
        open,
        done: () => {
          window.clearTimeout(timer)
          commitAcknowledgements.delete(waiter)
          signal.removeEventListener('abort', waiter.done)
          resolve()
        },
      }
      commitAcknowledgements.add(waiter)
      signal.addEventListener('abort', waiter.done, { once: true })
      const flush = () => {
        if (!commitAcknowledgements.has(waiter)) return
        flushRender()
        if (commitAcknowledgements.has(waiter)) timer = window.setTimeout(flush, 0)
      }
      timer = window.setTimeout(flush, 0)
    })
  }
  const read = () =>
    Schema.decodeUnknownSync(Model)(JSON.parse(element.getAttribute('data-ramka-model') ?? '{}'))
  let model = read()
  let initialHydration = model.initialPaint
  let previous = model
  let disposed = false
  let dialog: HTMLDialogElement | null = null
  let portal: HTMLElement | null = null
  let stage: HTMLElement | null = null
  let slides: HTMLElement | null = null
  let carousel: SlidesResource | undefined
  let gesture: GestureController | undefined
  let gestureUnavailable = false
  let resourceVersion = 0
  let guards: ReturnType<typeof attachBrowserGuards> | undefined
  const bridges = new Map<HTMLElement, MediaPlaceholder>()
  let bridgeAttempts = new WeakMap<HTMLElement, string>()
  let bridgeController = new window.AbortController()
  const posters = new Map<HTMLElement, HTMLImageElement>()
  let lastPlaceholderKey = ''
  let lastTriggerKey = ''
  let scrollTriggerTimer = 0
  let thumbnailStateKey = ''
  let thumbnail: ThumbnailStripResource | undefined
  let selectSequence = 0
  let controller: AbortController | undefined
  let opener: HTMLElement | null = null
  let hiddenTriggers: HTMLElement[] = []
  let closeFocusVisible: boolean | undefined
  let pressedOnScrim = false
  let settledGeneration = -1
  let activeGeneration = -1
  let handledZoomIntent = -1
  let lastIndex = -1
  let lastDirection = ''
  let ownPortalParent: Node | null = null
  let ownPortalSibling: Node | null = null
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let morph: ReturnType<typeof import('./morph.js').createMorph> | undefined
  let morphPending: Promise<NonNullable<typeof morph>> | undefined
  const getMorph = () =>
    (morphPending ??= import('./morph.js')
      .then((module) => {
        if (disposed) throw new Error('Ramka resource disposed before morph load')
        morph = module.createMorph(document)
        return morph
      })
      .catch((error) => {
        morphPending = undefined
        throw error
      }))
  const warmMorph = () => {
    if (
      !disposed &&
      (model.options.viewTransition ?? options.viewTransition ?? true) !== false &&
      !reduced.matches &&
      typeof document.startViewTransition === 'function' &&
      !isLowEndDevice(document)
    )
      void getMorph().catch(() => {})
  }
  const idleWarmup =
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(warmMorph, { timeout: 1000 })
      : window.setTimeout(warmMorph, 200)
  const warmIntent = (event: Event) => {
    const trigger =
      event.target instanceof window.Element ? event.target.closest('[data-ramka-trigger]') : null
    if (trigger && owns(trigger)) {
      warmMorph()
      void import('./gestures.js').catch(() => {})
    }
  }
  const rootId = model.id
  const min = () =>
    Math.max(0.1, model.items[model.index]?.zoom?.minZoom ?? model.options.minZoom ?? 1)
  const max = () =>
    Math.max(
      min(),
      model.items[model.index]?.zoom?.maxZoom ??
        model.options.maxZoom ??
        model.autoMaxZooms[model.index] ??
        4,
    )
  const owns = (node: Element) => {
    const scopedRoot = node.closest('[data-ramka-root]')
    if (scopedRoot && scopedRoot !== element) return false
    const scopedPortal = node.closest('[data-ramka-portal][data-ramka-for]')
    if (scopedPortal) return scopedPortal.getAttribute('data-ramka-for') === rootId
    return (
      scopedRoot === element ||
      node.closest(`[data-ramka-for="${window.CSS.escape(rootId)}"]`) !== null
    )
  }
  const findOwned = (container: ParentNode, selector: string) =>
    [...container.querySelectorAll<HTMLElement>(selector)].find(owns) ?? null
  const actionIndex = (target: HTMLElement) => {
    const index = Number(target.dataset.ramkaIndex ?? target.dataset.index ?? '0')
    return Number.isFinite(index) ? Math.max(0, Math.trunc(index)) : 0
  }
  const normalized = (index: number) =>
    model.options.loop && model.items.length > 0
      ? ((index % model.items.length) + model.items.length) % model.items.length
      : Math.max(0, Math.min(Math.max(0, model.items.length - 1), index))
  const triggers = () =>
    [
      ...element.querySelectorAll<HTMLElement>('[data-ramka-trigger]'),
      ...document.querySelectorAll<HTMLElement>(
        `[data-ramka-trigger][data-ramka-for="${window.CSS.escape(rootId)}"]`,
      ),
    ].filter(owns)
  const triggerFor = (index: number) =>
    triggers().findLast(
      (node) => Number(node.dataset.index ?? node.dataset.ramkaIndex) === index,
    ) ?? null
  const closingTrigger = () => {
    const mode = model.options.morphTo ?? 'active'
    if (mode === 'origin')
      return document.getElementById(model.triggerId) ?? triggerFor(model.origin)
    const active = triggerFor(model.index)
    if (active || mode === 'active') return active
    return (
      triggers().sort(
        (a, b) =>
          Math.abs(Number(a.dataset.index) - model.index) -
          Math.abs(Number(b.dataset.index) - model.index),
      )[0] ?? null
    )
  }
  const media = () => {
    if (!dialog) return null
    const item = findOwned(dialog, '[data-ramka-item][data-active]')
    if (!item) return null
    if (item.hasAttribute('data-ramka-morph')) return item
    return findOwned(item, '[data-ramka-morph]') ?? findOwned(item, '[data-ramka-media]') ?? item
  }
  const captureTarget = () =>
    (dialog &&
      findOwned(
        dialog,
        '[data-ramka-stage][data-ramka-morph], [data-ramka-stage] [data-ramka-stage-morph]',
      )) ??
    media()
  const publishPlaceholders = () => {
    if (disposed || !dialog) return
    const indices = [...dialog.querySelectorAll<HTMLElement>('[data-ramka-item]')]
      .filter(owns)
      .filter((item) => findOwned(item, '[data-placeholder], [data-ramka-placeholder]'))
      .map((item) => Number(item.dataset.index))
      .filter(Number.isFinite)
    const key = indices.join(',')
    if (key !== lastPlaceholderKey) {
      lastPlaceholderKey = key
      emit(Message.PlaceholdersChanged({ indices }))
    }
  }
  const syncMedia = () => {
    if (!dialog) return
    for (const [host, bridge] of bridges)
      if (!host.isConnected) {
        bridge.dispose()
        bridges.delete(host)
      }
    for (const [host, poster] of posters)
      if (!host.isConnected) {
        poster.remove()
        posters.delete(host)
      }
    const items = [...dialog.querySelectorAll<HTMLElement>('[data-ramka-item]')].filter(owns)
    const surfaces = items.length
      ? items
      : [findOwned(dialog, '[data-ramka-zoom]')].filter(
          (node): node is HTMLElement => node !== null,
        )
    for (const item of surfaces) {
      const index = item.hasAttribute('data-ramka-item') ? Number(item.dataset.index) : model.index
      const host = findOwned(item, '[data-ramka-media]')
      if (!host) continue
      const image = [...host.querySelectorAll('img')].find(
        (img) => owns(img) && !img.hasAttribute('data-ramka-media-poster'),
      )
      const video = [...host.querySelectorAll('video')].find(owns)
      if (image) {
        posters.get(host)?.remove()
        posters.delete(host)
        const width = Number(image.getAttribute('width')) || image.naturalWidth
        const height = Number(image.getAttribute('height')) || image.naturalHeight
        if (!host.hasAttribute('data-width') && width > 0 && height > 0) {
          host.style.width = `min(100cqw, calc(100cqh * ${width / height}))`
          host.style.aspectRatio = `${width} / ${height}`
        }
      } else if (video?.poster) {
        let poster = posters.get(host)
        if (!poster) {
          poster = document.createElement('img')
          poster.setAttribute('data-ramka-media-poster', '')
          poster.alt = ''
          poster.setAttribute('aria-hidden', 'true')
          Object.assign(poster.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            opacity: '0',
            pointerEvents: 'none',
          })
          host.insertBefore(poster, host.firstChild)
          posters.set(host, poster)
        }
        if (poster.src !== video.poster) poster.src = video.poster
        const css = window.getComputedStyle(video)
        poster.style.objectFit = css.objectFit === 'contain' ? 'contain' : 'cover'
        poster.style.objectPosition = css.objectPosition
      } else {
        posters.get(host)?.remove()
        posters.delete(host)
      }
      const key = image?.currentSrc || image?.src || video?.currentSrc || video?.src || ''
      if (
        (model.phase === 'Open' || model.phase === 'Opening') &&
        !host.hasAttribute('data-placeholder') &&
        !bridges.has(host) &&
        bridgeAttempts.get(host) !== key
      ) {
        bridgeAttempts.set(host, key)
        const bridge = createMediaPlaceholder({
          source: triggerMedia(triggerFor(index)),
          destination: host,
          signal: bridgeController.signal,
          onDispose: () => {
            bridges.delete(host)
            publishPlaceholders()
          },
        })
        if (bridge) {
          bridges.set(host, bridge)
          if (model.phase === 'Open') bridge.settle()
        }
      }
    }
    if (model.phase === 'Open') for (const bridge of bridges.values()) bridge.settle()
    publishPlaceholders()
  }
  const markMorphTarget = (target: HTMLElement | null) => {
    for (const trigger of [...hiddenTriggers, ...triggers()])
      trigger.removeAttribute('data-morph-target')
    hiddenTriggers = target
      ? triggers().filter((trigger) => actionIndex(trigger) === actionIndex(target))
      : []
    for (const trigger of hiddenTriggers) trigger.setAttribute('data-morph-target', '')
    const id = target?.id ?? ''
    if (!disposed && id !== model.morphTargetId) emit(Message.MorphTargetChanged({ id }))
  }
  const triggerMedia = (target: HTMLElement | null) =>
    target?.querySelector<HTMLElement>('[data-ramka-morph]') ?? target
  const scrollTrigger = (type: 'onChange' | 'onOpenComplete' | 'onClose') => {
    const trigger = closingTrigger()
    if (!trigger) return
    const configured = model.options.scrollTriggerIntoView
    const rules = configured == null ? [] : Array.isArray(configured) ? configured : [configured]
    const rule = rules.find((rule) => rule.type === type)
    if (rule)
      trigger.scrollIntoView({
        behavior: rule.behavior ?? 'smooth',
        block: rule.block ?? 'nearest',
        inline: rule.inline ?? 'nearest',
      })
  }
  const restoreFocus = () => {
    const target = closingTrigger()
    const preferred = target?.isConnected && !target.matches(':disabled') ? target : opener
    const focusOptions: FocusOptions & { focusVisible?: boolean } = { preventScroll: true }
    if (closeFocusVisible !== undefined) focusOptions.focusVisible = closeFocusVisible
    closeFocusVisible = undefined
    preferred?.focus(focusOptions)
  }
  const updateMaximum = () => {
    if (!dialog || model.options.maxZoom !== undefined) return
    const items = [...dialog.querySelectorAll<HTMLElement>('[data-ramka-item]')].filter(owns)
    const surfaces = items.length
      ? items
      : [findOwned(dialog, '[data-ramka-zoom]')].filter(
          (node): node is HTMLElement => node !== null,
        )
    for (const item of surfaces) {
      const index = item.hasAttribute('data-ramka-item') ? Number(item.dataset.index) : model.index
      if (
        !Number.isInteger(index) ||
        !model.items[index] ||
        model.items[index]?.zoom?.maxZoom !== undefined
      )
        continue
      const image = [...item.querySelectorAll('img')].find(owns)
      if (!image || !image.naturalWidth || !image.naturalHeight) continue
      const container = image.closest<HTMLElement>('[data-ramka-zoom]') ?? stage
      const rect = container?.getBoundingClientRect()
      if (!rect || rect.width <= 0 || rect.height <= 0) continue
      const minimum = Math.max(0.1, model.items[index]?.zoom?.minZoom ?? model.options.minZoom ?? 1)
      const limit = Math.max(
        image.naturalWidth / rect.width,
        image.naturalHeight / rect.height,
        minimum + 1,
      )
      if (Math.abs(limit - (model.autoMaxZooms[index] ?? 4)) > 0.001)
        emit(Message.MaximumMeasured({ index, maxZoom: limit }))
    }
  }
  const publishThumbnailState = () => {
    if (disposed) return
    const focused =
      document.activeElement instanceof window.Element
        ? document.activeElement.closest<HTMLElement>('[data-ramka-group-id]')
        : null
    const strip =
      (dialog && findOwned(dialog, '[data-ramka-thumbnail-strip]')) ??
      findOwned(element, '[data-ramka-thumbnail-strip]')
    const state = {
      focused: focused && owns(focused) ? (focused.dataset.ramkaGroupId ?? '') : '',
      scrubbing: strip?.hasAttribute('data-scrubbing') ?? false,
      positioned: strip?.hasAttribute('data-positioned') ?? false,
    }
    const key = JSON.stringify(state)
    if (key !== thumbnailStateKey) {
      thumbnailStateKey = key
      emit(Message.ThumbnailStateChanged(state))
    }
  }
  const thumbnailFocusOut = () => window.queueMicrotask(publishThumbnailState)
  const thumbnailObserver = new window.MutationObserver(publishThumbnailState)
  const positionStrip = () => thumbnail?.reconcile()
  const commitThumbnail = (
    index: number,
    source: 'thumbnail' | 'keyboard' | 'button' | 'imperative' = 'thumbnail',
  ) => {
    const sequence = ++selectSequence
    emit(Message.Navigated({ index, source }))
    // oxlint-disable-next-line landmines-style/no-comments -- Native browser boundary directive.
    // @effect-diagnostics-next-line newPromise:off -- Native view acknowledgement and animation frames resolve this scoped browser callback.
    return new Promise<void>((resolve) => {
      const deadline = window.performance.now() + 1000
      const inspect = () => {
        if (
          disposed ||
          sequence !== selectSequence ||
          !model.open ||
          window.performance.now() >= deadline
        ) {
          resolve()
          return
        }
        if (model.index === index && slides) {
          snapToModel(true)
          resolve()
          return
        }
        window.requestAnimationFrame(inspect)
      }
      window.requestAnimationFrame(inspect)
    })
  }
  const isScrolling = () => model.scrolling || carousel?.isScrolling() === true
  const snapToModel = (instant: boolean) => {
    if (!slides || !model.open || initialHydration) return
    slides.removeAttribute('data-ssr-shift')
    slides.style.removeProperty('--lightbox-ssr-index')
    slides.style.removeProperty('--lightbox-ssr-shift-sign')
    carousel?.snapToModel(instant)
    positionStrip()
  }
  const navigate = (
    index: number,
    source: 'keyboard' | 'thumbnail' | 'button' | 'scroll' | 'imperative',
    stageViewTransition = source === 'thumbnail',
  ) => {
    if (isScrolling() && source !== 'imperative' && source !== 'scroll') return
    const next = normalized(index)
    const commit = () => emit(Message.Navigated({ index: next, source }))
    if (thumbnail && source !== 'scroll' && source !== 'imperative')
      thumbnail.select(next, { source, stageViewTransition })
    else commit()
  }
  const clicked = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || !(event.target instanceof window.Element))
      return
    const startedOnScrim = pressedOnScrim
    pressedOnScrim = false
    if (model.open && startedOnScrim && event.target === dialog) {
      closeFocusVisible = false
      emit(Message.Dismissed())
      return
    }
    const origin = event.composedPath().find((node) => node instanceof window.Element)
    const target = (origin instanceof window.Element ? origin : event.target).closest<HTMLElement>(
      '[data-ramka-action]',
    )
    if (!target || !owns(target) || target.matches(':disabled,[aria-disabled="true"]')) return
    switch (target.dataset.ramkaAction) {
      case 'open':
        emit(
          Message.Opened({
            index: actionIndex(target),
            triggerId: target.dataset.ramkaTriggerId ?? target.id,
          }),
        )
        break
      case 'close':
        closeFocusVisible = event.detail === 0
        emit(Message.Dismissed())
        break
      case 'navigate': {
        const source = Schema.decodeUnknownOption(NavigationSource)(
          target.dataset.ramkaSource ?? 'thumbnail',
        )
        if (source._tag === 'Some')
          navigate(actionIndex(target), source.value === 'trigger' ? 'imperative' : source.value)
        break
      }
      case 'previous':
        navigate(model.index - 1, 'button')
        break
      case 'next':
        navigate(model.index + 1, 'button')
        break
      case 'zoom-in':
        if (!isScrolling()) gesture?.zoomIn()
        break
      case 'zoom-out':
        if (!isScrolling()) gesture?.zoomOut()
        break
      case 'zoom-reset':
        if (!isScrolling()) gesture?.reset()
        break
    }
  }
  const tabbables = () =>
    dialog
      ? [
          ...dialog.querySelectorAll<HTMLElement>(
            'button,input,select,textarea,a[href],[tabindex],[contenteditable="true"]',
          ),
        ].filter(
          (node) =>
            node.tabIndex >= 0 &&
            !node.matches(':disabled') &&
            !node.closest('[inert],[hidden]') &&
            node.getClientRects().length > 0,
        )
      : []
  const focusout = () => {
    window.queueMicrotask(() => {
      if (disposed || !model.open || !dialog?.open) return
      const focused = document.activeElement
      if (!focused || focused === document.body || focused === document.documentElement)
        dialog.focus({ preventScroll: true })
    })
  }
  const thumbnailKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    const target = event.target instanceof window.Element ? event.target : null
    const group = target?.closest<HTMLElement>(
      '[data-ramka-thumbnail-group],[data-ramka-thumbnail-strip-track]',
    )
    if (!group || !owns(group)) return
    const delta = arrowKeyIndexDelta(event.key, model.options.dir ?? 'ltr')
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? model.items.length - 1
          : delta
            ? normalized(model.index + delta)
            : undefined
    if (index === undefined) return
    event.preventDefault()
    if (isScrolling() || model.items.length === 0 || index === model.index) return
    navigate(index, 'thumbnail', false)
    group
      .querySelector<HTMLElement>(`[data-ramka-thumbnail][data-index="${index}"]`)
      ?.focus({ preventScroll: true })
  }
  const keydown = (event: KeyboardEvent) => {
    thumbnailKeydown(event)
    if (
      !model.open ||
      !dialog?.contains(event.target instanceof window.Node ? event.target : null) ||
      event.defaultPrevented
    )
      return
    if (event.key === 'Escape') {
      closeFocusVisible = true
      event.preventDefault()
      dialog.dispatchEvent(new window.CustomEvent('cancel', { cancelable: true }))
      return
    }
    if (event.key === 'Tab') {
      const stops = tabbables()
      const first = stops.at(0)
      const last = stops.at(-1)
      const focused = document.activeElement
      if (!first) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
      } else if (event.shiftKey && (focused === first || focused === dialog)) {
        event.preventDefault()
        last?.focus({ preventScroll: true })
      } else if (!event.shiftKey && (focused === last || focused === dialog)) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
      return
    }
    const target = event.target instanceof window.HTMLElement ? event.target : null
    if (
      target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])') ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return
    if (stage && target !== dialog && target && !stage.contains(target)) return
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      if (!isScrolling()) gesture?.zoomIn()
      return
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      if (!isScrolling()) gesture?.zoomOut()
      return
    }
    if (event.key === '0') {
      event.preventDefault()
      if (!isScrolling()) gesture?.reset()
      return
    }
    const delta = arrowKeyIndexDelta(event.key, model.options.dir ?? 'ltr')
    if (delta && model.zoom > 1) {
      event.preventDefault()
      const distance =
        model.items[model.index]?.zoom?.keyboardPanDistance ??
        model.options.keyboardPanDistance ??
        options.keyboardPanDistance ??
        50
      gesture?.panBy(
        event.key === 'ArrowRight' ? distance : event.key === 'ArrowLeft' ? -distance : 0,
        event.key === 'ArrowDown' ? distance : event.key === 'ArrowUp' ? -distance : 0,
      )
    } else if (delta || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      navigate(
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? model.items.length - 1
            : model.index + delta,
        'keyboard',
      )
    }
  }
  const pointerDown = (event: PointerEvent) => {
    pressedOnScrim = event.button === 0 && event.target === dialog
  }
  const nativeClosed = () => {
    if (dialog && !dialog.open && model.open && isOpenTarget(model)) emit(Message.Dismissed())
  }
  const loaded = () => {
    updateMaximum()
    positionStrip()
  }
  const contentObserver = new window.MutationObserver(() => {
    if (!disposed) reconcile()
  })
  const resize = new window.ResizeObserver(updateMaximum)
  const releaseParts = () => {
    resourceVersion++
    bridgeController.abort()
    bridgeController = new window.AbortController()
    bridgeAttempts = new WeakMap()
    guards?.dispose()
    guards = undefined
    for (const bridge of bridges.values()) bridge.dispose()
    bridges.clear()
    for (const poster of posters.values()) poster.remove()
    posters.clear()
    gesture?.dispose()
    gesture = undefined
    gestureUnavailable = false
    thumbnail?.dispose()
    thumbnail = undefined
    selectSequence++
    carousel?.dispose()
    carousel = undefined
    if (dialog) {
      dialog.removeEventListener('keydown', keydown)
      dialog.removeEventListener('focusout', focusout)
      dialog.removeEventListener('focusin', publishThumbnailState)
      dialog.removeEventListener('focusout', thumbnailFocusOut)
      dialog.removeEventListener('pointerdown', pointerDown)
      dialog.removeEventListener('close', nativeClosed)
      dialog.removeEventListener('load', loaded, true)
    }
    resize.disconnect()
    contentObserver.disconnect()
    thumbnailObserver.disconnect()
    dialog = null
    slides = null
    stage = null
  }
  const placePortal = () => {
    if (!portal || (model.phase === 'Closing' && !model.open && !model.retainedPortal)) return
    const requested = element.getAttribute('data-ramka-container')
    const configured =
      typeof options.container === 'function' ? options.container() : options.container
    const container =
      requested === '__inline__'
        ? ownPortalParent
        : requested
          ? (document.getElementById(requested) ?? document.body)
          : configured === null
            ? ownPortalParent
            : (configured ?? document.body)
    if (container && portal.parentNode !== container) container.appendChild(portal)
  }
  const acquireParts = () => {
    const next =
      findOwned(element, '[data-ramka-content]') ??
      (dialog && (dialog.isConnected || model.phase === 'Closing') ? dialog : null) ??
      (portal?.isConnected ? findOwned(portal, '[data-ramka-content]') : null)
    if (!(next instanceof window.HTMLDialogElement)) {
      if (dialog) releaseParts()
      return
    }
    if (next === dialog) return
    releaseParts()
    dialog = next
    portal = dialog.closest<HTMLElement>('[data-ramka-portal]')
    if (portal) {
      ownPortalParent = portal.parentNode
      ownPortalSibling = portal.nextSibling
      placePortal()
      portal.setAttribute('data-ramka-for', rootId)
    }
    stage = findOwned(dialog, '[data-ramka-stage]') ?? dialog
    slides = findOwned(dialog, '[data-ramka-slides]')
    dialog.addEventListener('keydown', keydown)
    dialog.addEventListener('focusout', focusout)
    dialog.addEventListener('focusin', publishThumbnailState)
    dialog.addEventListener('focusout', thumbnailFocusOut)
    dialog.addEventListener('pointerdown', pointerDown)
    dialog.addEventListener('close', nativeClosed)
    dialog.addEventListener('load', loaded, true)
    if (slides)
      carousel = attachSlides(slides, {
        read: () => ({
          open: model.open,
          index: model.index,
          dir: model.options.dir ?? 'ltr',
          zoom: model.zoom,
        }),
        emit: (fact) => {
          if (!disposed) emit(fact)
        },
        onScroll: positionStrip,
      })
    resize.observe(dialog)
    contentObserver.observe(dialog, { childList: true, subtree: true })
    thumbnailObserver.observe(dialog, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-scrubbing', 'data-positioned'],
    })
    if (slides) resize.observe(slides)
    const strip = findOwned(dialog, '[data-ramka-thumbnail-strip]')
    if (slides && strip)
      thumbnail = attachThumbnailStrip(slides, strip, {
        read: () => ({
          index: model.index,
          scrolling: isScrolling(),
          dir: model.options.dir ?? 'ltr',
          reducedMotion: reduced.matches,
          scrubOnSelect: model.options.scrubOnSelect ?? true,
          selectViewTransition: model.options.selectViewTransition ?? true,
        }),
        commit: commitThumbnail,
        ...(options.wrapSelectCommit === undefined
          ? {}
          : { wrapSelectCommit: options.wrapSelectCommit }),
      })
    const ownedVersion = resourceVersion
    const ownedStage = stage
    void import('./gestures.js')
      .then(({ attachGestureController }) => {
        if (disposed || resourceVersion !== ownedVersion || stage !== ownedStage) return
        gesture = attachGestureController(ownedStage, {
          read: () => ({
            open: model.open,
            index: model.index,
            poseSample: model.poseSample,
            zoom: model.zoom,
            x: model.x,
            y: model.y,
            minZoom: min(),
            maxZoom: max(),
            step: model.items[model.index]?.zoom?.zoomStep ?? model.options.zoomStep ?? 2,
            enabled: model.hasZoom,
            scrolling: isScrolling(),
            pull: model.options.pullToClose ?? true,
            ...(Option.isSome(model.pullAnimation)
              ? { pullAnimation: model.pullAnimation.value }
              : {}),
            reducedMotion: reduced.matches,
          }),
          emit: (intent) => {
            if (!disposed) emit(intent)
          },
          get scrollToZoom() {
            return (
              model.items[model.index]?.zoom?.scrollToZoom ??
              model.options.scrollToZoom ??
              options.scrollToZoom ??
              false
            )
          },
          get wheelSensitivity() {
            return (
              model.items[model.index]?.zoom?.wheelSensitivity ??
              model.options.wheelSensitivity ??
              options.wheelSensitivity ??
              100
            )
          },
          get doubleClickDelay() {
            return (
              model.items[model.index]?.zoom?.doubleClickDelay ??
              model.options.doubleClickDelay ??
              options.doubleClickDelay ??
              300
            )
          },
        })
        reconcile()
      })
      .catch(() => {
        if (!disposed && resourceVersion === ownedVersion) {
          gestureUnavailable = true
          emit(Message.AvailabilityChanged({ zoom: false, thumbnails: model.hasThumbnails }))
        }
      })
  }
  const reconcile = () => {
    if (disposed || !element.hasAttribute('data-ramka-model')) return
    previous = model
    model = read()
    for (const waiter of commitAcknowledgements)
      if (
        waiter.generation !== model.generation ||
        (model.open === waiter.open && model.phase !== 'Preparing')
      )
        waiter.done()
    const registered = triggers()
      .map((node) => ({ id: node.id, index: actionIndex(node) }))
      .filter((trigger) => trigger.id)
    const triggerKey = JSON.stringify(registered)
    if (triggerKey !== lastTriggerKey) {
      lastTriggerKey = triggerKey
      emit(Message.TriggerRegistryChanged({ triggers: registered }))
    }
    if (model.phase === 'Closed' && !model.options.keepMounted) {
      if (dialog?.open) dialog.close()
      markMorphTarget(null)
      releaseParts()
      portal?.remove()
      portal = null
      const thumbnails =
        findOwned(element, '[data-ramka-thumbnail-group],[data-ramka-thumbnail-strip-track]') !==
        null
      if (thumbnails !== model.hasThumbnails)
        emit(Message.AvailabilityChanged({ zoom: false, thumbnails }))
      return
    }
    acquireParts()
    placePortal()
    if (!dialog) return
    if (model.phase !== 'Closed' && !guards) guards = attachBrowserGuards(dialog)
    else if (model.phase === 'Closed') {
      guards?.dispose()
      guards = undefined
    }
    carousel?.reconcile()
    gesture?.reconcile()
    syncMedia()
    publishThumbnailState()
    const zoom =
      !!gesture &&
      !gestureUnavailable &&
      (findOwned(dialog, '[data-ramka-item][data-active] [data-ramka-zoom]') !== null ||
        (!findOwned(dialog, '[data-ramka-item]') &&
          findOwned(dialog, '[data-ramka-zoom]') !== null))
    const thumbnails =
      findOwned(dialog, '[data-ramka-thumbnail-group],[data-ramka-thumbnail-strip-track]') !==
        null ||
      findOwned(element, '[data-ramka-thumbnail-group],[data-ramka-thumbnail-strip-track]') !== null
    if (zoom !== model.hasZoom || thumbnails !== model.hasThumbnails)
      emit(Message.AvailabilityChanged({ zoom, thumbnails }))
    if (
      Option.isSome(model.zoomIntent) &&
      gesture &&
      model.zoomIntent.value.generation !== handledZoomIntent
    ) {
      const intent = model.zoomIntent.value
      handledZoomIntent = intent.generation
      if (intent.zoom <= min()) gesture.reset(intent.rapid)
      else if (intent.focalX !== undefined || intent.focalY !== undefined) {
        const rect = stage?.getBoundingClientRect()
        if (rect)
          gesture.zoomTo(
            intent.zoom,
            {
              x: rect.x + rect.width / 2 + (intent.focalX ?? 0),
              y: rect.y + rect.height / 2 + (intent.focalY ?? 0),
            },
            intent.rapid,
          )
      } else if (intent.x === undefined && intent.y === undefined)
        gesture.zoomTo(intent.zoom, undefined, intent.rapid)
      else {
        const rect = stage?.getBoundingClientRect()
        const divisor = 1 / intent.zoom - 1 / model.zoom
        if (rect && Math.abs(divisor) > 0.000001)
          gesture.zoomTo(
            intent.zoom,
            {
              x: rect.x + rect.width / 2 + ((intent.x ?? model.x) - model.x) / divisor,
              y: rect.y + rect.height / 2 + ((intent.y ?? model.y) - model.y) / divisor,
            },
            intent.rapid,
          )
        else gesture.zoomTo(intent.zoom, undefined, intent.rapid)
      }
    }
    if (model.notifiedZoom !== previous.notifiedZoom) options.onZoomChange?.(model.notifiedZoom)
    const indexChanged = model.index !== lastIndex || (model.options.dir ?? 'ltr') !== lastDirection
    if (indexChanged) {
      lastIndex = model.index
      lastDirection = model.options.dir ?? 'ltr'
      if (model.source !== 'scroll')
        snapToModel(model.source !== 'thumbnail' || model.options.scrubOnSelect === false)
      if (model.open && previous.open && model.index !== previous.index) {
        window.clearTimeout(scrollTriggerTimer)
        scrollTriggerTimer = window.setTimeout(() => {
          if (!disposed && model.open) scrollTrigger('onChange')
        }, 120)
        if (dialog.matches(':modal')) markMorphTarget(closingTrigger())
      }
      updateMaximum()
    }
    if (model.pull !== 0 || previous.pull !== 0 || Option.isSome(model.pullAnimation)) {
      const target = stage?.matches('[data-ramka-morph]')
        ? stage
        : ((stage && findOwned(stage, '[data-ramka-stage-morph]')) ??
          findOwned(dialog, '[data-ramka-item][data-active]') ??
          stage)
      if (target)
        target.style.transform =
          model.pull === 0 && !Option.isSome(model.pullAnimation)
            ? ''
            : `translate3d(${model.pullX}px,${model.pull}px,0) scale(${model.pullScale})`
    }
    if (model.phase === 'Closed' && !model.open) {
      if (dialog.open) dialog.close()
      if (portal) portal.style.visibility = 'hidden'
      return
    }
    if (activeGeneration === model.generation) return
    activeGeneration = model.generation
    if (!isOpenTarget(model) && model.phase !== 'Closing') return
    controller?.abort()
    controller = new window.AbortController()
    const transitionController = controller
    const generation = model.generation
    const open = isOpenTarget(model)
    const panel = dialog
    const sourceTrigger =
      triggers().find((trigger) => trigger.id === model.triggerId) ?? triggerFor(model.index)
    if (open) {
      closeFocusVisible = undefined
      if (
        model.transitionSource === 'internal' &&
        sourceTrigger &&
        model.triggerId !== sourceTrigger.id
      )
        emit(Message.OpenerResolved({ generation, id: sourceTrigger.id }))
      opener = model.triggerId
        ? sourceTrigger
        : document.activeElement instanceof window.HTMLElement &&
            document.activeElement !== document.body
          ? document.activeElement
          : sourceTrigger
      if (portal) portal.style.visibility = model.phase === 'Preparing' ? 'hidden' : 'visible'
    } else scrollTrigger('onClose')
    const target = closingTrigger()
    const crossfade = (open ? sourceTrigger : target)?.getAttribute('data-crossfade')
    const crossfadeOption =
      crossfade === 'open' || crossfade === 'close' || crossfade === 'both' ? { crossfade } : {}
    const commit = () => {
      if (transitionController.signal.aborted || disposed) return
      if (open) {
        if (panel.open) panel.close()
        if (portal) portal.style.visibility = 'visible'
        panel.showModal()
        guards?.lockScroll()
        if (!vtEnabled || model.transitionSource === 'external') guards?.applySelectionGuard()
        markMorphTarget(closingTrigger())
        panel.focus({ preventScroll: true })
        snapToModel(true)
        updateMaximum()
      } else {
        markMorphTarget(null)
        if (!isAndroidBlinkSnapshotRoot(document)) panel.close()
        if (portal) portal.style.visibility = 'hidden'
      }
      emit(
        Message.VisibilityCommitted({
          generation,
          open,
          retainPortal:
            !open &&
            vtEnabled &&
            model.transitionSource === 'internal' &&
            isAndroidBlinkSnapshotRoot(document),
        }),
      )
      return awaitCommit(generation, open, transitionController.signal).then(() => {
        if (open && !disposed && !transitionController.signal.aborted) {
          if (!panel.matches(':modal')) {
            if (panel.open) panel.close()
            panel.showModal()
          }
          panel.focus({ preventScroll: true })
          snapToModel(true)
          updateMaximum()
        }
      })
    }
    // oxlint-disable-next-line landmines-style/no-comments -- Native browser boundary directive.
    // @effect-diagnostics-next-line asyncFunction:off -- The native View Transition fallback must await DOM commit and browser animation promises.
    const withoutMorph = async () => {
      if (transitionController.signal.aborted) return
      if (open) await commit()
      else options.beforeClose?.({ destination: captureTarget() })
      // oxlint-disable-next-line landmines-style/no-comments -- Native browser boundary directive.
      // @effect-diagnostics-next-line newPromise:off -- Native requestAnimationFrame gates animation discovery after the rendered commit.
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      await Promise.allSettled(panel.getAnimations().map((animation) => animation.finished))
      if (!transitionController.signal.aborted && !open) await commit()
    }
    if (!open && isFirefox(document) && model.zoom > 1) gesture?.reset(true)
    const vtEnabled =
      (model.options.viewTransition ?? options.viewTransition ?? true) !== false &&
      typeof document.startViewTransition === 'function' &&
      !reduced.matches &&
      !isLowEndDevice(document)
    const performTransition = () =>
      getMorph().then(
        (resource) =>
          resource.transition({
            open,
            source: open ? triggerMedia(sourceTrigger) : captureTarget(),
            destination: open ? captureTarget() : triggerMedia(target),
            media: media(),
            panel,
            commit,
            signal: transitionController.signal,
            reducedMotion: reduced.matches,
            options: {
              ...options,
              ...crossfadeOption,
              ...(model.options.viewTransition === undefined
                ? {}
                : { viewTransition: model.options.viewTransition }),
            },
          }),
        withoutMorph,
      )
    void (
      model.transitionSource === 'external' || !vtEnabled || (!open && !model.open)
        ? withoutMorph()
        : performTransition()
    ).then(
      () => {
        if (
          disposed ||
          transitionController.signal.aborted ||
          model.generation !== generation ||
          settledGeneration === generation
        )
          return
        settledGeneration = generation
        if (open) {
          guards?.applySelectionGuard()
          scrollTrigger('onOpenComplete')
        } else {
          panel.close()
          guards?.dispose()
          guards = undefined
          if (model.transitionSource === 'internal') restoreFocus()
        }
        emit(Message.Settled({ generation, open }))
      },
      (error) => {
        if (disposed || transitionController.signal.aborted || model.generation !== generation)
          return
        markMorphTarget(null)
        panel.close()
        guards?.dispose()
        guards = undefined
        emit(
          Message.HostFailed({
            generation,
            detail: error instanceof Error ? error.message : String(error),
          }),
        )
      },
    )
  }
  const outsideThumbnailKeydown = (event: KeyboardEvent) => {
    if (!(event.target instanceof window.Node) || !dialog?.contains(event.target))
      thumbnailKeydown(event)
  }
  document.addEventListener('keydown', outsideThumbnailKeydown)
  document.addEventListener('focusin', publishThumbnailState)
  document.addEventListener('focusout', thumbnailFocusOut)
  document.addEventListener('click', clicked)
  document.addEventListener('pointerover', warmIntent)
  document.addEventListener('pointerdown', warmIntent, true)
  document.addEventListener('focusin', warmIntent)
  const observer = new window.MutationObserver(reconcile)
  observer.observe(element, {
    attributes: true,
    attributeFilter: ['data-ramka-model', 'data-ramka-container'],
  })
  reconcile()
  if (initialHydration)
    window.queueMicrotask(() => {
      initialHydration = false
      if (!disposed) snapToModel(true)
    })
  if (model.initialPaint) emit(Message.InitialPaintRetired())
  return () => {
    disposed = true
    observer.disconnect()
    controller?.abort()
    for (const waiter of commitAcknowledgements) waiter.done()
    morph?.dispose()
    window.clearTimeout(scrollTriggerTimer)
    document.removeEventListener('keydown', outsideThumbnailKeydown)
    document.removeEventListener('focusin', publishThumbnailState)
    document.removeEventListener('focusout', thumbnailFocusOut)
    document.removeEventListener('click', clicked)
    document.removeEventListener('pointerover', warmIntent)
    document.removeEventListener('pointerdown', warmIntent, true)
    document.removeEventListener('focusin', warmIntent)
    if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleWarmup)
    window.clearTimeout(idleWarmup)
    if (dialog?.open) {
      dialog.close()
      restoreFocus()
    }
    markMorphTarget(null)
    releaseParts()
    if (portal?.isConnected) {
      if (ownPortalParent?.isConnected)
        ownPortalParent.insertBefore(
          portal,
          ownPortalSibling?.parentNode === ownPortalParent ? ownPortalSibling : null,
        )
      else portal.remove()
    }
  }
}
