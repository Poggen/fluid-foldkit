import type { Html, VNode } from 'foldkit/html'

/** Native defaults follow accepted values, while file selection remains browser-owned. */
export function formControlDefault(vnode: Html, value: string): Html {
  if (vnode === null) {
    return null
  }

  const previous = vnode.data?.hook

  const synchronize = (node: VNode) => {
    const element = node.elm

    if (
      element instanceof HTMLTextAreaElement ||
      (element instanceof HTMLInputElement && element.type !== 'file')
    ) {
      element.defaultValue = value
    }
  }

  return {
    ...vnode,
    data: {
      ...vnode.data,
      hook: {
        ...previous,
        insert(node) {
          previous?.insert?.(node)
          synchronize(node)
        },
        postpatch(oldNode, node) {
          previous?.postpatch?.(oldNode, node)
          synchronize(node)
        },
      },
    },
  }
}

export function stepNumberInput(element: HTMLInputElement, direction: number): void {
  if (element.disabled || element.readOnly) {
    return
  }

  if (element.step === 'any') {
    const minimum = element.min === '' ? -Infinity : Number(element.min)
    const maximum = element.max === '' ? Infinity : Number(element.max)
    element.value = String(
      Math.min(maximum, Math.max(minimum, (Number(element.value) || 0) + direction)),
    )
  } else if (direction > 0) {
    element.stepUp()
  } else {
    element.stepDown()
  }

  element.dispatchEvent(new Event('input', { bubbles: true }))
}

export const formControlClasses =
  'w-full min-w-0 border border-border bg-transparent text-foreground outline-none transition-[background-color,border-color] duration-80 placeholder:text-muted-foreground hover:bg-hover aria-invalid:border-destructive/50 focus:border-foreground/40 aria-invalid:focus:border-foreground/40 focus:hover:bg-transparent disabled:opacity-50 disabled:pointer-events-none'

export const preventNumberButtonFocus = (event: Event) => {
  if (event.target instanceof Element && event.target.closest('[data-input-step]')) {
    event.preventDefault()
  }
}
