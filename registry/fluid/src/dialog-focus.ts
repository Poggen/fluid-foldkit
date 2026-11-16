export type DialogLifecycleEvent<Original extends Event | null = Event | null> = CustomEvent<{
  readonly originalEvent: Original
}>

export const dialogFocusable = (host: HTMLElement): ReadonlyArray<HTMLElement> =>
  [...host.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]')].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.hasAttribute('disabled') &&
      element.closest('[hidden]') === null &&
      element.ownerDocument.defaultView?.getComputedStyle(element).display !== 'none' &&
      element.ownerDocument.defaultView?.getComputedStyle(element).visibility !== 'hidden',
  )

export const dialogLifecycleEvent = <Original extends Event | null>(
  name: string,
  original: Original,
  target: EventTarget | null = original?.target ?? null,
) => {
  const event = new CustomEvent<{ readonly originalEvent: Original }>(name, {
    cancelable: true,
    detail: { originalEvent: original },
  })

  target?.dispatchEvent(event)

  return event
}

export const dialogInitialFocus = (panel: HTMLElement, selector: string | undefined) => {
  if (selector === undefined || selector === '') {
    return panel.querySelector<HTMLElement>('[data-fluid-dialog-initial-focus]')
  }

  return panel.matches(selector) ? panel : panel.querySelector<HTMLElement>(selector)
}
