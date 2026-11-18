/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Effect } from 'effect'
import { createDialogPortalOwner } from './default-portal-host.js'
import { createDialogBranches } from './dialog-branches.js'
import { createDialogIsolation } from './dialog-isolation.js'
import { createDialogPointerStyles } from './dialog-pointer-barrier.js'
import type { DialogResourceOptions } from './dialog-resource-contract.js'
import { dialogFocusable, dialogLifecycleEvent } from './dialog-focus.js'
import { observeDialogRoot } from './dialog-root-observer.js'
import type { DialogOccurrence } from './dialog-root-observer.js'

const focusOutside = (root: DialogOccurrence, original: FocusEvent, trigger: boolean) => {
  const callbacks = root.callbacks()
  const event = dialogLifecycleEvent('dismissableLayer.focusOutside', original)
  callbacks.onFocusOutside?.(event)

  if (root.modal()) {
    event.preventDefault()
  }

  callbacks.onInteractOutside?.(event)

  if (trigger || (!root.modal() && root.pointerOutside)) {
    event.preventDefault()
  }

  return event.defaultPrevented
}

const pointerOutside = (root: DialogOccurrence, original: PointerEvent, trigger: boolean) => {
  const callbacks = root.callbacks()
  const event = dialogLifecycleEvent('dismissableLayer.pointerDownOutside', original)
  callbacks.onPointerDownOutside?.(event)

  if (original.button === 2 || (original.button === 0 && original.ctrlKey)) {
    event.preventDefault()
  }

  callbacks.onInteractOutside?.(event)

  if (trigger) {
    event.preventDefault()
  }

  return event.defaultPrevented
}

const outside = (root: DialogOccurrence, original: PointerEvent | FocusEvent, trigger = false) => {
  const prevented =
    original instanceof FocusEvent
      ? focusOutside(root, original, trigger)
      : pointerOutside(root, original, trigger)

  if (!prevented) {
    root.interactedOutside = true

    if (original instanceof PointerEvent && !root.modal()) {
      root.pointerOutside = true
    }

    root.requestClose()
  }
}

