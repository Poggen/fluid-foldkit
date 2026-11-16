// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { ChildAttribute, Html } from 'foldkit/html'
import type { Presentation, PresentationContext } from './presentation.js'
import type { MotionOptions } from './motion.js'

export interface DialogContext {
  readonly id: string
  readonly open: boolean
  readonly titleId: string
  readonly descriptionId: string
  readonly close: ReadonlyArray<ChildAttribute>
  readonly initialFocus: ReadonlyArray<ChildAttribute>
  readonly presentation: Presentation & { readonly context: PresentationContext }
}

export interface DialogProps extends Omit<Presentation, 'size'> {
  readonly presentation?: Omit<Presentation, 'context'>
  readonly size?: 'sm' | 'lg' | 'xl'
  readonly trigger?: (attributes: ReadonlyArray<ChildAttribute>) => Html
  readonly content: (context: DialogContext) => ReadonlyArray<Html | string>
  readonly position?: 'center' | 'top'
  readonly showCloseButton?: boolean
  readonly hasDescription?: boolean
  readonly className?: string
  readonly contentClassName?: string
  readonly contentAttributes?: ReadonlyArray<ChildAttribute>
  readonly contentRender?: (
    attributes: ReadonlyArray<ChildAttribute>,
    children: ReadonlyArray<Html | string>,
    key?: string,
  ) => Html
  readonly triggerAttributes?: ReadonlyArray<ChildAttribute>
  readonly portalContainerId?: string
  readonly callbacksId?: string
  readonly scoped?: boolean
  readonly panelRender?: (
    attributes: ReadonlyArray<ChildAttribute>,
    children: ReadonlyArray<Html | string>,
    key?: string,
  ) => Html
  readonly backdropRender?: (attributes: ReadonlyArray<ChildAttribute>) => Html
  readonly panelMotion?: (open: boolean) => MotionOptions
  readonly backdropMotion?: (open: boolean) => MotionOptions
  readonly animate: (node: Html, options: MotionOptions) => Html
}
