export const popupVisible: (element: Element, ancestor?: boolean) => boolean = function (
  element: Element,
  ancestor = false,
) {
  const styles = element.ownerDocument.defaultView?.getComputedStyle(element)

  if (!styles) return false satisfies boolean

  if (ancestor) return (styles.display !== 'none') satisfies boolean

  if (styles.visibility === 'hidden' || styles.visibility === 'collapse')
    return false satisfies boolean

  return (
    typeof element.checkVisibility === 'function'
      ? element.checkVisibility()
      : styles.display !== 'none' && styles.display !== 'contents'
  ) satisfies boolean
}

const summary: (element: Element) => Element | undefined = function summary(element: Element) {
  return Array.from(element.children).find((child) => child.localName === 'summary')
}

const parent: (element: Element) => Element | null = function parent(element: Element) {
  if (element.assignedSlot) return element.assignedSlot

  if (element.parentElement) return element.parentElement
  const root = element.getRootNode()
  const window = element.ownerDocument.defaultView

  return window && root instanceof window.ShadowRoot ? root.host : null
}

const tabIndex: (element: FocusTarget) => number = function tabIndex(element: FocusTarget) {
  const window = element.ownerDocument.defaultView

  if (
    element.tabIndex < 0 &&
    (['details', 'audio', 'video'].includes(element.localName) ||
      (window && element instanceof window.HTMLElement && element.isContentEditable))
  )
    return 0

  return element.tabIndex
}

const radio: (element: Element) => HTMLInputElement | null = function radio(element: Element) {
  const window = element.ownerDocument.defaultView

  return window &&
    element instanceof window.HTMLInputElement &&
    element.type === 'radio' &&
    element.name !== ''
    ? element
    : null
}

const radioStop: (element: Element, candidates: ReadonlyArray<FocusTarget>) => boolean =
  function radioStop(element: Element, candidates: ReadonlyArray<FocusTarget>) {
    const input = radio(element)

    if (!input) return true

    const group = candidates.filter((entry) => {
      const item = radio(entry)

      return item?.name === input.name && item.form === input.form
    })

    return (group.find((entry) => radio(entry)?.checked) ?? group[0]) === input
  }

const children: (element: Element) => ReadonlyArray<Element> = function children(element: Element) {
  const window = element.ownerDocument.defaultView

  if (window && element instanceof window.HTMLSlotElement) {
    const assigned = element.assignedElements({ flatten: true })

    if (assigned.length > 0) return assigned
  }

  return Array.from((element.shadowRoot ?? element).children)
}

const collect: (element: Element, result: Array<FocusTarget>) => void = function collect(
  element: Element,
  result: Array<FocusTarget>,
) {
  for (const child of children(element)) {
    if (candidate(child)) result.push(child)
    collect(child, result)
  }
}

export const popupTabbable: (element: Element) => ReadonlyArray<FocusTarget> =
  function popupTabbable(element: Element) {
    const all: Array<FocusTarget> = []
    collect(element, all)
    const candidates = all.filter(focusable)

    return candidates.filter((entry) => tabIndex(entry) >= 0 && radioStop(entry, candidates))
  }

export const popupContains: (ancestor: Node, node: Node | null) => boolean = function popupContains(
  ancestor: Node,
  node: Node | null,
) {
  for (let current = node; current;) {
    if (current === ancestor || ancestor.contains(current)) return true
    const root = current.getRootNode()
    const window = current.ownerDocument?.defaultView
    current = window && root instanceof window.ShadowRoot ? root.host : null
  }

  return false
}

export const popupActiveElement: (document: Document) => Element | null =
  function popupActiveElement(document: Document) {
    let active = document.activeElement

    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement

    return active
  }