/** One Source lifecycle owns dynamic modality, cancellable focus and descendant portals. */
export const createDialogRuntime = (document: Document, options: DialogResourceOptions) => {
  const roots: Array<DialogOccurrence> = []
  const pointers = createDialogPointerStyles()
  const isolation = createDialogIsolation(document)
  const top = () => roots.findLast((root) => root.visible())
  const branches = createDialogBranches(document, () => top()?.id)

  const portals = new Map<
    string,
    {
      readonly element: Element
      readonly owner: ReturnType<typeof createDialogPortalOwner>
      targetId: string
      readonly parentId: string | undefined
    }
  >()

  const belongsTo = (root: DialogOccurrence, id: string) => {
    const visited = new Set<string>()
    let parent = root.parentId()

    while (parent !== undefined && !visited.has(parent)) {
      if (parent === id) {
        return true
      }

      visited.add(parent)
      const parentId = parent
      parent = roots.find((candidate) => candidate.id === parentId)?.parentId()
    }

    return false
  }

  const descendants = (id: string) => roots.filter((root) => root.visible() && belongsTo(root, id))

  const reconcile = () => {
    isolation.synchronize(
      [
        ...roots.flatMap((root) =>
          root.visible()
            ? [
                {
                  host: root.host,
                  modal: root.modal(),
                  hasContent: root.panel() !== null,

                  resourceOpen: root.open(),
                },
              ]
            : [],
        ),
        ...branches.isolationEntries(),
        ...branches.accessibilityEntries(),
      ],
      (entry) => {
        const related = descendants(entry.host.id)

        return [
          ...related.map((root) => root.host),
          ...[entry.host.id, ...related.map((root) => root.id)].flatMap((id) => [
            ...branches.descendants(id).map((branch) => branch.host),
            ...branches.accessibleReferences(id),
          ]),
        ]
      },
    )
  }

  const inside = (root: DialogOccurrence, target: Node) =>
    root.panel()?.contains(target) === true ||
    branches.contains(root.id, target) ||
    descendants(root.id).some(
      (child) => child.panel()?.contains(target) === true || branches.contains(child.id, target),
    )

  const keydown = (event: KeyboardEvent) => {
    const root = top()

    if (root === undefined || event.defaultPrevented || event.isComposing) {
      return
    }

    if (event.key === 'Escape') {
      if (branches.hasTop(root.id)) {
        return
      }

      root.callbacks().onEscapeKeyDown?.(event)

      if (!event.defaultPrevented) {
        event.preventDefault()
        root.requestClose()
      }
    } else if (event.key === 'Tab' && root.modal() && root.visible()) {
      const panel = root.panel()

      if (panel === null) {
        return
      }

      const candidates = [
        ...dialogFocusable(panel),
        ...branches.descendants(root.id).flatMap((branch) => dialogFocusable(branch.panel)),
      ]

      const [first] = candidates
      const last = candidates.at(-1)

      if (first === undefined) {
        event.preventDefault()
        panel.focus({ preventScroll: true })
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus({ preventScroll: true })
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }
  }

  const dismissPointer = (event: PointerEvent) => {
    const root = top()

    if (
      root !== undefined &&
      root.open() &&
      !event.defaultPrevented &&
      event.target instanceof Node &&
      !inside(root, event.target) &&
      !branches.hasTop(root.id)
    ) {
      const trigger = document.querySelector<HTMLElement>(
        `[data-fluid-dialog-trigger="${CSS.escape(root.id)}"]`,
      )

      outside(root, event, trigger?.contains(event.target) === true)
    }
  }

  let touch: PointerEvent | undefined

  const pointerdown = (event: PointerEvent) => {
    touch = undefined

    if (event.pointerType === 'touch') {
      touch = event
    } else {
      dismissPointer(event)
    }
  }

  const click = () => {
    const event = touch
    touch = undefined

    if (event !== undefined) {
      dismissPointer(event)
    }
  }

  const pointercancel = () => {
    touch = undefined
  }

  let restoringFocus = false

  const focusin = (event: FocusEvent) => {
    const root = top()

    if (root === undefined || !(event.target instanceof HTMLElement)) {
      return
    }

    if (inside(root, event.target)) {
      root.lastFocused = event.target

      return
    }

    if (!root.open() || branches.hasTop(root.id)) {
      return
    }

    const trigger = document.querySelector<HTMLElement>(
      `[data-fluid-dialog-trigger="${CSS.escape(root.id)}"]`,
    )

    if (!restoringFocus) {
      outside(root, event, trigger?.contains(event.target) === true)
    }

    if (root.modal()) {
      const panel = root.panel()
      const destination = root.lastFocused?.isConnected === true ? root.lastFocused : panel
      destination?.focus({ preventScroll: true })
    }
  }

  const listen = (attach: boolean) => {
    if (attach) {
      document.addEventListener('keydown', keydown)
      document.addEventListener('pointerdown', pointerdown)
      document.addEventListener('click', click)
      document.addEventListener('pointercancel', pointercancel)
      document.addEventListener('focusin', focusin)
    } else {
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('pointerdown', pointerdown)
      document.removeEventListener('click', click)
      document.removeEventListener('pointercancel', pointercancel)
      pointercancel()
      document.removeEventListener('focusin', focusin)
    }
  }

  const containerFor = (id: string, targetId: string) => {
    const explicit =
      targetId === ''
        ? options.container?.(id)
        : document.querySelector<HTMLElement>(`#${CSS.escape(targetId)}`)

    if (targetId !== '' && (explicit === null || explicit === undefined)) {
      throw new Error(`Dialog portal container ${targetId} not found`)
    }

    return {
      element: explicit,
      scoped: explicit !== null && explicit !== undefined,
    }
  }

  return {
    leasePointerBarrier: pointers.lease,
    registerBranch: (branch: Parameters<typeof branches.register>[0]) =>
      branches.register(branch, reconcile),
    mountPortal: (element: Element, id: string, targetId: string) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const parent = element.parentNode

          if (parent === null) {
            throw new Error('Dialog portal must be connected')
          }

          const target = containerFor(id, targetId)
          const marker = document.createComment(`dialog:${id}`)
          element.before(marker)
          const owner = createDialogPortalOwner(document, element)
          owner.move(target.element)

          const record = {
            element,
            owner,
            targetId,
            parentId:
              parent instanceof Element
                ? parent.closest<HTMLElement>('dialog[data-fluid-dialog]')?.id
                : undefined,
          }

          portals.set(id, record)

          return { marker, scoped: target.scoped, record }
        }),
        ({ marker, record }) =>
          Effect.sync(() => {
            if (portals.get(id) === record) {
              portals.delete(id)
            }

            marker.parentNode?.insertBefore(element, marker)
            marker.remove()
            record.owner.release()
          }),
      ).pipe(Effect.map(({ scoped }) => scoped)),
    resolveContainer: (id: string, targetId: string) =>
      Effect.sync(() => {
        const portal = portals.get(id)
        const destination = targetId === '' ? (portal?.targetId ?? '') : targetId
        const target = containerFor(id, destination)

        if (portal !== undefined) {
          portal.targetId = destination

          portal.owner.move(target.element)
        }

        reconcile()

        return target.scoped
      }),
    observeRoot: observeDialogRoot(document, options, {
      reconcile,
      restoreFocus: (destination) => {
        restoringFocus = true

        try {
          destination.focus({ preventScroll: true })
        } finally {
          restoringFocus = false
        }
      },
      parentOf: (id) => portals.get(id)?.parentId,
      activate: (root) => {
        const index = roots.indexOf(root)

        if (index !== -1) {
          roots.splice(index, 1)
        }

        roots.push(root)
        const portal = portals.get(root.id)?.element
        const parent = portal?.parentElement

        if (
          portal !== undefined &&
          parent !== null &&
          parent !== undefined &&
          parent.lastElementChild !== portal
        ) {
          parent.append(portal)
        }
      },
      mount: (root) => {
        if (roots.length === 0) {
          listen(true)
        }

        roots.push(root)
      },
      unmount: (root) => {
        const index = roots.indexOf(root)

        if (index !== -1) {
          roots.splice(index, 1)
        }

        reconcile()

        if (roots.length === 0) {
          listen(false)
        }
      },
    }),
  }
}
