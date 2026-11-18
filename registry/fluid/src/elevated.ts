/* @license Derived from Fluid Functionalism 200b4534. MIT; see NOTICE */
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { surfaceClasses } from './lib/surface-classes.js'
import { cn } from './lib/utils.js'
import { createPresentationContext, type PresentationContext } from './presentation.js'
import { useSurface } from './presentation-context.js'

export const Elevated: <Message>(props: ElevatedProps<Message>, h: HtmlBuilder<Message>) => Html =
  function Elevated<Message>(props: ElevatedProps<Message>, h: HtmlBuilder<Message>) {
    const level = Math.min(useSurface(props.context) + props.offset, 8)
    const context = createPresentationContext({ ...props, surface: level })

    const attributes = [
      h.Class(cn(surfaceClasses(level, props.shadowLevel ?? level), props.className)),
      ...(props.attributes ?? []),
    ]

    const children = props.children(context)

    return (
      props.render ? props.render(attributes, children) : h.div(attributes, children)
    ) satisfies Html
  }

export interface ElevatedProps<Message> {
  readonly context?: PresentationContext
  readonly offset: number
  readonly shadowLevel?: number
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
  readonly children: (context: PresentationContext) => ReadonlyArray<Html | string>
  readonly render?: (
    attributes: ReadonlyArray<Attribute<Message> | ChildAttribute>,
    children: ReadonlyArray<Html | string>,
  ) => Html
}
