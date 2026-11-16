interface DialogIsolationEntry {
  readonly host: HTMLElement
  readonly modal: boolean
  readonly ariaOnly?: boolean
  readonly hasContent: boolean
  readonly resourceOpen?: boolean
}

const holdsScroll = (entry: DialogIsolationEntry) =>
  entry.modal && (entry.host.dataset.state === 'open' || entry.resourceOpen === true)

const isolates = (entry: DialogIsolationEntry) =>
  (entry.modal || entry.ariaOnly === true) &&
  entry.hasContent &&
  (entry.ariaOnly === true || entry.host.dataset.state === 'open')

export function createDialogIsolation(document: Document) {
  const isolated = new Map<HTMLElement, string | null>()
  let overflow: string | undefined
  let paddingRight: string | undefined

  const isolateLiveRegions = (
    modal: DialogIsolationEntry,
    allowed: (entry: DialogIsolationEntry) => ReadonlyArray<HTMLElement>,
  ) => {
    const visible = [
      modal.host,
      ...allowed(modal),
      ...document.querySelectorAll<HTMLElement>(
        '[aria-live]:not([aria-live=off]),[role=alert],[role=status]',
      ),
    ]

    const visit = (parent: HTMLElement) => {
      for (const child of parent.children) {
        if (
          !(child instanceof HTMLElement) ||
          child.matches('script,style,link') ||
          visible.includes(child)
        ) {
          continue
        }

        if (visible.some((element) => child.contains(element))) {
          visit(child)
        } else {
          isolated.set(child, child.getAttribute('aria-hidden'))
          child.setAttribute('aria-hidden', 'true')
        }
      }
    }

    visit(document.body)
  }

  const isolateAncestors = (
    modal: DialogIsolationEntry,
    allowed: (entry: DialogIsolationEntry) => ReadonlyArray<HTMLElement>,
  ) => {
    let branch: HTMLElement | null = modal.host

    while (branch !== null && branch !== document.body) {
      const parent: HTMLElement | null = branch.parentElement

      if (parent === null) {
        break
      }

      for (const sibling of parent.children) {
        if (
          sibling instanceof HTMLElement &&
          sibling !== branch &&
          !allowed(modal).some((host) => sibling === host || sibling.contains(host)) &&
          !sibling.matches('script,style,link')
        ) {
          isolated.set(sibling, sibling.getAttribute('aria-hidden'))
          sibling.setAttribute('aria-hidden', 'true')
        }
      }

      branch = parent
    }
  }

  return {
    synchronize(
      entries: ReadonlyArray<DialogIsolationEntry>,
      allowed: (entry: DialogIsolationEntry) => ReadonlyArray<HTMLElement> = () => [],
    ) {
      for (const [element, original] of isolated) {
        if (original === null) {
          element.removeAttribute('aria-hidden')
        } else {
          element.setAttribute('aria-hidden', original)
        }
      }

      isolated.clear()

      const scrollModal = entries.findLast(holdsScroll)
      const modal = entries.findLast(isolates)

      if (modal?.ariaOnly === true) {
        isolateLiveRegions(modal, allowed)
      } else if (modal !== undefined) {
        isolateAncestors(modal, allowed)
      }

      if (scrollModal !== undefined) {
        if (overflow === undefined) {
          ;({ overflow } = document.body.style)
          ;({ paddingRight } = document.body.style)

          const width =
            (document.defaultView?.innerWidth ?? document.documentElement.clientWidth) -
            document.documentElement.clientWidth

          if (width > 0) {
            document.body.style.paddingRight = `${width}px`
          }

          document.body.style.overflow = 'hidden'
        }
      } else if (overflow !== undefined) {
        document.body.style.overflow = overflow
        document.body.style.paddingRight = paddingRight ?? ''
        overflow = undefined
        paddingRight = undefined
      }
    },
  }
}
