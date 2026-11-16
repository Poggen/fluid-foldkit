import type { DialogLifecycleEvent } from './dialog-focus.js'

export interface DialogCallbacks {
  readonly onEscapeKeyDown?: (event: KeyboardEvent) => void
  readonly onPointerDownOutside?: (event: DialogLifecycleEvent<PointerEvent>) => void
  readonly onFocusOutside?: (event: DialogLifecycleEvent<FocusEvent>) => void
  readonly onInteractOutside?: (event: DialogLifecycleEvent<PointerEvent | FocusEvent>) => void
  readonly onOpenAutoFocus?: (event: DialogLifecycleEvent<null>) => void
  readonly onCloseAutoFocus?: (event: DialogLifecycleEvent<null>) => void
  readonly contentRef?: (element: HTMLElement | null) => void
}

export interface DialogResourceOptions {
  readonly callbacks?: (id: string, callbacksId?: string) => DialogCallbacks
  readonly container?: (id: string) => HTMLElement | null
}
