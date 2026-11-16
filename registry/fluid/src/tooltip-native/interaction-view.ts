import { fontWeights } from '../lib/font-weight.js'
import { Observation } from './observation.js'
import { Match, Option } from 'effect'
import type { Layer } from 'effect'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html } from 'foldkit/html'
import { spring } from '../lib/springs.js'
import { cn } from '../lib/utils.js'
import type { TargetMotionOptions } from '../motion-target.js'
import { effectiveOpen } from './domain.js'
import type { Presentation } from './domain.js'
import {
  TooltipInteractionComposition,
  ObserveTrigger,
  ObservePopup,
  PopupResource,
} from './interaction-definition.js'
import { encodePopupPresentation } from './popup-presentation.js'
import type { PopupPresentation } from './popup-presentation.js'
import { TOOLTIP_ANIMATION_COMPLETE } from './resources.js'

export type TooltipButtonRenderer = (
  attributes: ReadonlyArray<ChildAttribute>,
  children: ReadonlyArray<Html | string>,
  key?: string,
) => Html

export type TooltipAnchorRenderer = TooltipButtonRenderer
export type TooltipSpanRenderer = TooltipButtonRenderer

export type TooltipDivRenderer = (
  attributes: ReadonlyArray<ChildAttribute>,
  children: ReadonlyArray<Html | string>,
  key?: string,
) => Html

export interface TooltipViewInputs {
  readonly trigger: (context: {
    readonly attributes: ReadonlyArray<ChildAttribute<Layer.Success<typeof ObserveTrigger.layer>>>
    readonly button: TooltipButtonRenderer
    readonly anchor: TooltipAnchorRenderer
    readonly span: TooltipSpanRenderer
    readonly div: TooltipDivRenderer
  }) => Html
  readonly content?: string
  readonly className?: string
  readonly contentClassName?: string
  readonly shapeClass: string
  readonly portalContainerId?: string
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  readonly reducedMotion: 'user' | 'always' | 'never'
}

export type InteractionViewInputs =
  | {
      readonly part: 'trigger'
      readonly presentation: Presentation
      readonly trigger: TooltipViewInputs['trigger']
    }
  | (Omit<TooltipViewInputs, 'trigger' | 'content'> & {
      readonly part: 'popup'
      readonly presentation: Presentation
      readonly renderContent: () => Html | string
    })

export const view = TooltipInteractionComposition.makeView.withInputs<InteractionViewInputs>(
  (model, inputs, h) => {
    const { presentation } = inputs
    const open = effectiveOpen(presentation)
    const config = presentation.configuration

    if (inputs.part === 'trigger') {
      const attrs = childAttributes([
        ...(open ? [h.AriaDescribedBy(`${model.id}-popup`)] : []),
        h.DataAttribute('state', open ? 'open' : 'closed'),
        h.DataAttribute('tooltip-trigger', model.id),
        h.DataAttribute(
          'tooltip-follow',
          Option.getOrElse(config.followCursor, () => 'none'),
        ),
        h.DataAttribute(
          'tooltip-force',
          Option.match(config.forceOpen, { onNone: () => 'none', onSome: String }),
        ),
        h.OnMount(ObserveTrigger({ id: model.id })),
        ...(typeof window === 'undefined' ? [] : [h.OnUnmount(Observation.Unmounted())]),
      ])

      return inputs.trigger({
        attributes: attrs,
        button: (own, children, key) =>
          key === undefined
            ? h.button([...own, ...attrs], children)
            : h.keyed('button')(key, [...own, ...attrs], children),
        anchor: (own, children, key) =>
          key === undefined
            ? h.a([...own, ...attrs], children)
            : h.keyed('a')(key, [...own, ...attrs], children),
        span: (own, children, key) =>
          key === undefined
            ? h.span([...own, ...attrs], children)
            : h.keyed('span')(key, [...own, ...attrs], children),
        div: (own, children, key) =>
          key === undefined
            ? h.div([...own, ...attrs], children)
            : h.keyed('div')(key, [...own, ...attrs], children),
      })
    }

    if (presentation.phase === 'absent' || !model.domReady) {
      return h.empty
    }

    const slide = Match.value(config.side).pipe(
      Match.when('top', () => ({ x: 0, y: 4 })),
      Match.when('bottom', () => ({ x: 0, y: -4 })),
      Match.when('left', () => ({ x: 4, y: 0 })),
      Match.when('right', () => ({ x: -4, y: 0 })),
      Match.exhaustive,
    )

    const exit = { opacity: 0, ...slide }

    const box = inputs.animate(
      h.div(
        [
          h.Class(
            cn(
              'bg-foreground text-background text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] px-2 py-1',
              '[text-box:trim-both_cap_alphabetic] supports-[text-box:trim-both]:py-2',
              inputs.shapeClass,
              inputs.className,
            ),
          ),
          h.Style({ fontVariationSettings: fontWeights.normal }),
        ],
        [inputs.renderContent()],
      ),
      {
        initial: { opacity: 0, ...slide },
        animate: open ? { opacity: 1, x: 0, y: 0 } : exit,
        transition: open ? spring.fast : spring.fast.exit,
        reducedMotion: inputs.reducedMotion,
        onAnimationComplete: (element) => {
          element.dispatchEvent(
            new CustomEvent(TOOLTIP_ANIMATION_COMPLETE, {
              bubbles: true,
              detail: { generation: presentation.generation },
            }),
          )
        },
      },
    )

    const committed: typeof PopupPresentation.Type = {
      side: config.side,
      sideOffset: config.sideOffset,
      followCursor: Option.getOrElse(config.followCursor, () => 'none'),
    }

    const popupMount = h.OnMount(
      ObservePopup({ resource: PopupResource.Content({ id: model.id }) }),
    )

    return h.div(
      [
        h.Class(
          cn('z-[var(--z-tooltip,70)]', inputs.contentClassName, open ? '' : 'pointer-events-none'),
        ),
        h.Id(`${model.id}-popup`),
        h.Role('tooltip'),
        h.DataAttribute('tooltip-popup', model.id),
        h.DataAttribute('state', open ? 'open' : 'closed'),
        h.DataAttribute('tooltip-presentation', encodePopupPresentation(committed)),
        h.DataAttribute('tooltip-container', inputs.portalContainerId ?? ''),
        h.Style({}),
        h.OnMount(ObservePopup({ resource: PopupResource.Portal() })),
      ],
      [h.div([h.DataAttribute('tooltip-follow', ''), popupMount, h.Tabindex(-1)], [box])],
    )
  },
)
