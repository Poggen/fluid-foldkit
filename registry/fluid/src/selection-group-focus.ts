// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
/** Source scopes keyboard movement to the visible row, excluding the hidden primitive. */
export function focusSelectionRow(id: string, index: number, select = false, primitive = false) {
  const root = globalThis.document.querySelector(`#${id}`)

  const item = [...(root?.querySelectorAll<HTMLElement>('[data-fluid-hover-index]') ?? [])].find(
    (candidate) =>
      candidate.closest('[data-slot=fluid-selection-group]') === root &&
      Number(candidate.dataset.fluidHoverIndex) === index,
  )

  if (primitive) {
    item?.querySelector<HTMLElement>('button[role=radio]')?.focus()
  } else {
    item?.focus()

    if (select) {
      item?.click()
    }
  }
}
