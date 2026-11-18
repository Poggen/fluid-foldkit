import { EXIT_COMPLETE_EVENT } from './motion-target.js'
import { Data, Option } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { rectAt } from './lib/indexed-geometry.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import type { HoverMode, HoverSnapshot } from './hover-observation.js'
import type { resolvePresentation } from './presentation.js'
import type { TabsContext } from './tabs-parts.js'
import type { TabsLogicalState } from './tabs-state.js'

export const tabsDecorations: <Message, Requirements>(
  model: TabsLogicalState & { readonly hover: HoverSnapshot },
  h: HtmlBuilder<Message, Requirements>,
  options: {
    readonly hoverMode?: HoverMode
    readonly selectedPill: Html
    readonly animate: TabsContext['animate']
    readonly shape: Presentation['shape']
    readonly reducedMotion: Presentation['reducedMotion']
    readonly completion: (kind: 'hover' | 'focus', generation: number) => Attribute<Message>
  },
) => ReadonlyArray<Html> = function tabsDecorations<Message, Requirements>(
  model: TabsLogicalState & { readonly hover: HoverSnapshot },
  h: HtmlBuilder<Message, Requirements>,
  options: {
    readonly hoverMode?: HoverMode
    readonly selectedPill: Html
    readonly animate: TabsContext['animate']
    readonly shape: Presentation['shape']
    readonly reducedMotion: Presentation['reducedMotion']
    readonly completion: (kind: 'hover' | 'focus', generation: number) => Attribute<Message>
  },
) {
  const selected = rectAt(model.hover.itemRects, model.selectedIndex)

  const slots = (['hover', 'focus'] satisfies ReadonlyArray<'hover' | 'focus'>).map((kind) => {
    const slot = kind === 'hover' ? model.hoverSlot : model.focusSlot

    if (Option.isNone(slot)) {
      return null
    }

    const state = slot.value

    const rect =
      kind === 'focus'
        ? {
            left: state.rect.left - 2,
            top: state.rect.top - 2,
            width: state.rect.width + 4,
            height: state.rect.height + 4,
          }
        : state.rect

    if (kind === 'hover' && options.hoverMode === 'standard') {
      return state.phase === 'Present'
        ? h.keyed('div')('hover', [
            h.Class(cn('absolute bg-hover pointer-events-none', options.shape.bg)),
            h.Style({
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
            }),
          ])
        : null
    }

    return options.animate(
      h.keyed('div')(kind, [
        h.Class(
          kind === 'focus'
            ? cn(
                'absolute pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]',
                options.shape.focusRing,
              )
            : cn('absolute bg-active pointer-events-none', options.shape.bg),
        ),
        options.completion(kind, state.generation),
      ]),
      {
        initial: kind === 'hover' && selected ? { ...selected, opacity: 0 } : false,
        animate: { ...rect, opacity: kind === 'hover' ? 0.4 : 1 },
        exit:
          kind === 'hover' && state.converge
            ? {
                ...rect,
                opacity: 0,
                transition: { ...spring.moderate, opacity: { duration: 0.06 } },
              }
            : { opacity: 0, transition: spring.fast.exit },
        transition: { ...spring.fast, opacity: { duration: 0.08 } },
        present: state.phase === 'Present',
        reducedMotion: options.reducedMotion,
      },
    )
  })

  return [options.selectedPill, ...slots] satisfies ReadonlyArray<Html>
}

type Presentation = ReturnType<typeof resolvePresentation>

export function tabsExitAttribute<Message>(message: Message) {
  const Events = Data.taggedEnum<Extract<Attribute<Message>, { readonly _tag: 'OnCustomEvent' }>>()

  return Events.OnCustomEvent({ name: EXIT_COMPLETE_EVENT, f: () => Option.some(message) })
}
