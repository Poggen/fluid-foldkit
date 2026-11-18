import { Effect } from 'effect'

export interface DialogPointerBarrier {
  readonly ownerId: string
  readonly scopeElement: HTMLElement
  readonly referenceElement: HTMLElement
  readonly floatingElement: HTMLElement
}

interface PointerStyle {
  readonly original: string
  readonly priority: string
  readonly owners: Map<DialogPointerBarrier, string>
}

/** One application owns temporary hover-corridor pointer leases. */
export function createDialogPointerStyles() {
  const scopes = new Map<HTMLElement, DialogPointerBarrier>()
  const styles = new Map<HTMLElement, PointerStyle>()

  const styleFor = (element: HTMLElement) => {
    const existing = styles.get(element)

    if (existing) return existing

    const style: PointerStyle = {
      original: element.style.getPropertyValue('pointer-events'),
      priority: element.style.getPropertyPriority('pointer-events'),
      owners: new Map(),
    }

    styles.set(element, style)

    return style
  }

  const synchronize = (element: HTMLElement) => {
    const style = styles.get(element)

    if (!style) return

    const value = [...style.owners.values()].at(-1)

    if (value !== undefined) element.style.setProperty('pointer-events', value)
    else {
      if (style.original)
        element.style.setProperty('pointer-events', style.original, style.priority)
      else element.style.removeProperty('pointer-events')
      styles.delete(element)
    }
  }

  const release = (lease: DialogPointerBarrier) => {
    if (scopes.get(lease.scopeElement) !== lease) return
    scopes.delete(lease.scopeElement)

    for (const element of new Set([
      lease.scopeElement,
      lease.referenceElement,
      lease.floatingElement,
    ])) {
      styles.get(element)?.owners.delete(lease)
      synchronize(element)
    }
  }

  return {
    lease: (input: DialogPointerBarrier) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const lease: DialogPointerBarrier = { ...input }
          const previous = scopes.get(lease.scopeElement)

          if (previous) release(previous)
          scopes.set(lease.scopeElement, lease)

          for (const [element, value] of [
            [lease.scopeElement, 'none'],
            [lease.referenceElement, 'auto'],
            [lease.floatingElement, 'auto'],
          ] satisfies ReadonlyArray<readonly [HTMLElement, string]>) {
            styleFor(element).owners.set(lease, value)
            synchronize(element)
          }

          return lease
        }),
        (lease) => Effect.sync(() => release(lease)),
      ).pipe(Effect.asVoid),
  }
}
