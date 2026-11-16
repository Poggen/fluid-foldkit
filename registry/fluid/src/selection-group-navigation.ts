// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
/** This Source policy moves among authored visible rows; it does not keep a second cursor. */
export function selectionTarget(
  items: ReadonlyArray<{ readonly index: number }>,
  index: number,
  key: string,
  radio: boolean,
) {
  const offset = items.findIndex((item) => item.index === index)

  if (offset === -1) {
    return null
  }

  if (key === 'Home') {
    return items[0] ?? null
  }

  if (key === 'End') {
    return items.at(-1) ?? null
  }

  const forward = key === 'ArrowDown' || (radio && key === 'ArrowRight')
  const backward = key === 'ArrowUp' || (radio && key === 'ArrowLeft')

  if (!forward && !backward) {
    return null
  }

  return items[(offset + (forward ? 1 : -1) + items.length) % items.length] ?? null
}
