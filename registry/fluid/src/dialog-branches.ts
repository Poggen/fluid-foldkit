import { Effect } from 'effect'

/** A portalled child owned by the same application resource Layer as its Dialog. */
export interface DialogBranch {
  readonly modal?: boolean
  /** External input and dismiss controls kept accessible by a typeable popup. */
  readonly accessibleReferences?: ReadonlyArray<HTMLElement>
  readonly id: string
  /** Owning root Dialog ID, or this root popup's ID outside a Dialog. */
  readonly rootId: string
  /** Immediate Dialog or popup owner; explicit IDs preserve portal ancestry. */
  readonly parentId: string | undefined
  readonly host: HTMLElement
  readonly panel: HTMLElement
  readonly trigger: HTMLElement | null
  /** Emit the owner's guarded private mount message; the registry never updates child Model. */
  readonly requestClose: (reason: 'escape' | 'outside' | 'focus') => void
  /** Observe the checked Block's current mounted view; do not maintain another open state. */
  readonly isOpen: () => boolean
}

export function createDialogBranches(document: Document, topDialog: () => string | undefined) {
  const branches: Array<DialogBranch> = []
  const focused = new WeakMap<DialogBranch, HTMLElement>()

  const belongs = (branch: DialogBranch, id: string): boolean => {
    const visited = new Set<string>()
    let current: DialogBranch | undefined = branch

    while (current && !visited.has(current.id)) {
      if (current.rootId === id || current.parentId === id) return true
      visited.add(current.id)
      const parentId: string | undefined = current.parentId
      current = branches.find((candidate) => candidate.id === parentId)
    }

    return false
  }

  const descendants = (id: string) =>
    branches.filter((branch) => branch.isOpen() && belongs(branch, id))

  const contains = (branch: DialogBranch, target: Node) =>
    branch.panel.contains(target) ||
    branch.trigger?.contains(target) === true ||
    descendants(branch.id).some(
      (child) => child.panel.contains(target) || child.trigger?.contains(target),
    )

  const top = () =>
    branches.findLast((branch) => {
      const dialog = topDialog()

      return branch.isOpen() && (dialog === undefined || belongs(branch, dialog))
    })

  let touch: PointerEvent | undefined

  const dismissOutside = (event: PointerEvent) => {
    const branch = top()

    if (
      branch &&
      event.target instanceof Node &&
      !event.defaultPrevented &&
      !contains(branch, event.target)
    )
      branch.requestClose('outside')
  }

  const pointerdown = (event: PointerEvent) => {
    touch = undefined

    if (event.button !== 0 || event.ctrlKey) return

    if (event.pointerType === 'touch') touch = event
    else dismissOutside(event)
  }

  const click = () => {
    if (touch) {
      const pending = touch
      touch = undefined
      dismissOutside(pending)
    }
  }

  const cancel = () => {
    touch = undefined
  }

  const keydown = (event: KeyboardEvent) => {
    const branch = top()

    if (
      branch?.modal &&
      event.key === 'Tab' &&
      event.target instanceof Node &&
      branch.panel.contains(event.target)
    ) {
      event.preventDefault()
      return
    }

    if (branch && event.key === 'Escape' && !event.defaultPrevented && !event.isComposing) {
      event.preventDefault()
      branch.requestClose('escape')
    }
  }

  const focusin = (event: FocusEvent) => {
    const branch = top()

    const target = event.target
    if (!branch || !(target instanceof Node)) return
    const inside =
      branch.panel.contains(target) ||
      descendants(branch.id).some((child) => child.panel.contains(target))
    if (inside && target instanceof HTMLElement) focused.set(branch, target)
    if (branch.modal && !inside) {
      const selected = branch.panel.querySelector<HTMLElement>(
        '[aria-selected=true]:not([aria-disabled=true])',
      )
      const first = branch.panel.querySelector<HTMLElement>(
        '[role=option]:not([aria-disabled=true])',
      )
      const previous = focused.get(branch)
      const destination = previous?.isConnected ? previous : (selected ?? first ?? branch.panel)
      destination.focus({ preventScroll: true })
    } else if (!contains(branch, target)) branch.requestClose('focus')
  }

  const listen = (attach: boolean) => {
    if (attach) {
      document.addEventListener('keydown', keydown, true)
      document.addEventListener('pointerdown', pointerdown)
      document.addEventListener('pointercancel', cancel)
      document.addEventListener('click', click)
      document.addEventListener('focusin', focusin)
    } else {
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('pointerdown', pointerdown)
      document.removeEventListener('pointercancel', cancel)
      document.removeEventListener('click', click)
      document.removeEventListener('focusin', focusin)
      cancel()
    }
  }

  return {
    descendants,
    accessibleReferences: (id: string) =>
      branches.find((branch) => branch.id === id)?.accessibleReferences ?? [],
    accessibilityEntries: () =>
      branches
        .filter(
          (branch) =>
            branch.accessibleReferences !== undefined &&
            branch.isOpen() &&
            branch.host.isConnected &&
            (topDialog() === undefined || belongs(branch, topDialog() ?? '')),
        )
        .map((branch) => ({ host: branch.host, modal: false, ariaOnly: true, hasContent: true })),
    isolationEntries: () =>
      branches
        .filter(
          (branch) =>
            branch.modal &&
            branch.host.isConnected &&
            (topDialog() === undefined || belongs(branch, topDialog() ?? '')),
        )
        .map((branch) => ({
          host: branch.host,
          modal: true,
          hasContent: branch.panel.isConnected,
        })),
    contains: (id: string, target: Node) =>
      descendants(id).some(
        (branch) => branch.panel.contains(target) || branch.trigger?.contains(target),
      ),
    hasTop: (id: string) => {
      const branch = top()

      return branch !== undefined && belongs(branch, id)
    },
    register: (branch: DialogBranch, changed: () => void) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          if (branches.some((candidate) => candidate.id === branch.id))
            throw new Error(`Duplicate live Dialog branch ${branch.id}`)

          if (branches.length === 0) listen(true)
          branches.push(branch)
          changed()
          const observer = new MutationObserver(changed)
          observer.observe(branch.host, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['data-state', 'data-open', 'data-closed', 'data-combo-open'],
          })

          return observer
        }),
        (observer) =>
          Effect.sync(() => {
            observer.disconnect()
            const index = branches.indexOf(branch)

            if (index >= 0) branches.splice(index, 1)

            if (branches.length === 0) listen(false)
            changed()
          }),
      ).pipe(Effect.asVoid),
  }
}