export const installPopupFocusGuards: (
  anchor: HTMLElement,
  element: HTMLElement,
  portal: HTMLElement,
  id: string,
  dismiss: () => void,
) => () => void = function installPopupFocusGuards(
  anchor: HTMLElement,
  element: HTMLElement,
  portal: HTMLElement,
  id: string,
  dismiss: () => void,
) {
  const document = element.ownerDocument

  const makeGuard = () => {
    const guard = document.createElement('span')
    guard.tabIndex = 0
    guard.setAttribute('aria-hidden', 'true')
    guard.setAttribute('data-popup-focus-guard', id)
    guard.className =
      'fixed w-px h-px p-0 overflow-hidden opacity-0 pointer-events-none outline-none'

    return guard
  }

  const before = makeGuard()
  const after = makeGuard()
  const outsideBefore = makeGuard()
  const outsideAfter = makeGuard()
  anchor.insertAdjacentElement('afterend', outsideAfter)
  outsideAfter.insertAdjacentElement('beforebegin', outsideBefore)
  portal.insertBefore(before, element)
  portal.appendChild(after)
  const disabledTabStops = new Map<FocusTarget, string | null>()

  const restoreTabStops = () => {
    for (const [target, original] of disabledTabStops) {
      if (original === null) target.removeAttribute('tabindex')
      else target.setAttribute('tabindex', original)
    }

    disabledTabStops.clear()
  }

  const disableTabStops = () => {
    for (const target of popupTabbable(element)) {
      disabledTabStops.set(target, target.getAttribute('tabindex'))
      target.tabIndex = -1
    }
  }

  const focusInside = () => restoreTabStops()

  const focusOutside = (event: FocusEvent) => {
    const window = document.defaultView

    if (
      window &&
      event.relatedTarget instanceof window.Node &&
      !popupContains(portal, event.relatedTarget)
    )
      disableTabStops()
  }

  portal.addEventListener('focusin', focusInside, true)
  portal.addEventListener('focusout', focusOutside, true)

  const visibility = () => {
    const open = element.getAttribute('data-popup-open') === 'true'

    for (const guard of [before, after, outsideBefore, outsideAfter]) guard.tabIndex = open ? 0 : -1

    if (open) restoreTabStops()
  }

  const window = document.defaultView
  const observer = window ? new window.MutationObserver(visibility) : null
  observer?.observe(element, { attributes: true, attributeFilter: ['data-popup-open'] })
  visibility()

  const first = () => {
    restoreTabStops()
    ;(popupTabbable(element)[0] ?? element).focus()
  }

  const last = () => {
    restoreTabStops()
    ;(popupTabbable(element).at(-1) ?? element).focus()
  }

  const relatedInside = (event: FocusEvent) => {
    const window = document.defaultView

    return (
      !!window &&
      event.relatedTarget instanceof window.Node &&
      popupContains(portal, event.relatedTarget)
    )
  }

  const preceding = () => {
    const reference = popupTabbable(anchor).at(-1) ?? anchor
    reference.focus({ preventScroll: true })
  }

  const following = () => {
    const candidates = popupTabbable(document.body)
    const index = candidates.indexOf(outsideAfter)

    const next = candidates
      .slice(index + 1)
      .find((entry) => !popupContains(portal, entry) && entry !== outsideBefore)

    next?.focus({ preventScroll: true })
    dismiss()
  }

  const enteredBefore = (event: FocusEvent) => {
    if (relatedInside(event)) preceding()
    else first()
  }

  const enteredAfter = (event: FocusEvent) => {
    if (relatedInside(event)) following()
    else last()
  }

  before.addEventListener('focus', enteredBefore)
  after.addEventListener('focus', enteredAfter)
  outsideBefore.addEventListener('focus', enteredBefore)
  outsideAfter.addEventListener('focus', enteredAfter)

  return () => {
    observer?.disconnect()
    portal.removeEventListener('focusin', focusInside, true)
    portal.removeEventListener('focusout', focusOutside, true)
    restoreTabStops()
    before.removeEventListener('focus', enteredBefore)
    after.removeEventListener('focus', enteredAfter)
    outsideBefore.removeEventListener('focus', enteredBefore)
    outsideAfter.removeEventListener('focus', enteredAfter)
    before.remove()
    after.remove()
    outsideBefore.remove()
    outsideAfter.remove()
  }
}

/* @license Framework-independent Base UI tabbable traversal, MIT. Frozen provenance is */

type FocusTarget = HTMLElement | SVGElement

const candidateSelector =
  'a[href],button,input,select,textarea,summary,details,iframe,object,embed,[tabindex],[contenteditable]:not([contenteditable="false"]),audio[controls],video[controls]'

function target(element: Element): element is FocusTarget {
  const window = element.ownerDocument.defaultView

  return (
    window !== null &&
    (element instanceof window.HTMLElement || element instanceof window.SVGElement)
  )
}

function candidate(element: Element): element is FocusTarget {
  if (!target(element) || !element.matches(candidateSelector)) return false

  if (element.localName === 'summary')
    return (
      element.parentElement?.localName === 'details' && summary(element.parentElement) === element
    )

  if (element.localName === 'details') return summary(element) === undefined

  return element.localName !== 'input' || element.getAttribute('type') !== 'hidden'
}

function focusable(element: Element): element is FocusTarget {
  if (!candidate(element) || !element.isConnected || element.matches(':disabled')) return false

  for (let current: Element | null = element; current; current = parent(current)) {
    if (current.hasAttribute('inert') || current.hasAttribute('hidden')) return false

    if (current !== element && current.localName === 'details' && !current.hasAttribute('open')) {
      const firstSummary = summary(current)

      if (!firstSummary || (firstSummary !== element && !firstSummary.contains(element)))
        return false
    }

    if (current.localName !== 'slot' && !popupVisible(current, current !== element)) return false
  }

  return true
}
