export const linkField: (root: HTMLElement, rootId: string) => ReadonlyArray<string> =
  function linkField(root: HTMLElement, rootId: string) {
    const own = (element: Element) => element.closest('[data-slot=field]') === root

    const find = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)].find(own)

    const control = find(libraryControl) ?? find(nativeControl)

    if (!control) {
      return []
    }

    const messages = [
      ...root.querySelectorAll<HTMLElement>(
        '[data-slot=field-description], [data-slot=field-error]',
      ),
    ].filter(own)

    let suffix = 0

    for (const element of messages) {
      if (element.id) {
        continue
      }

      let id = `${rootId}-message-${suffix}`

      while (root.ownerDocument.querySelector(`#${CSS.escape(id)}`)) {
        suffix += 1
        id = `${rootId}-message-${suffix}`
      }

      suffix += 1
      element.id = id
    }

    const linked = (control.dataset.fieldDescribedby ?? '').split(' ')

    const callerIds = (control.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter((id) => id !== '' && !linked.includes(id))

    const ids = messages.map((element) => element.id)
    const next = [...new Set([...callerIds, ...ids])].join(' ')

    if (next && control.getAttribute('aria-describedby') !== next) {
      control.setAttribute('aria-describedby', next)
    } else if (!next && control.hasAttribute('aria-describedby')) {
      control.removeAttribute('aria-describedby')
    }

    if (control.dataset.fieldDescribedby !== ids.join(' ')) {
      control.dataset.fieldDescribedby = ids.join(' ')
    }

    const card = root.parentElement

    if (
      card instanceof HTMLLabelElement &&
      card.dataset.slot === 'field-label' &&
      control.id &&
      card.htmlFor !== control.id
    ) {
      card.htmlFor = control.id
    }

    return ids
  }

const libraryControl =
  '[data-slot=input], [data-slot=textarea], [data-slot=checkbox], [role=combobox]'

const nativeControl = 'input:not([type=hidden]):not([aria-hidden=true]), textarea, select'
