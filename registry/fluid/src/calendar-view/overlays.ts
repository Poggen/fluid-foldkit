import { resolvePresentation } from '../presentation.js'
import type { Html } from 'foldkit/html'
import type { TargetMotionOptions } from '../motion-target.js'
import { Selection } from '../calendar-state.js'
import { cn } from '../lib/utils.js'
import { spring } from '../lib/springs.js'
import type { ViewContext } from './contracts.js'

export function renderOverlays(ctx: ViewContext) {
  const { h, inputs, visual, calendar, projection } = ctx
  const standard =
    (calendar.presentation.hoverMode ??
      resolvePresentation({ context: inputs.presentationContext }).hoverMode) === 'standard'
  const animateHover = (node: Html, options: TargetMotionOptions) =>
    standard ? node : inputs.animate(node, options)
  const selection = calendar.selection.selected
  const from = Selection.isAnyOf(['Range'])(selection) ? (selection.from?.ordinal ?? null) : null

  const previewGlides =
    projection.preview.previewEnd !== null &&
    from !== null &&
    projection.preview.previewEnd !== from

  const pickStart = previewGlides && from !== null ? (visual.rects[String(from)] ?? null) : null
  const litFilled = visual.active !== null && ctx.isEnd(visual.active)
  const pressedOpacity = visual.pressed ? 'before:opacity-100' : 'before:opacity-40'
  const ringOpacity = litFilled || previewGlides ? pressedOpacity : 'before:opacity-0'
  const cellRadius = inputs.pill ? 'rounded-full' : inputs.shape.bg

  const highlights = visual.overlays
    .filter((slot) => slot.group === 'hover' && (!standard || slot.present))
    .flatMap((slot) =>
      [false, true].map((ring) => {
        const { rect } = slot
        const initial = pickStart ?? rect

        return animateHover(
          h.keyed('div')(
            `${slot.key}-${ring ? 'ring' : 'fill'}`,
            [
              h.Class(
                cn(
                  'pointer-events-none absolute left-0 top-0',
                  cellRadius,
                  ring
                    ? cn(
                        'z-[3] bg-transparent before:pointer-events-none before:absolute before:inset-px before:border before:border-background before:transition-opacity before:duration-80',
                        inputs.pill
                          ? 'before:rounded-full'
                          : inputs.shape.variant === 'sharp'
                            ? 'before:rounded-none'
                            : 'before:rounded-[7px]',
                        ringOpacity,
                      )
                    : cn(
                        'z-[1]',
                        previewGlides
                          ? 'bg-foreground'
                          : cn(
                              'bg-transparent before:pointer-events-none before:absolute before:inset-px before:rounded-[inherit] before:bg-[var(--day-press)] before:transition-[box-shadow,background-color] before:[transition-duration:180ms,80ms] before:[transition-timing-function:cubic-bezier(0.23,1,0.32,1),ease]',
                              visual.pressed && !litFilled
                                ? '[--day-press:var(--active)] before:shadow-[0_0_0_0px_var(--day-press)] before:[transition-duration:80ms,80ms]'
                                : '[--day-press:var(--hover)] before:shadow-[0_0_0_1px_var(--day-press)]',
                            ),
                      ),
                ),
              ),
              h.AriaHidden(true),
              ...(standard
                ? [
                    h.Style({
                      left: `${rect.left}px`,
                      top: `${rect.top}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                    }),
                  ]
                : []),
              h.DataAttribute('slot', 'fluid-hover-highlight'),
              h.DataAttribute('calendar-overlay', slot.key),
              h.DataAttribute('calendar-overlay-generation', String(slot.generation)),
              h.DataAttribute('calendar-overlay-present', String(slot.present)),
              h.DataAttribute('calendar-hover-layer', ring ? 'ring' : 'fill'),
            ],
            [],
          ),
          {
            initial: {
              opacity: pickStart === null ? 0 : 1,
              x: initial.left,
              y: initial.top,
              width: initial.width,
              height: initial.height,
            },
            animate: {
              opacity: 1,
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
            },
            exit: { opacity: 0, transition: spring.fast.exit },
            present: slot.present,
            transition: {
              ...(visual.snap || visual.reduceMotion ? { duration: 0 } : spring.fast),
              opacity: { duration: 0.08 },
            },
          },
        )
      }),
    )

  const focus = visual.overlays
    .filter((slot) => slot.group === 'focus')
    .map((slot) => {
      const { rect } = slot

      return inputs.animate(
        h.keyed('div')(
          slot.key,
          [
            h.DataAttribute('slot', 'calendar-focus-ring'),
            h.AriaHidden(true),
            h.DataAttribute('calendar-overlay', slot.key),
            h.DataAttribute('calendar-overlay-generation', String(slot.generation)),
            h.DataAttribute('calendar-overlay-present', String(slot.present)),
            h.Class(
              cn(
                'pointer-events-none absolute left-0 top-0 z-[3] border border-[color:var(--focus-ring,#6B97FF)]',
                inputs.pill ? 'rounded-full' : inputs.shape.focusRing,
              ),
            ),
          ],
          [],
        ),
        {
          initial: {
            opacity: 0,
            x: rect.left - 2,
            y: rect.top - 2,
            width: rect.width + 4,
            height: rect.height + 4,
          },
          animate: {
            opacity: 1,
            x: rect.left - 2,
            y: rect.top - 2,
            width: rect.width + 4,
            height: rect.height + 4,
          },
          exit: { opacity: 0, transition: spring.fast.exit },
          present: slot.present,
          transition: {
            ...(visual.snap || visual.reduceMotion ? { duration: 0 } : spring.fast),
            opacity: { duration: 0.08 },
          },
        },
      )
    })

  return [...highlights, ...focus]
}
