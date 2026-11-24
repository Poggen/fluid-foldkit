// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest HappyDOM environment directive.
// @vitest-environment happy-dom
import { required } from './fixtures/required'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMorph } from '../src/morph'
import type { MorphRequest } from '../src/morph'
const browserWindow = required(document.defaultView)
function deferred() {
  let resolve = () => {}
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line newPromise:off -- This finite native-platform clock resolves independently from Effect so the real resource can exercise late delivery, cancellation and readiness races.
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const resources = new Set<ReturnType<typeof createMorph>>()
function fixture() {
  const source = document.createElement('button')
  const panel = document.createElement('div')
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('inert', '')
  panel.style.visibility = 'hidden'
  const destination = document.createElement('div')
  panel.append(destination)
  document.body.append(source, panel)
  for (const element of [source, destination]) {
    element.getBoundingClientRect = () => new DOMRect(20, 30, 100, 80)
  }
  const resource = createMorph(document)
  resources.add(resource)
  const controller = new AbortController()
  const commits: boolean[] = []
  const commit = () => {
    commits.push(true)
    panel.removeAttribute('inert')
    panel.style.removeProperty('visibility')
  }
  const request: MorphRequest = {
    open: true,
    source,
    destination,
    panel,
    commit,
    signal: controller.signal,
    reducedMotion: false,
  }
  return { source, panel, destination, resource, controller, commit, commits, request }
}
function viewTransitions() {
  const transitions: {
    update: () => Promise<void>
    finish: () => void
    skip: () => void
  }[] = []
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: (callback: () => void | Promise<void>) => {
      const finished = deferred()
      const ready = deferred()
      // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks superseding transitions; this settles only the native skipTransition ready and finished promises.
      const skip = vi.fn(() => {
        ready.resolve()
        finished.resolve()
      })
      transitions.push({
        // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
        // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
        update: async () => {
          await callback()
          ready.resolve()
          await Promise.resolve()
        },
        finish: finished.resolve,
        skip,
      })
      return {
        ready: ready.promise,
        finished: finished.promise,
        updateCallbackDone: ready.promise,
        skipTransition: skip,
      }
    },
  })
  return transitions
}
const savedNavigatorHints = [
  'deviceMemory',
  'hardwareConcurrency',
  'userAgent',
  'userAgentData',
].map((name) => ({
  name,
  descriptor: Object.getOwnPropertyDescriptor(browserWindow.navigator, name),
}))
const savedWindowHints = ['GestureEvent', 'mozInnerScreenX', 'chrome'].map((name) => ({
  name,
  descriptor: Object.getOwnPropertyDescriptor(browserWindow, name),
}))
beforeEach(() => {
  const css = browserWindow.CSS
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison covers View Transition fallback; this fixes the native CSS capability result unavailable in HappyDOM.
  vi.spyOn(css, 'supports').mockReturnValue(false)
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison covers View Transition fallback; this fixes the native CSS capability result unavailable in HappyDOM.
  vi.spyOn(browserWindow, 'CSS', 'get').mockReturnValue(css)
})
afterEach(() => {
  for (const resource of resources) resource.dispose()
  resources.clear()
  for (const { name, descriptor } of savedWindowHints) {
    if (descriptor) Object.defineProperty(browserWindow, name, descriptor)
    else Reflect.deleteProperty(browserWindow, name)
  }
  for (const { name, descriptor } of savedNavigatorHints) {
    if (descriptor) Object.defineProperty(browserWindow.navigator, name, descriptor)
    else Reflect.deleteProperty(browserWindow.navigator, name)
  }
  document.body.replaceChildren()
  document.head.replaceChildren()
  document.documentElement.removeAttribute('data-ramka-view-transition')
  document.documentElement.removeAttribute('data-ramka-vt-preset')
  document.documentElement.removeAttribute('data-ramka-vt-isolate')
  document.documentElement.removeAttribute('data-ramka-crossfade')
  Reflect.deleteProperty(document, 'startViewTransition')
  Reflect.deleteProperty(document, 'getAnimations')
  Reflect.deleteProperty(document, 'timeline')
  Reflect.deleteProperty(document.documentElement, 'animate')
  vi.restoreAllMocks()
  vi.useRealTimers()
})
describe('morph resource ownership', () => {
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('commits reduced motion immediately, while an already aborted request does no work', async () => {
    const { resource, request, commits, controller } = fixture()
    const transitions = viewTransitions()
    await resource.transition({ ...request, reducedMotion: true })
    expect(commits).toHaveLength(1)
    expect(transitions).toHaveLength(0)
    controller.abort()
    await resource.transition(request)
    expect(commits).toHaveLength(1)
    resource.dispose()
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('moves one shared name across the physical commit, restores owned values and releases sheets', async () => {
    const { resource, request, commits, source, destination, panel } = fixture()
    source.style.setProperty('view-transition-name', 'consumer-trigger', 'important')
    destination.style.setProperty('view-transition-name', 'consumer-destination')
    document.documentElement.style.setProperty('--lightbox-morph-radius-trigger', '7px')
    const transitions = viewTransitions()
    const operation = resource.transition(request)
    await Promise.resolve()
    expect(panel.hasAttribute('open')).toBe(false)
    expect(panel.hasAttribute('inert')).toBe(true)
    expect(panel.style.visibility).toBe('hidden')
    expect(commits).toHaveLength(0)
    expect(source.style.getPropertyValue('view-transition-name')).toBe('lightbox-morph')
    const transition = transitions[0]
    expect(transition).toBeDefined()
    await required(transition).update()
    expect(commits).toHaveLength(1)
    expect(panel.style.visibility).toBe('')
    expect(destination.style.getPropertyValue('view-transition-name')).toBe('lightbox-morph')
    required(transition).finish()
    await operation
    expect(source.style.getPropertyValue('view-transition-name')).toBe('consumer-trigger')
    expect(source.style.getPropertyPriority('view-transition-name')).toBe('important')
    expect(destination.style.getPropertyValue('view-transition-name')).toBe('consumer-destination')
    expect(document.documentElement.hasAttribute('data-ramka-view-transition')).toBe(false)
    resource.dispose()
    expect(document.documentElement.style.getPropertyValue('--lightbox-morph-radius-trigger')).toBe(
      '7px',
    )
    expect(document.adoptedStyleSheets).toHaveLength(0)
    document.documentElement.style.removeProperty('--lightbox-morph-radius-trigger')
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('aborts never-settling consumer readiness and commits once without leaving preparation behind', async () => {
    const { resource, request, controller, commits, panel } = fixture()
    const transitions = viewTransitions()
    const readiness: boolean[] = []
    const beforeOpen = () => {
      readiness.push(true)
      return deferred().promise
    }
    const operation = resource.transition({ ...request, options: { beforeOpen } })
    expect(readiness).toHaveLength(1)
    controller.abort()
    await operation
    expect(commits).toHaveLength(1)
    expect(panel.style.visibility).toBe('')
    expect(panel.hasAttribute('inert')).toBe(false)
    expect(transitions).toHaveLength(0)
    resource.dispose()
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('a superseded callback cannot commit again or erase the newer morph state', async () => {
    const { resource, request, commits } = fixture()
    const transitions = viewTransitions()
    const opening = resource.transition(request)
    await Promise.resolve()
    const closeCommit = vi.fn()
    const closing = resource.transition({
      ...request,
      open: false,
      source: request.destination,
      destination: request.source,
      commit: closeCommit,
    })
    expect(commits).toHaveLength(1)
    expect(required(transitions[0]).skip).toHaveBeenCalledTimes(1)
    await required(transitions[0]).update()
    await opening
    expect(commits).toHaveLength(1)
    expect(document.documentElement.getAttribute('data-ramka-view-transition')).toBe('closing')
    await required(transitions[1]).update()
    required(transitions[1]).finish()
    await closing
    expect(closeCommit).toHaveBeenCalledTimes(1)
    expect(document.documentElement.hasAttribute('data-ramka-view-transition')).toBe(false)
    resource.dispose()
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('a throwing readiness hook leaves the prepared view for its owner to retire', async () => {
    const { resource, request, panel, commits } = fixture()
    viewTransitions()
    await expect(
      resource.transition({
        ...request,
        options: {
          beforeOpen: () => {
            throw new Error('media failed')
          },
        },
      }),
    ).rejects.toThrow('media failed')
    expect(commits).toHaveLength(0)
    expect(panel.style.visibility).toBe('hidden')
    expect(panel.hasAttribute('inert')).toBe(true)
    resource.dispose()
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('cancels an unresolved image decode promptly and clears its timeout', async () => {
    vi.useFakeTimers()
    const { resource, request, controller, commits, destination } = fixture()
    viewTransitions()
    const image = document.createElement('img')
    destination.append(image)
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks image morph readiness; this controls only the native image.decode promise to test abort and timeout delivery.
    const decode = vi.fn(() => deferred().promise)
    Object.defineProperty(image, 'decode', { configurable: true, value: decode })
    const operation = resource.transition({ ...request, options: { awaitImageDecode: 200 } })
    await Promise.resolve()
    expect(decode).toHaveBeenCalledTimes(1)
    controller.abort()
    await operation
    expect(commits).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
    resource.dispose()
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('continues after the decode budget expires instead of blocking opening', async () => {
    vi.useFakeTimers()
    const { resource, request, commits, destination } = fixture()
    const transitions = viewTransitions()
    const image = document.createElement('img')
    destination.append(image)
    Object.defineProperty(image, 'decode', {
      configurable: true,
      // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
      // @effect-diagnostics-next-line newPromise:off -- This finite native-platform clock resolves independently from Effect so the real resource can exercise late delivery, cancellation and readiness races.
      value: () => new Promise<void>(() => {}),
    })
    const operation = resource.transition({
      ...request,
      options: { awaitImageDecode: 200 },
    })
    await vi.advanceTimersByTimeAsync(199)
    expect(commits).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    await required(transitions[0]).update()
    required(transitions[0]).finish()
    await operation
    expect(commits).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
    resource.dispose()
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('disposal skips an active snapshot and leaves no destination name behind', async () => {
    const { resource, request, commits, destination } = fixture()
    const transitions = viewTransitions()
    const operation = resource.transition(request)
    await required(transitions[0]).update()
    resource.dispose()
    await operation
    expect(commits).toHaveLength(1)
    expect(required(transitions[0]).skip).toHaveBeenCalledTimes(1)
    expect(destination.style.getPropertyValue('view-transition-name')).toBe('')
    expect(document.documentElement.hasAttribute('data-ramka-view-transition')).toBe(false)
    expect(document.adoptedStyleSheets).toHaveLength(0)
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('commits even when the browser skips before calling the update callback', async () => {
    const { resource, request, commits, destination } = fixture()
    const transitions = viewTransitions()
    const operation = resource.transition(request)
    required(transitions[0]).skip()
    await operation
    expect(commits).toHaveLength(1)
    await required(transitions[0]).update()
    expect(commits).toHaveLength(1)
    expect(destination.style.getPropertyValue('view-transition-name')).toBe('')
    resource.dispose()
  })
  it.each(['finished', 'cancelled'] as const)(
    'keeps the closing dialog present until the consumer animation is %s',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async (outcome) => {
      const { resource, request, panel, commits } = fixture()
      panel.removeAttribute('inert')
      panel.style.removeProperty('visibility')
      let settle = () => {}
      // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
      // @effect-diagnostics-next-line newPromise:off -- This finite native-platform clock resolves independently from Effect so the real resource can exercise late delivery, cancellation and readiness races.
      const finished = new Promise<void>((resolve, reject) => {
        settle = outcome === 'finished' ? resolve : () => reject(new Error('Animation cancelled'))
      })
      const animate = vi.fn()
      Object.defineProperty(panel, 'animate', { configurable: true, value: animate })
      Object.defineProperty(panel, 'getAnimations', {
        configurable: true,
        value: () => [{ finished }],
      })
      const beforeClose = vi.fn()
      const operation = resource.transition({ ...request, open: false, options: { beforeClose } })
      expect(beforeClose).toHaveBeenCalledWith({ destination: request.source })
      expect(commits).toHaveLength(0)
      expect(animate).not.toHaveBeenCalled()
      settle()
      await operation
      expect(commits).toHaveLength(1)
      resource.dispose()
    },
  )
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('notifies beforeClose even for an immediate reduced-motion close', async () => {
    const { resource, request, commit } = fixture()
    const order: string[] = []
    await resource.transition({
      ...request,
      open: false,
      reducedMotion: true,
      commit: () => {
        order.push('commit')
        commit()
      },
      options: {
        beforeClose: () => {
          order.push('hook')
        },
      },
    })
    expect(order).toEqual(['hook', 'commit'])
    resource.dispose()
  })
})
function thumbnailFixture() {
  const result = fixture()
  const thumbnail = document.createElement('img')
  Object.defineProperties(thumbnail, {
    complete: { configurable: true, value: true },
    naturalWidth: { configurable: true, value: 100 },
    naturalHeight: { configurable: true, value: 50 },
    currentSrc: { configurable: true, value: 'https://example.test/thumbnail.jpg' },
  })
  result.source.append(thumbnail)
  const image = document.createElement('img')
  Object.defineProperties(image, {
    complete: { configurable: true, value: false },
    naturalWidth: { configurable: true, value: 0 },
    clientWidth: { configurable: true, value: 200 },
    clientHeight: { configurable: true, value: 100 },
  })
  image.style.setProperty('background-image', 'linear-gradient(red, blue)', 'important')
  image.style.backgroundSize = '10px 10px'
  image.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100)
  result.destination.append(image)
  return {
    ...result,
    image,
    request: { ...result.request, destination: image, options: { awaitImageDecode: false } },
  }
}
describe('open thumbnail bridge retirement', () => {
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('retains a replaced image background across settlement until decode and two frames paint', async () => {
    vi.useFakeTimers()
    const { resource, request, image } = thumbnailFixture()
    const transitions = viewTransitions()
    const painted = deferred()
    Object.defineProperty(image, 'decode', { configurable: true, value: () => painted.promise })
    const operation = resource.transition(request)
    expect(image.style.backgroundImage).toContain('thumbnail.jpg')
    expect(image.querySelector('canvas')).toBeNull()
    await required(transitions[0]).update()
    required(transitions[0]).finish()
    await operation
    expect(image.style.backgroundImage).toContain('thumbnail.jpg')
    image.dispatchEvent(new Event('load'))
    await vi.advanceTimersByTimeAsync(40)
    expect(image.style.backgroundImage).toContain('thumbnail.jpg')
    painted.resolve()
    await vi.advanceTimersByTimeAsync(40)
    expect(image.style.backgroundImage).toBe('linear-gradient(red, blue)')
    expect(image.style.getPropertyPriority('background-image')).toBe('important')
    expect(image.style.backgroundSize).toBe('10px 10px')
    resource.dispose()
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('keeps already-painted thumbnail pixels through the unfinished transition', async () => {
    vi.useFakeTimers()
    const { resource, request, image } = thumbnailFixture()
    const transitions = viewTransitions()
    Object.defineProperty(image, 'decode', { configurable: true, value: () => Promise.resolve() })
    const operation = resource.transition(request)
    await required(transitions[0]).update()
    image.dispatchEvent(new Event('load'))
    await vi.advanceTimersByTimeAsync(40)
    expect(image.style.backgroundImage).toContain('thumbnail.jpg')
    required(transitions[0]).finish()
    await operation
    expect(image.style.backgroundImage).toBe('linear-gradient(red, blue)')
    resource.dispose()
  })
  it.each(['abort', 'error', 'dispose'] as const)(
    'restores the bridge immediately on %s',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async (reason) => {
      const { resource, request, controller, image } = thumbnailFixture()
      const transitions = viewTransitions()
      const operation = resource.transition(request)
      expect(image.style.backgroundImage).toContain('thumbnail.jpg')
      if (reason === 'abort') controller.abort()
      if (reason === 'error') image.dispatchEvent(new Event('error'))
      if (reason === 'dispose') resource.dispose()
      expect(image.style.backgroundImage).toBe('linear-gradient(red, blue)')
      required(transitions[0]).finish()
      await operation
      resource.dispose()
    },
  )
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('restores a bridge retained after settlement when the resource is disposed', async () => {
    const { resource, request, image } = thumbnailFixture()
    const transitions = viewTransitions()
    const operation = resource.transition(request)
    await required(transitions[0]).update()
    required(transitions[0]).finish()
    await operation
    expect(image.style.backgroundImage).toContain('thumbnail.jpg')
    resource.dispose()
    expect(image.style.backgroundImage).toBe('linear-gradient(red, blue)')
    image.dispatchEvent(new Event('load'))
    expect(image.style.backgroundImage).toBe('linear-gradient(red, blue)')
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('restores the bridge if consumer readiness throws', async () => {
    const { resource, request, image } = thumbnailFixture()
    viewTransitions()
    await expect(
      resource.transition({
        ...request,
        options: {
          awaitImageDecode: false,
          beforeOpen: () => {
            throw new Error('readiness failed')
          },
        },
      }),
    ).rejects.toThrow('readiness failed')
    expect(image.style.backgroundImage).toBe('linear-gradient(red, blue)')
    resource.dispose()
  })
  it.each([null, '/authored-poster.jpg'])(
    'bridges a video without replacing an authored poster (%s)',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async (poster) => {
      const { resource, request, destination } = thumbnailFixture()
      const video = document.createElement('video')
      if (poster) video.setAttribute('poster', poster)
      destination.replaceChildren(video)
      video.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100)
      const transitions = viewTransitions()
      const operation = resource.transition({ ...request, destination: video })
      expect(video.getAttribute('poster')).toBe(poster ?? 'https://example.test/thumbnail.jpg')
      await required(transitions[0]).update()
      required(transitions[0]).finish()
      await operation
      resource.dispose()
      expect(video.getAttribute('poster')).toBe(poster)
      expect(video.querySelector('canvas')).toBeNull()
    },
  )
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('retires a retained bridge when the next close begins', async () => {
    const { resource, request, image } = thumbnailFixture()
    const transitions = viewTransitions()
    const operation = resource.transition(request)
    await required(transitions[0]).update()
    required(transitions[0]).finish()
    await operation
    expect(image.style.backgroundImage).toContain('thumbnail.jpg')
    const closing = resource.transition({
      ...request,
      open: false,
      source: image,
      destination: request.source,
    })
    expect(image.style.backgroundImage).toBe('linear-gradient(red, blue)')
    await required(transitions[1]).update()
    required(transitions[1]).finish()
    await closing
    resource.dispose()
  })
})
describe('upstream low-end capability policy', () => {
  it.each([
    [2, 8, false],
    [8, 2, false],
    [4, 4, true],
    [8, 8, true],
    [undefined, undefined, true],
    ['2', undefined, true],
  ] as const)(
    'chooses snapshots for memory=%s, cores=%s only when capable',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async (memory, cores, useSnapshot) => {
      Object.defineProperty(browserWindow.navigator, 'deviceMemory', {
        configurable: true,
        value: memory,
      })
      Object.defineProperty(browserWindow.navigator, 'hardwareConcurrency', {
        configurable: true,
        value: cores,
      })
      const { resource, request, commits } = fixture()
      const transitions = viewTransitions()
      const operation = resource.transition(request)
      expect(transitions).toHaveLength(useSnapshot ? 1 : 0)
      if (useSnapshot) {
        await required(transitions[0]).update()
        required(transitions[0]).finish()
      }
      await operation
      expect(commits).toHaveLength(1)
      resource.dispose()
    },
  )
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('skips morph readiness on low memory and observes the consumer enter animation', async () => {
    Object.defineProperty(browserWindow.navigator, 'deviceMemory', { configurable: true, value: 2 })
    const clock = renderClock()
    const { resource, request, commits, panel, destination } = fixture()
    const transitions = viewTransitions()
    const image = document.createElement('img')
    destination.append(image)
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks image morph readiness; this controls only the native image.decode promise to test abort and timeout delivery.
    const decode = vi.fn(() => deferred().promise)
    Object.defineProperty(image, 'decode', { configurable: true, value: decode })
    const fade = deferred()
    const animate = vi.fn()
    Object.defineProperty(panel, 'animate', { configurable: true, value: animate })
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks enter animations; this controls only the native getAnimations completion promise for retirement races.
    const getAnimations = vi.fn(() => [{ finished: fade.promise }])
    Object.defineProperty(panel, 'getAnimations', { configurable: true, value: getAnimations })
    const readiness: boolean[] = []
    const beforeOpen = () => {
      readiness.push(true)
      return deferred().promise
    }
    const operation = resource.transition({ ...request, options: { beforeOpen } })
    expect(readiness).toHaveLength(0)
    expect(decode).not.toHaveBeenCalled()
    expect(commits).toHaveLength(1)
    expect(animate).not.toHaveBeenCalled()
    expect(getAnimations).not.toHaveBeenCalled()
    await clock.frame()
    expect(getAnimations).toHaveBeenCalledTimes(1)
    expect(transitions).toHaveLength(0)
    fade.resolve()
    await operation
    resource.dispose()
  })
})
function renderClock() {
  let nextHandle = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: production motion comparisons check interruption and retirement; this controls external RAF delivery to reproduce late acknowledgement races.
  vi.spyOn(browserWindow, 'requestAnimationFrame').mockImplementation((callback) => {
    callbacks.set(++nextHandle, callback)
    return nextHandle
  })
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: production motion comparisons check interruption and retirement; this controls external RAF delivery to reproduce late acknowledgement races.
  vi.spyOn(browserWindow, 'cancelAnimationFrame').mockImplementation((handle) => {
    callbacks.delete(handle)
  })
  return {
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async frame() {
      const ready = [...callbacks.values()]
      callbacks.clear()
      for (const callback of ready) callback(performance.now())
      for (let i = 0; i < 8; i++) await Promise.resolve()
    },
    pending: () => callbacks.size,
  }
}
describe('shared stage media readiness', () => {
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('decodes the active media while the consumer hook receives the shared capture surface', async () => {
    const { resource, request, panel, destination } = fixture()
    const decorative = document.createElement('img')
    destination.append(decorative)
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks image morph readiness; this controls only the native image.decode promise to test abort and timeout delivery.
    const decorativeDecode = vi.fn(() => deferred().promise)
    Object.defineProperty(decorative, 'decode', { configurable: true, value: decorativeDecode })
    const media = document.createElement('img')
    panel.append(media)
    const decoded = deferred()
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks image morph readiness; this controls only the native image.decode promise to test abort and timeout delivery.
    const mediaDecode = vi.fn(() => decoded.promise)
    Object.defineProperty(media, 'decode', { configurable: true, value: mediaDecode })
    const beforeOpen = vi.fn()
    const transitions = viewTransitions()
    const operation = resource.transition({ ...request, media, options: { beforeOpen } })
    await Promise.resolve()
    expect(mediaDecode).toHaveBeenCalledTimes(1)
    expect(decorativeDecode).not.toHaveBeenCalled()
    expect(transitions).toHaveLength(0)
    decoded.resolve()
    for (let i = 0; i < 12; i++) await Promise.resolve()
    expect(beforeOpen).toHaveBeenCalledWith(expect.objectContaining({ destination }))
    expect(transitions).toHaveLength(1)
    await required(transitions[0]).update()
    required(transitions[0]).finish()
    await operation
    resource.dispose()
  })
})
describe('upstream capture scheduling', () => {
  it.each([
    {
      name: 'Android Chrome',
      ua: 'Android Chrome/130.0',
      mobile: undefined,
      engine: '',
      wait: true,
    },
    { name: 'UA-CH mobile Blink', ua: 'Reduced UA', mobile: true, engine: 'chrome', wait: true },
    {
      name: 'desktop UA-CH override',
      ua: 'Android Chrome/130.0',
      mobile: false,
      engine: 'chrome',
      wait: false,
    },
    {
      name: 'WebKit with a spoofed Android UA',
      ua: 'Android Chrome/130.0',
      mobile: true,
      engine: 'GestureEvent',
      wait: false,
    },
    {
      name: 'Gecko responsive preview',
      ua: 'Android Chrome/130.0',
      mobile: true,
      engine: 'mozInnerScreenX',
      wait: false,
    },
  ])(
    'stabilizes the snapshot root only for $name when needed',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async ({ ua, mobile, engine, wait }) => {
      Object.defineProperty(browserWindow.navigator, 'userAgent', { configurable: true, value: ua })
      Object.defineProperty(browserWindow.navigator, 'userAgentData', {
        configurable: true,
        value: { mobile },
      })
      for (const hint of ['chrome', 'GestureEvent', 'mozInnerScreenX'])
        Reflect.deleteProperty(browserWindow, hint)
      if (engine) Object.defineProperty(browserWindow, engine, { configurable: true, value: {} })
      const clock = renderClock()
      const { resource, request, controller } = fixture()
      const transitions = viewTransitions()
      const operation = resource.transition(request)
      try {
        expect(transitions).toHaveLength(wait ? 0 : 1)
        expect(clock.pending()).toBe(wait ? 1 : 0)
      } finally {
        controller.abort()
        await operation
        resource.dispose()
      }
    },
  )
  it.each([false, true])(
    'yields %s readiness opens for only the required capture frames',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async (hasReadiness) => {
      const clock = renderClock()
      const { resource, request, controller } = fixture()
      const heavyPage = document.createElement('div')
      heavyPage.innerHTML = '<span></span>'.repeat(2500)
      document.body.append(heavyPage)
      const transitions = viewTransitions()
      const operation = resource.transition({
        ...request,
        options: hasReadiness ? { beforeOpen: () => Promise.resolve() } : {},
      })
      try {
        for (let i = 0; i < 8; i++) await Promise.resolve()
        expect(transitions).toHaveLength(0)
        await clock.frame()
        expect(transitions).toHaveLength(hasReadiness ? 1 : 0)
        if (!hasReadiness) {
          await clock.frame()
          expect(transitions).toHaveLength(1)
        }
      } finally {
        controller.abort()
        await operation
        resource.dispose()
      }
    },
  )
})
function compositorFixture(
  args: {
    firefox?: boolean
    webkit?: boolean
    frames?: Keyframe[]
    failAfter?: number
  } = {},
) {
  const result = fixture()
  result.source.getBoundingClientRect = () => new DOMRect(100, 200, 200, 150)
  result.destination.getBoundingClientRect = () => new DOMRect(0, 0, 800, 600)
  if (args.firefox)
    Object.defineProperty(browserWindow, 'mozInnerScreenX', { configurable: true, value: 0 })
  if (args.webkit)
    Object.defineProperty(browserWindow, 'GestureEvent', { configurable: true, value: class {} })
  const ua = {
    animationName: '-ua-view-transition-group-anim-lightbox-morph',
    effect: {
      pseudoElement: '::view-transition-group(lightbox-morph)',
      getKeyframes: () =>
        args.frames ?? [
          { offset: 0, transform: 'matrix(1, 0, 0, 1, 100, 200)', width: '200px', height: '150px' },
          { offset: 1, transform: 'matrix(1, 0, 0, 1, 0, 0)', width: '800px', height: '600px' },
        ],
      getComputedTiming: () => ({ duration: 360 }),
    },
    currentTime: 60,
    cancel: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
  }
  const tracks: {
    frames: Keyframe[]
    options: KeyframeAnimationOptions
    animation: {
      cancel: ReturnType<typeof vi.fn>
      currentTime: number | null
      startTime: number | null
    }
  }[] = []
  const cssTracks: {
    animationName: string
    currentTime: number
    startTime: number | null
    effect: { pseudoElement: string; frames: Keyframe[]; setKeyframes(frames: Keyframe[]): void }
  }[] = ['group', 'radius', 'old', 'new'].map<(typeof cssTracks)[number]>((track) => ({
    animationName: `ramka-vt-cm-${track}`,
    currentTime: 0,
    startTime: null,
    effect: {
      pseudoElement: `::view-transition-${track === 'radius' ? 'group' : track}(lightbox-morph)`,
      frames: [],
      setKeyframes(frames: Keyframe[]) {
        this.frames = frames
      },
    },
  }))
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () =>
      args.webkit && document.documentElement.hasAttribute('data-ramka-vt-composited-css')
        ? cssTracks
        : [ua],
  })
  Object.defineProperty(document, 'timeline', { configurable: true, value: { currentTime: 5000 } })
  Object.defineProperty(document.documentElement, 'animate', {
    configurable: true,
    value: (frames: Keyframe[], options: KeyframeAnimationOptions) => {
      if (args.failAfter !== undefined && tracks.length >= args.failAfter)
        throw new Error('Unsupported pseudo animation')
      const animation: (typeof tracks)[number]['animation'] = {
        cancel: vi.fn(),
        currentTime: null,
        startTime: null,
      }
      tracks.push({ frames, options, animation })
      return animation
    },
  })
  const computed = browserWindow.getComputedStyle.bind(browserWindow)
  const pseudoStyle = document.createElement('div').style
  pseudoStyle.transform = 'matrix(1, 0, 0, 1, 0, 0)'
  pseudoStyle.width = '800px'
  pseudoStyle.height = '600px'
  pseudoStyle.transformOrigin = '400px 300px'
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks pseudo-element tracks; HappyDOM cannot compute View Transition pseudo-element styles.
  vi.spyOn(browserWindow, 'getComputedStyle').mockImplementation((element, pseudo) =>
    pseudo ? pseudoStyle : computed(element),
  )
  const transitions = viewTransitions()
  return { ...result, ua, tracks, cssTracks, transitions, pseudoStyle }
}
describe('composited morph output', () => {
  it.each([false, true])(
    'keeps painted progress without a cold-start jump (Gecko=%s)',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async (firefox) => {
      const { resource, request, ua, tracks, transitions } = compositorFixture({ firefox })
      const operation = resource.transition(request)
      await required(transitions[0]).update()
      expect(ua.cancel).toHaveBeenCalledTimes(1)
      expect(tracks.map(({ options }) => options.pseudoElement)).toEqual([
        '::view-transition-group(lightbox-morph)',
        '::view-transition-old(lightbox-morph)',
        '::view-transition-new(lightbox-morph)',
      ])
      expect(required(required(tracks[0]).frames[0]).transform).toBe(
        'translate(100px, 200px) scale(0.25, 0.25)',
      )
      expect(required(required(tracks[0]).frames.at(-1)).transform).toBe(
        'translate(0px, 0px) scale(1, 1)',
      )
      for (const { frames, options, animation } of tracks) {
        expect(options).toMatchObject({ duration: 360, easing: 'linear', fill: 'both' })
        expect(frames.length).toBeGreaterThan(20)
        expect(animation.startTime).toBe(firefox ? 4940 : null)
        expect(animation.currentTime).toBe(firefox ? null : 60)
      }
      required(transitions[0]).finish()
      await operation
      for (const { animation } of tracks) expect(animation.cancel).toHaveBeenCalled()
      resource.dispose()
    },
  )
  it.each([false, 'open', 'close', 'both'] as const)(
    'preserves snapshot dissolve selection for %s',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async (crossfade) => {
      const { resource, request, source, tracks, transitions } = compositorFixture()
      source.style.borderRadius = '16px'
      const operation = resource.transition({ ...request, options: { crossfade } })
      await required(transitions[0]).update()
      const dissolve = crossfade === 'open' || crossfade === 'both'
      expect(tracks).toHaveLength(dissolve ? 2 : 4)
      expect(required(tracks[0]).frames[0]).not.toHaveProperty('borderRadius')
      expect(required(tracks[1]).frames[0]).toHaveProperty('borderRadius')
      expect(required(tracks[1]).options.pseudoElement).toBe(
        '::view-transition-group(lightbox-morph)',
      )
      required(transitions[0]).finish()
      await operation
      resource.dispose()
    },
  )
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('rolls a partially created replacement back to the stock animation', async () => {
    const { resource, request, ua, tracks, transitions } = compositorFixture({ failAfter: 1 })
    const operation = resource.transition(request)
    await required(transitions[0]).update()
    expect(tracks).toHaveLength(1)
    expect(required(tracks[0]).animation.cancel).toHaveBeenCalled()
    expect(ua.currentTime).toBe(0)
    expect(ua.play).toHaveBeenCalled()
    expect(document.documentElement.hasAttribute('data-ramka-vt-composited')).toBe(false)
    required(transitions[0]).finish()
    await operation
    resource.dispose()
  })
  it.each([
    'matrix(0, 1, -1, 0, 100, 200)',
    'matrix(-1, 0, 0, 1, 100, 200)',
    'matrix3d(1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100, 200, 0, 1)',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  ])('leaves unsafe transform %s on the stock morph', async (transform) => {
    const { resource, request, ua, tracks, transitions } = compositorFixture({
      frames: [{ offset: 0, transform, width: '200px', height: '150px' }],
    })
    const operation = resource.transition(request)
    await required(transitions[0]).update()
    expect(tracks).toHaveLength(0)
    expect(ua.cancel).not.toHaveBeenCalled()
    required(transitions[0]).finish()
    await operation
    resource.dispose()
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('uses WebKit CSS effects without mutating rules or their CSS clocks', async () => {
    vi.useFakeTimers()
    const { resource, request, source, ua, tracks, cssTracks, transitions } = compositorFixture({
      webkit: true,
    })
    source.getBoundingClientRect = () => new DOMRect(300, 40, 200, 150)
    resource.prewarm()
    const prewarmedSheets = [...document.adoptedStyleSheets]
    const operation = resource.transition(request)
    await required(transitions[0]).update()
    expect(document.adoptedStyleSheets).toEqual(prewarmedSheets)
    expect(document.documentElement.style.getPropertyValue('--lightbox-morph-radius-trigger')).toBe(
      '',
    )
    expect(ua.cancel).toHaveBeenCalled()
    expect(tracks).toHaveLength(0)
    const rules = () => document.adoptedStyleSheets.flatMap((sheet) => Array.from(sheet.cssRules))
    const group = rules().find(
      (rule) => rule instanceof CSSKeyframesRule && rule.name === 'ramka-vt-cm-group',
    )
    expect(group).toBeDefined()
    expect(required(required(cssTracks[0]).effect.frames[0]).transform).toBe(
      'translate(300px, 40px) scale(0.25, 0.25)',
    )
    expect(cssTracks.every((track) => track.currentTime === 0 && track.startTime === null)).toBe(
      true,
    )
    const staticRules = rules()
    expect(document.documentElement.hasAttribute('data-ramka-vt-composited-css')).toBe(true)
    required(transitions[0]).finish()
    await operation
    expect(document.documentElement.hasAttribute('data-ramka-vt-composited-css')).toBe(false)
    expect(
      rules().some((rule) => rule instanceof CSSKeyframesRule && rule.name === 'ramka-vt-cm-group'),
    ).toBe(true)
    await vi.advanceTimersByTimeAsync(1500)
    expect(rules()).toEqual(staticRules)
    resource.dispose()
    expect(document.adoptedStyleSheets).toHaveLength(0)
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('retains inert radii between open/close without repeated root-variable invalidations', async () => {
    const { resource, request, source, destination } = fixture()
    source.style.borderRadius = '12px'
    destination.style.borderRadius = '24px'
    document.documentElement.style.setProperty(
      '--lightbox-morph-radius-trigger',
      '7px',
      'important',
    )
    const transitions = viewTransitions()
    const opening = resource.transition(request)
    await required(transitions[0]).update()
    required(transitions[0]).finish()
    await opening
    const writes = vi.spyOn(document.documentElement.style, 'setProperty')
    const removals = vi.spyOn(document.documentElement.style, 'removeProperty')
    const closing = resource.transition({
      ...request,
      open: false,
      source: destination,
      destination: source,
    })
    await required(transitions[1]).update()
    required(transitions[1]).finish()
    await closing
    const radiusWrites = writes.mock.calls.filter(([name]) =>
      name.startsWith('--lightbox-morph-radius-'),
    )
    const radiusRemovals = removals.mock.calls.filter(([name]) =>
      name.startsWith('--lightbox-morph-radius-'),
    )
    expect(radiusWrites).toHaveLength(0)
    expect(radiusRemovals).toHaveLength(0)
    resource.dispose()
    expect(document.documentElement.style.getPropertyValue('--lightbox-morph-radius-trigger')).toBe(
      '7px',
    )
    expect(
      document.documentElement.style.getPropertyPriority('--lightbox-morph-radius-trigger'),
    ).toBe('important')
    document.documentElement.style.removeProperty('--lightbox-morph-radius-trigger')
  })
})
describe('Foldkit physical commit acknowledgement', () => {
  it.each([
    { open: true, reducedMotion: true },
    { open: false, reducedMotion: false },
  ])(
    'waits for $open / reduced=$reducedMotion acknowledgement before reporting completion',
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
    async ({ open, reducedMotion }) => {
      const { resource, request } = fixture()
      const acknowledged = deferred()
      const commits: boolean[] = []
      const commit = () => {
        commits.push(true)
        return acknowledged.promise
      }
      let settled = false
      const operation = resource
        .transition({ ...request, open, reducedMotion, commit })
        .then(() => {
          settled = true
        })
      for (let i = 0; i < 8; i++) await Promise.resolve()
      expect(commits).toHaveLength(1)
      expect(settled).toBe(false)
      acknowledged.resolve()
      await operation
      expect(settled).toBe(true)
    },
  )
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('propagates a rejected view acknowledgement and cleans captured names', async () => {
    const { resource, request, source, destination } = fixture()
    const transitions = viewTransitions()
    const failure = new Error('view commit failed')
    const commits: boolean[] = []
    const commit = () => {
      commits.push(true)
      return Promise.reject(failure)
    }
    const operation = resource.transition({ ...request, commit })
    const rejected = expect(operation).rejects.toBe(failure)
    await expect(required(transitions[0]).update()).rejects.toBe(failure)
    required(transitions[0]).finish()
    await rejected
    expect(commits).toHaveLength(1)
    expect(source.style.getPropertyValue('view-transition-name')).toBe('')
    expect(destination.style.getPropertyValue('view-transition-name')).toBe('')
    expect(document.documentElement.hasAttribute('data-ramka-view-transition')).toBe(false)
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('keeps capture ownership on the source until the rendered view acknowledges commit', async () => {
    const { resource, request, source, destination } = fixture()
    const transitions = viewTransitions()
    const acknowledged = deferred()
    const commits: boolean[] = []
    const commit = () => {
      commits.push(true)
      return acknowledged.promise
    }
    const operation = resource.transition({ ...request, commit })
    const update = required(transitions[0]).update()
    expect(commits).toHaveLength(1)
    expect(source.style.getPropertyValue('view-transition-name')).toBe('lightbox-morph')
    expect(destination.style.getPropertyValue('view-transition-name')).toBe('none')
    acknowledged.resolve()
    await update
    expect(source.style.getPropertyValue('view-transition-name')).toBe('none')
    expect(destination.style.getPropertyValue('view-transition-name')).toBe('lightbox-morph')
    required(transitions[0]).finish()
    await operation
    expect(commits).toHaveLength(1)
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- The accepted view may replace its native destination before acknowledging the browser capture callback.
  it('captures the accepted reveal destination and restores both endpoint names', async () => {
    const { resource, request, panel, destination } = fixture()
    const transitions = viewTransitions()
    const acknowledged = deferred()
    const rendered = document.createElement('div')
    destination.style.setProperty('view-transition-name', 'prepared-target', 'important')
    rendered.style.setProperty('view-transition-name', 'rendered-target', 'important')
    const operation = resource.transition({
      ...request,
      resolveDestination: () => panel.querySelector<HTMLElement>('div'),
      commit: () => acknowledged.promise,
    })
    const update = required(transitions[0]).update()
    destination.replaceWith(rendered)
    acknowledged.resolve()
    await update
    expect(rendered.style.getPropertyValue('view-transition-name')).toBe('lightbox-morph')
    required(transitions[0]).finish()
    await operation
    expect(destination.style.getPropertyValue('view-transition-name')).toBe('prepared-target')
    expect(destination.style.getPropertyPriority('view-transition-name')).toBe('important')
    expect(rendered.style.getPropertyValue('view-transition-name')).toBe('rendered-target')
    expect(rendered.style.getPropertyPriority('view-transition-name')).toBe('important')
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('aborts a pending view acknowledgement without allowing its late completion to restore capture names', async () => {
    const { resource, request, source, destination, controller } = fixture()
    const transitions = viewTransitions()
    const acknowledged = deferred()
    const operation = resource.transition({ ...request, commit: () => acknowledged.promise })
    const update = required(transitions[0]).update()
    controller.abort()
    await operation
    await update
    expect(source.style.getPropertyValue('view-transition-name')).toBe('')
    expect(destination.style.getPropertyValue('view-transition-name')).toBe('')
    acknowledged.resolve()
    await Promise.resolve()
    expect(source.style.getPropertyValue('view-transition-name')).toBe('')
    expect(destination.style.getPropertyValue('view-transition-name')).toBe('')
  })
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Vitest awaits this native browser-resource callback as a Promise; preserving platform microtask order is part of the scenario.
  it('observes fallback consumer animations only after the view commit is acknowledged', async () => {
    const { resource, request, panel } = fixture()
    const clock = renderClock()
    const acknowledged = deferred()
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- Native keeper: the 84-case production comparison checks enter animations; this controls only the native getAnimations completion promise for retirement races.
    const getAnimations = vi.fn(() => [])
    Object.defineProperty(panel, 'getAnimations', { configurable: true, value: getAnimations })
    const operation = resource.transition({ ...request, commit: () => acknowledged.promise })
    await clock.frame()
    expect(getAnimations).not.toHaveBeenCalled()
    acknowledged.resolve()
    for (let i = 0; i < 8; i++) await Promise.resolve()
    await clock.frame()
    await operation
    expect(getAnimations).toHaveBeenCalledTimes(1)
  })
})
