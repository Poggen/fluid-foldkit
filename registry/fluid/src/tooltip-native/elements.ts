export function tooltipTrigger(document: Document, key: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[data-tooltip-trigger]')).find(
      (element) => element.dataset.tooltipTrigger === key,
    ) ?? null
  )
}
