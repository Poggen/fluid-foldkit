export const tooltipTrigger: (document: Document, key: string) => HTMLElement | null =
  function tooltipTrigger(document: Document, key: string) {
    return (
      Array.from(document.querySelectorAll<HTMLElement>('[data-tooltip-trigger]')).find(
        (element) => element.dataset.tooltipTrigger === key,
      ) ?? null
    )
  }
