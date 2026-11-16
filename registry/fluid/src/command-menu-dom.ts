import { observeMenuResultsHeight } from './menu-results-height.js'
import { animateSingleValue } from 'motion-dom'
import { spring } from './lib/springs.js'

interface CommandMenuObserver {
  readonly platform: (mac: boolean) => void
  readonly height: (height: number) => void
  readonly move: (direction: 'next' | 'previous' | 'first' | 'last') => void
  readonly enter: () => void
  readonly query: (query: string) => void
}
/** DOM-only measurement and native-key facts; the Block remains selection authority. */
export function observeCommandMenu(element: Element, emit: CommandMenuObserver): () => void {
  const window = element.ownerDocument.defaultView
  const column = element.querySelector<HTMLElement>('[data-command-column]')
  const input = element.querySelector<HTMLInputElement>('input[role=combobox]')
  if (!window || !column || !input)
    throw new Error('Command menu requires its mounted input and column')
  emit.platform(/Mac|iPhone|iPad|iPod/.test(window.navigator.platform))
  const releaseResults = observeMenuResultsHeight(column, '[data-command-value]')
  const measure = () => emit.height(column.offsetHeight)
  const resize = new window.ResizeObserver(measure)
  resize.observe(column)
  measure()
  let scrollAnimation: ReturnType<typeof animateSingleValue<number>> | undefined
  let lastQuery = input.value
  let lastActive = ''
  const scroll = () => {
    const list =
      element.querySelector<HTMLElement>('[data-slot=scroll-area-viewport]') ??
      element.querySelector<HTMLElement>('[role=listbox]')
    const activeId = input.getAttribute('aria-activedescendant') ?? ''
    const queryChanged = lastQuery !== input.value
    if (!list || (!queryChanged && lastActive === activeId)) return
    lastQuery = input.value
    lastActive = activeId
    scrollAnimation?.stop()
    const active = element.ownerDocument.getElementById(activeId)
    if (queryChanged || active?.dataset.fluidHoverIndex === '0') {
      list.scrollTop = 0
      return
    }
    if (!active) return
    const target = Math.max(
      0,
      Math.min(
        active.offsetTop + active.offsetHeight / 2 - list.clientHeight / 2,
        list.scrollHeight - list.clientHeight,
      ),
    )
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) list.scrollTop = target
    else
      scrollAnimation = animateSingleValue(list.scrollTop, target, {
        ...spring.fast,
        onUpdate: (value) => {
          list.scrollTop = value
        },
      })
  }
  const virtualized = element.getAttribute('data-virtualized') === 'true'
  const mutation = new window.MutationObserver(scroll)
  if (!virtualized)
    mutation.observe(element, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-activedescendant', 'value'],
    })
  const pointer = (event: Event) => {
    if (event.target instanceof window.Element && event.target.closest('[data-command-value]'))
      event.preventDefault()
  }
  const keydown = (event: KeyboardEvent) => {
    if (
      event.target !== input ||
      event.isComposing ||
      event.keyCode === 229 ||
      event.defaultPrevented
    )
      return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      emit.move(event.key === 'ArrowDown' ? 'next' : 'previous')
    } else if ((event.key === 'Home' || event.key === 'End') && input.value === '') {
      event.preventDefault()
      emit.move(event.key === 'Home' ? 'first' : 'last')
    } else if (event.key === 'Enter') {
      event.preventDefault()
      emit.enter()
    } else if (
      event.key === 'Escape' &&
      element.getAttribute('data-in-dialog') !== 'true' &&
      input.value !== ''
    ) {
      event.preventDefault()
      emit.query('')
    }
  }
  element.addEventListener('pointerdown', pointer)
  input.addEventListener('keydown', keydown)
  if (!virtualized) scroll()
  return () => {
    releaseResults()
    resize.disconnect()
    mutation.disconnect()
    scrollAnimation?.stop()
    element.removeEventListener('pointerdown', pointer)
    input.removeEventListener('keydown', keydown)
  }
}
