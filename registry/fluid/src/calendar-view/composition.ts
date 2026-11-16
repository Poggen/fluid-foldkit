import { Match } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { DocumentTooltipOccurrenceViewInputs } from '../tooltip-native-public.js'
import { resolvePresentation } from '../presentation.js'
import type { PresentationContext } from '../presentation.js'
import type { TargetMotionScope } from '../motion-target.js'
import type { CalendarViewInputs } from './contracts.js'

// The containing application's DocumentTooltip Binding owns two registrations:
// `${key}:previous` and `${key}:next`. It calls add once through public Steps.
// Its render callback supplies the real DocumentTooltip renderer below.
// Its required renderTrigger callback invokes the registered bound trigger.
// registerTrigger stores it only in a Map local to the current parent view call.
export function calendarTooltipKeys(key: string): ReadonlyArray<string> {
  return [`${key}:previous`, `${key}:next`]
}

export function calendarViewInputs<Message>(
  h: HtmlBuilder<Message>,
  options: {
    readonly key: string
    readonly context: PresentationContext
    readonly motion: TargetMotionScope
    readonly keyboardTrigger: boolean
    readonly tooltip: (
      key: string,
      inputs: Omit<DocumentTooltipOccurrenceViewInputs, 'trigger'>,
    ) => Html
    readonly registerTrigger: (
      key: string,
      render: Parameters<CalendarViewInputs['tooltip']>[0]['render'],
    ) => void
    readonly fill?: boolean
    readonly cellSize?: number
  },
): CalendarViewInputs {
  const presentation = resolvePresentation({ context: options.context })
  const icon = presentation.icons['chevron-right']

  const inputs: CalendarViewInputs = {
    presentationContext: options.context,
    keyboardTrigger: options.keyboardTrigger,
    compact: presentation.size.variant === 'compact',
    pill: presentation.shape.variant === 'pill',
    fill: options.fill ?? false,
    shape: presentation.shape,
    animate: options.motion.node,
    tooltip: ({ content, render }) => {
      const key = `${options.key}:${content === 'Previous month' ? 'previous' : 'next'}`
      options.registerTrigger(key, render)

      return options.tooltip(key, {
        content,
        shapeClass: presentation.shape.bg,
        reducedMotion: presentation.reducedMotion,
        animate: options.motion.node,
      })
    },
    chevron: (attributes, orientation, size = 16) => {
      const node = icon(
        {
          size,
          className: Match.value(orientation).pipe(
            Match.when('left', () => 'rotate-180'),
            Match.when('up', () => '-rotate-90'),
            Match.when('down', () => 'rotate-90'),
            Match.orElse(() => ''),
          ),
        },
        h,
      )

      return attributes.length === 0 ? node : h.span([...attributes, h.Class('contents')], [node])
    },
  }

  return options.cellSize === undefined ? inputs : { ...inputs, cellSize: options.cellSize }
}
