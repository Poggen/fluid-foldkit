interface DefaultPortalHost {
  readonly element: HTMLDivElement
  leases: number
}

const hosts = new WeakMap<Document, DefaultPortalHost>()

export const acquireDefaultPortalHost = (document: Document) => {
  let host = hosts.get(document)

  if (host === undefined) {
    const element = document.createElement('div')
    element.dataset.fluidDialogPortalRoot = ''
    element.className = 'contents'
    host = { element, leases: 0 }
    hosts.set(document, host)
    document.body.append(element)
  }

  host.leases += 1
  const acquired = host
  let released = false

  return {
    element: acquired.element,
    release() {
      if (released) {
        return
      }

      released = true
      acquired.leases -= 1

      if (acquired.leases === 0) {
        acquired.element.remove()
        hosts.delete(document)
      }
    },
  }
}

/** Reordering dialogs must not invalidate the document body's unrelated descendants. */
export const createDialogPortalOwner = (document: Document, element: Element) => {
  let lease: ReturnType<typeof acquireDefaultPortalHost> | undefined

  return {
    move(explicit: HTMLElement | null | undefined) {
      if (explicit === null || explicit === undefined) {
        lease ??= acquireDefaultPortalHost(document)

        if (element.parentNode !== lease.element) {
          lease.element.append(element)
        }
      } else {
        if (element.parentNode !== explicit) {
          explicit.append(element)
        }

        lease?.release()
        lease = undefined
      }
    },
    release() {
      lease?.release()
      lease = undefined
    },
  }
}
