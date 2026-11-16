// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
export function selectionBorder(selected: boolean, active: boolean) {
  if (selected) {
    return 'border-[1.5px] border-transparent'
  }

  return active
    ? 'border-[1.5px] border-neutral-400 dark:border-neutral-500'
    : 'border-[1.5px] border-border'
}

export function selectionMarker(selected: boolean) {
  return { name: selected ? 'checked' : 'unchecked', value: '' }
}
