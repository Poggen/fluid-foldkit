// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
import { animateSingleValue } from 'motion-dom'
import { spring } from './lib/springs.js'
import { EXIT_COMPLETE_EVENT } from './motion.js'

export interface MessageScrollerObservation {
  readonly position: (atEnd: boolean, following: boolean) => void
  readonly buttonExited: (generation: number) => void
}
export const MESSAGE_SCROLLER_END_THRESHOLD = 24
const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

export function observeMessageScroller(
  root: Element,
  emit: MessageScrollerObservation,
): () => void {
  const window = root.ownerDocument.defaultView
  const viewport = root.querySelector<HTMLElement>('[data-message-viewport]')
  const spacer = root.querySelector<HTMLElement>('[data-message-spacer]')
  if (!window || !viewport || !spacer) return () => undefined
  let content: HTMLElement | null = null
  let anchor: HTMLElement | null = null
  let anchors = new Set<HTMLElement>()
  let following = true
  let writtenTop = -1
  let disposed = false
  let glide: ReturnType<typeof animateSingleValue<number>> | undefined
  let request = root.getAttribute('data-message-scroll-request')
  let previous: { readonly atEnd: boolean; readonly following: boolean } | undefined
  const maximum = () => Math.max(0, viewport.scrollHeight - viewport.clientHeight)
  const atEnd = () => maximum() - viewport.scrollTop <= MESSAGE_SCROLLER_END_THRESHOLD
  const publish = () => {
    if (disposed) return
    const next = { atEnd: atEnd(), following }
    if (previous?.atEnd !== next.atEnd || previous.following !== next.following) {
      previous = next
      emit.position(next.atEnd, next.following)
    }
  }
  const writeTop = (top: number) => {
    viewport.scrollTop = top
    writtenTop = viewport.scrollTop
  }
  const stop = () => {
    glide?.stop()
    glide = undefined
  }
  const fitSpacer = () => {
    let height = 0
    if (anchor && content?.contains(anchor)) {
      let anchorTop = 0
      let node: HTMLElement | null = anchor
      const seen = new Set<HTMLElement>()
      while (node && node !== viewport && !seen.has(node)) {
        seen.add(node)
        anchorTop += node.offsetTop
        const parent: Element | null = node.offsetParent
        node = parent instanceof window.HTMLElement ? parent : null
      }
      const peek = Number(root.getAttribute('data-message-peek') ?? 16)
      const padding = Number.parseFloat(window.getComputedStyle(viewport).paddingBottom) || 0
      const end = content.offsetTop + content.offsetHeight + padding
      height = Math.max(0, anchorTop - peek + viewport.clientHeight - end)
    }
    const value = `${height}px`
    if (spacer.style.height !== value) spacer.style.height = value
  }
  const reducedMotion = () => {
    const policy = root.getAttribute('data-message-reduced-motion')
    return (
      policy === 'always' ||
      (policy === 'user' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    )
  }
  const jump = () => {
    stop()
    following = true
    if (reducedMotion()) {
      writeTop(maximum())
      publish()
      return
    }
    const start = viewport.scrollTop
    glide = animateSingleValue(0, 1, {
      ...spring.slow,
      bounce: 0,
      onUpdate: (progress) => {
        if (!disposed) writeTop(start + (maximum() - start) * progress)
      },
      onComplete: () => {
        glide = undefined
        if (!disposed) {
          writeTop(maximum())
          publish()
        }
      },
    })
  }
  const resize = () => {
    if (disposed) return
    fitSpacer()
    if (root.getAttribute('data-message-auto-scroll') !== 'false' && following && !glide)
      writeTop(maximum())
    publish()
  }
  const observer =
    typeof window.ResizeObserver === 'undefined' ? undefined : new window.ResizeObserver(resize)
  const reconcileContent = () => {
    const next = root.querySelector<HTMLElement>('[data-message-content]')
    if (next !== content) {
      if (content) observer?.unobserve(content)
      content = next
      if (content) observer?.observe(content)
    }
  }
  reconcileContent()
  observer?.observe(viewport)
  anchors = new Set(root.querySelectorAll<HTMLElement>('[data-message-anchor]'))
  writeTop(maximum())
  publish()
  const mutation = new window.MutationObserver(() => {
    if (disposed) return
    reconcileContent()
    const next = new Set(root.querySelectorAll<HTMLElement>('[data-message-anchor]'))
    if (anchor && !next.has(anchor)) {
      anchor = null
      spacer.style.height = '0px'
    }
    const added = [...next].filter((row) => !anchors.has(row))
    anchors = next
    if (added.length > 0) {
      anchor = added.at(-1) ?? null
      fitSpacer()
      jump()
    }
    const nextRequest = root.getAttribute('data-message-scroll-request')
    if (nextRequest !== request) {
      request = nextRequest
      jump()
    }
    resize()
  })
  mutation.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      'data-message-anchor',
      'data-message-scroll-request',
      'data-message-auto-scroll',
      'data-message-peek',
      'data-message-reduced-motion',
    ],
  })
  const interrupt = () => {
    if (!glide) return
    stop()
    following = atEnd()
    publish()
  }
  const scroll = () => {
    if (Math.abs(viewport.scrollTop - writtenTop) < 1) return
    following = atEnd()
    publish()
  }
  const keydown = (event: KeyboardEvent) => {
    if (scrollKeys.has(event.key)) interrupt()
  }
  const completed = (event: Event) => {
    const node = event.target
    if (node instanceof window.HTMLElement && node.hasAttribute('data-message-button-generation'))
      emit.buttonExited(Number(node.getAttribute('data-message-button-generation')))
  }
  const click = (event: Event) => {
    const target = event.target
    if (event.defaultPrevented || !(target instanceof window.Element)) return
    const button = target.closest('[data-message-jump]')
    if (button?.closest('[data-message-scroll-request]') === root) jump()
  }
  root.addEventListener('click', click)
  viewport.addEventListener('scroll', scroll)
  viewport.addEventListener('wheel', interrupt, { passive: true })
  viewport.addEventListener('touchstart', interrupt, { passive: true })
  viewport.addEventListener('pointerdown', interrupt, { passive: true })
  viewport.addEventListener('keydown', keydown)
  root.addEventListener(EXIT_COMPLETE_EVENT, completed)
  return () => {
    disposed = true
    stop()
    observer?.disconnect()
    mutation.disconnect()
    viewport.removeEventListener('scroll', scroll)
    viewport.removeEventListener('wheel', interrupt)
    viewport.removeEventListener('touchstart', interrupt)
    viewport.removeEventListener('pointerdown', interrupt)
    viewport.removeEventListener('keydown', keydown)
    root.removeEventListener(EXIT_COMPLETE_EVENT, completed)
    root.removeEventListener('click', click)
    spacer.style.height = '0px'
  }
}
