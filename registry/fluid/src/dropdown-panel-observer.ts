import { observeMenuResultsHeight } from './menu-results-height.js'
import { dropdownPanelKeys } from './dropdown-panel-keys.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Effect, Option, Queue, Schema, Stream } from 'effect'
import { frame, cancelFrame } from 'motion-dom'
import { DropdownObservation, DROPDOWN_ANIMATION_COMPLETE } from './dropdown-observation.js'
import type { DropdownPanelObservation } from './dropdown-observation.js'
import type {
  DropdownBranchRegistry,
  DropdownResourceOptions,
  DropdownMountInput,
} from './dropdown-resources.js'
import { DROPDOWN_SEARCH_CHANGE } from './dropdown-parts.js'
import { DropdownRow } from './dropdown-state.js'
import { mountDropdownPositioner } from './dropdown-position.js'
export const observeDropdownPanel: (
  document: Document,
  branches: DropdownBranchRegistry,
  options: DropdownResourceOptions,
  panels: Map<string, HTMLElement>,
  input: DropdownMountInput,
) => Stream.Stream<DropdownPanelObservation> = function observeDropdownPanel(
  document: Document,
  branches: DropdownBranchRegistry,
  options: DropdownResourceOptions,
  panels: Map<string, HTMLElement>,
  input: DropdownMountInput,
) {
  return input.viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Paused'
        ? Stream.never
        : Stream.callback<DropdownPanelObservation>((queue) => {
            const send: (signal: DropdownPanelObservation) => void = (
              signal: DropdownPanelObservation,
            ) => {
              Queue.offerUnsafe(queue, signal)
            }
            return Effect.gen(function* () {
              const { element, id } = input
              if (!(element instanceof HTMLElement)) {
                return yield* Effect.die(new Error('Dropdown requires HTML host'))
              }
              const panel =
                element.querySelector<HTMLElement>('[data-fluid-dropdown-panel]') ?? element
              const trigger = document.querySelector(`[id="${CSS.escape(`${id}-trigger`)}"]`)
              const htmlTrigger = trigger instanceof HTMLElement ? trigger : null
              const generation = () => {
                const encoded = element.dataset.generation
                if (encoded === undefined) {
                  throw new Error('Dropdown host requires generation')
                }
                return Schema.decodeSync(Schema.Natural)(
                  Schema.decodeSync(Schema.FiniteFromString)(encoded),
                )
              }
              const isOpen = () => element.dataset.state === 'open'
              const callbacks = () => options.callbacks?.(id) ?? {}
              const owned = (target: EventTarget | null) =>
                target instanceof Element && target.closest('[data-fluid-dropdown-panel]') === panel
              const search = () =>
                [...panel.querySelectorAll<HTMLInputElement>('[data-fluid-dropdown-search]')].at(-1)
              const rows = () =>
                [...panel.querySelectorAll<HTMLElement>(selector)].filter(
                  (row) => row.closest('[data-fluid-dropdown-panel]') === panel,
                )
              const available = (row: HTMLElement) => {
                const styles = document.defaultView?.getComputedStyle(row)
                if (
                  !row.isConnected ||
                  !styles ||
                  styles.visibility === 'hidden' ||
                  styles.visibility === 'collapse' ||
                  row.matches(':disabled')
                ) {
                  return false
                }
                return 'checkVisibility' in row
                  ? row.checkVisibility()
                  : styles.display !== 'none' && styles.display !== 'contents'
              }
              const readMetadata: () => ReadonlyArray<RowReading> = () =>
                rows().map((row) => ({
                  element: row,
                  metadata: {
                    id: row.id,
                    index: Schema.decodeSync(Schema.FiniteFromString)(
                      row.dataset.fluidHoverIndex ?? 'NaN',
                    ),
                    label: row.dataset.label ?? row.textContent ?? '',
                    disabled: row.getAttribute('aria-disabled') === 'true',
                    kind: rowKind(row),
                    checked: row.getAttribute('aria-checked') === 'true',
                    closeOnClick: row.dataset.closeOnClick !== 'false',
                  },
                }))
              let observedRows: ReadonlyArray<DropdownRow> | undefined
              let readPending = false
              let disposed = false
              const sameRows = Schema.toEquivalence(Schema.Array(DropdownRow))
              const sameMetadata = (readings: ReadonlyArray<RowReading>) =>
                observedRows !== undefined &&
                observedRows.length === readings.length &&
                observedRows.every((previous, index) => {
                  const current = readings[index]?.metadata
                  return (
                    current !== undefined &&
                    previous.id === current.id &&
                    previous.index === current.index &&
                    previous.label === current.label &&
                    previous.disabled === current.disabled &&
                    previous.kind === current.kind &&
                    previous.checked === current.checked &&
                    previous.closeOnClick === current.closeOnClick
                  )
                })
              const emitRows: (readings?: readonly RowReading[]) => void = (
                readings = readMetadata(),
              ) => {
                const measured = readings.map(
                  ({ element, metadata }) =>
                    ({
                      ...metadata,
                      available: available(element),
                    }) satisfies DropdownRow,
                )
                if (observedRows !== undefined && sameRows(observedRows, measured)) {
                  return
                }
                observedRows = measured
                send(DropdownObservation.MeasuredRows({ rows: measured }))
              }
              const readFrame: () => void = () => {
                if (!readPending) return
                readPending = false
                if (!disposed && element.isConnected) {
                  emitRows()
                }
              }
              const flushRows: (readings?: readonly RowReading[]) => void = (
                readings = readMetadata(),
              ) => {
                cancelFrame(readFrame)
                readPending = false
                emitRows(readings)
              }
              const scheduleRows: () => void = () => {
                if (!readPending) {
                  readPending = true
                  frame.read(readFrame)
                }
              }
              const parent = element.parentNode
              const sibling = element.nextSibling
              yield* Effect.acquireRelease(
                Effect.sync(() => {
                  if (panels.has(id)) {
                    throw new Error(`Duplicate Dropdown id ${id}`)
                  }
                  panels.set(id, panel)

                  if (!input.inline) {
                    ;(htmlTrigger?.closest('dialog[open]') ?? document.body).append(element)
                  }
                }),
                () =>
                  Effect.sync(() => {
                    panels.delete(id)
                    if (!input.inline && parent && element.isConnected) {
                      if (sibling !== null && sibling.parentNode === parent) {
                        sibling.before(element)
                      } else {
                        parent.append(element)
                      }
                    }
                  }),
              )
              if (!input.inline) {
                yield* branches.registerBranch({
                  id,
                  modal: panel.dataset.fluidSelectModal === 'true',
                  rootId: input.rootId,
                  parentId: Option.getOrUndefined(input.parentId),
                  host: element,
                  panel,
                  trigger: htmlTrigger,
                  isOpen,
                  requestClose: (reason) => {
                    send(
                      DropdownObservation.Dismissed({
                        restore: reason === 'escape',
                        generation: generation(),
                        reason,
                      }),
                    )
                  },
                })
              }
              if (!input.inline) {
                yield* mountDropdownPositioner(element, htmlTrigger)
              }
              yield* Effect.acquireRelease(
                Effect.sync(() => {
                  const releaseResults = observeMenuResultsHeight(
                    panel,
                    '[data-fluid-dropdown-row]',
                  )
                  let outer: number | undefined
                  let inner: number | undefined
                  const window = document.defaultView
                  let wasOpen = false
                  const stateChanged = () => {
                    const open = isOpen()
                    const opening = open && !wasOpen
                    const readings = readMetadata()

                    if (opening || !sameMetadata(readings)) {
                      flushRows(readings)
                    } else {
                      scheduleRows()
                    }
                    wasOpen = open
                    if (!opening || input.inline || element.dataset.openedByHover === 'true') {
                      return
                    }
                    const focusInitial = () => {
                      if (!isOpen() || !panel.isConnected) {
                        return
                      }
                      const field = search()
                      if (field?.dataset.clearOnClose !== 'false' && field && field.value !== '') {
                        changeSearch(field, '')
                      }
                      if (field && field.dataset.autoFocus !== 'false') {
                        field.focus({ preventScroll: true })
                      } else if (
                        !panel.contains(document.activeElement) ||
                        document.activeElement === panel
                      ) {
                        const listbox = panel.getAttribute('role') === 'listbox'
                        let target = listbox
                          ? rows().find(
                              (row) =>
                                row.getAttribute('aria-selected') === 'true' &&
                                row.getAttribute('aria-disabled') !== 'true',
                            )
                          : undefined
                        if (target === undefined) {
                          if (listbox && element.dataset.openingInput !== 'keyboard') {
                            target = panel
                          } else {
                            const enabled = rows().filter(
                              (row) => row.getAttribute('aria-disabled') !== 'true',
                            )
                            target =
                              element.dataset.openingEdge === 'last' ? enabled.at(-1) : enabled[0]
                          }
                        }
                        target?.focus({ preventScroll: true })
                      }
                    }
                    outer = window?.requestAnimationFrame(() => {
                      if (htmlTrigger?.dataset.triggerPressEvent === 'mousedown') {
                        focusInitial()
                      } else {
                        inner = window?.requestAnimationFrame(focusInitial)
                      }
                    })
                  }
                  const observer = new MutationObserver(stateChanged)
                  observer.observe(element, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: [
                      'data-state',
                      'style',
                      'class',
                      'hidden',
                      'data-label',
                      'aria-disabled',
                      'aria-checked',
                      'data-kind',
                      'data-close-on-click',
                    ],
                  })
                  const focus = (event: FocusEvent) => {
                    if (!owned(event.target)) {
                      return
                    }
                    flushRows()
                    const row = rowFor(event.target)
                    send(
                      DropdownObservation.FocusedRow({
                        id: Option.fromNullishOr(row?.id),
                        visible:
                          event.target instanceof Element && event.target.matches(':focus-visible'),
                      }),
                    )
                  }
                  const activate = (row: HTMLElement, event: MouseEvent | KeyboardEvent) => {
                    if (row.getAttribute('aria-disabled') === 'true') {
                      return
                    }
                    callbacks().onActivate?.(row.id, event)
                    callbacks().onSelect?.(row.id)
                    if (!event.defaultPrevented) {
                      send(DropdownObservation.ActivatedRow({ id: row.id }))
                    }
                  }
                  const click = (event: MouseEvent) => {
                    if (!owned(event.target)) {
                      return
                    }
                    flushRows()
                    const row = rowFor(event.target)
                    if (row && row.dataset.kind !== 'submenu') {
                      activate(row, event)
                    }
                  }
                  const panelKey = dropdownPanelKeys({
                    element,
                    inline: input.inline,
                    owned,
                    search,
                    rows,
                    rowFor,
                    activate,
                    generation,
                    send,
                    changeSearch,
                  })
                  const key = (event: KeyboardEvent) => {
                    if (owned(event.target)) {
                      flushRows()
                    }
                    panelKey(event)
                  }
                  const pointer = (event: PointerEvent) => {
                    if (event.pointerType !== 'mouse' || !owned(event.target)) {
                      return
                    }
                    const row = rowFor(event.target)
                    if (row?.getAttribute('aria-disabled') === 'true') {
                      return
                    }
                    row?.focus({ preventScroll: true })
                    send(DropdownObservation.MovedPointer())
                  }
                  const hovered = (event: PointerEvent) => {
                    if (
                      htmlTrigger?.dataset.openOnHover === 'true' &&
                      event.pointerType === 'mouse'
                    )
                      send(
                        DropdownObservation.HoveredTrigger({
                          over: event.type === 'pointerenter',
                          openOnHover: true,
                        }),
                      )
                  }
                  const complete = () => {
                    if (!isOpen()) {
                      send(
                        DropdownObservation.CompletedExit({
                          generation: Schema.decodeSync(Schema.FiniteFromString)(
                            element.dataset.generation ?? '0',
                          ),
                        }),
                      )
                    }
                  }
                  panel.addEventListener('focusin', focus)
                  panel.addEventListener('click', click)
                  panel.addEventListener('keydown', key)
                  panel.addEventListener('pointermove', pointer)
                  panel.addEventListener('pointerenter', hovered)
                  panel.addEventListener('pointerleave', hovered)
                  element.addEventListener(DROPDOWN_ANIMATION_COMPLETE, complete)
                  stateChanged()
                  return () => {
                    disposed = true
                    cancelFrame(readFrame)
                    readPending = false
                    releaseResults()
                    observer.disconnect()
                    if (outer !== undefined) {
                      window?.cancelAnimationFrame(outer)
                    }
                    if (inner !== undefined) {
                      window?.cancelAnimationFrame(inner)
                    }
                    panel.removeEventListener('focusin', focus)
                    panel.removeEventListener('click', click)
                    panel.removeEventListener('keydown', key)
                    panel.removeEventListener('pointermove', pointer)
                    panel.removeEventListener('pointerenter', hovered)
                    panel.removeEventListener('pointerleave', hovered)
                    element.removeEventListener(DROPDOWN_ANIMATION_COMPLETE, complete)
                    const field = search()
                    if (field && field.dataset.clearOnClose !== 'false' && field.value !== '') {
                      changeSearch(field, '')
                    }
                    if (
                      !input.inline &&
                      element.dataset.restoreFocus !== 'false' &&
                      htmlTrigger?.isConnected === true
                    ) {
                      queueMicrotask(() => {
                        if (
                          htmlTrigger.isConnected &&
                          (document.activeElement === document.body ||
                            panel.contains(document.activeElement))
                        ) {
                          htmlTrigger.focus({ preventScroll: true })
                        }
                      })
                    }
                    callbacks().contentRef?.(null)
                  }
                }),
                (dispose) => Effect.sync(dispose),
              )
              yield* Effect.sync(() => callbacks().contentRef?.(panel))
              return yield* Effect.never
            })
          }),
    ),
  )
}

type RowMetadata = Omit<DropdownRow, 'available'>
type RowReading = { readonly element: HTMLElement; readonly metadata: RowMetadata }

const selector = '[data-fluid-dropdown-row]'
const rowKind: (row: HTMLElement) => DropdownRow['kind'] = (row: HTMLElement) => {
  if (row.dataset.kind === 'submenu') {
    return 'submenu'
  }
  if (row.getAttribute('role') === 'menuitemcheckbox') {
    return 'checkbox'
  }
  return row.getAttribute('role') === 'menuitemradio' ? 'radio' : 'action'
}
const changeSearch = (field: HTMLInputElement, value: string) => {
  field.dispatchEvent(new CustomEvent(DROPDOWN_SEARCH_CHANGE, { detail: value }))
}
const rowFor = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>(selector) : null
