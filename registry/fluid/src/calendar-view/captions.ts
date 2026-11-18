import { fontWeights } from '../lib/font-weight.js'
import { resolvePresentation } from '../presentation.js'
import type { Html } from 'foldkit/html'
import type { TargetMotionOptions } from '../motion-target.js'
import { boundAttributes, hasCustomComponent } from './slots.js'
import { css } from './style.js'
import { Button } from '../button.js'
/* @license Fluid Functionalism 200b4534, MIT, copyright 2026 Micka Touillaud. */
import type { CalendarChild, ViewContext, SlotProps } from './contracts.js'
import { Action } from '../calendar-state.js'
import type { Projection } from '../calendar-state.js'
import { calendarSlide } from '../calendar-presentation.js'
import { spring } from '../lib/springs.js'
import { typeClass } from '../lib/type-scale.js'
import { cn } from '../lib/utils.js'

const dayPickerCaption: (
  ctx: ViewContext,
  month: Projection['months'][number],
  displayIndex: number,
) => ReadonlyArray<CalendarChild> = function dayPickerCaption(
  ctx: ViewContext,
  month: Projection['months'][number],
  displayIndex: number,
) {
  const { h, projection } = ctx
  const props = { context: ctx, month, displayIndex, attributes: [], children: [] }

  if (projection.captionLayout === 'label') {
    return [
      ctx.render('CaptionLabel', {
        ...props,
        attributes: [h.Role('status'), h.AriaLive('polite')],
        children: [month.caption],
      }),
    ]
  }
  const dropdown = projection.dropdowns.find((item) => item.date === month.date)

  if (dropdown === undefined) {
    return []
  }

  const monthControl =
    projection.captionLayout === 'dropdown' || projection.captionLayout === 'dropdown-months'
      ? ctx.render('MonthsDropdown', { ...props, key: 'month' })
      : h.keyed('span')('month', [], [dropdown.monthText])

  const yearControl =
    projection.captionLayout === 'dropdown' || projection.captionLayout === 'dropdown-years'
      ? ctx.render('YearsDropdown', { ...props, key: 'year' })
      : h.keyed('span')('year', [], [dropdown.yearText])

  return [
    ctx.render('DropdownNav', {
      ...props,
      children: [
        ...(projection.monthYearOrder === 'year-first'
          ? [yearControl, monthControl]
          : [monthControl, yearControl]),
        h.span(
          [
            h.Role('status'),
            h.AriaLive('polite'),
            h.Class(
              '[border:0] [clip:rect(0_0_0_0)] h-px -m-px overflow-hidden p-0 absolute w-px whitespace-nowrap [word-wrap:normal]',
            ),
          ],
          [month.caption],
        ),
      ],
    }),
  ]
}

const captionLayout: (
  ctx: ViewContext,
  caption: CalendarChild,
  previous: CalendarChild,
  next: CalendarChild,
  first: boolean,
  last: boolean,
) => Array<CalendarChild> = function captionLayout(
  ctx: ViewContext,
  caption: CalendarChild,
  previous: CalendarChild,
  next: CalendarChild,
  first: boolean,
  last: boolean,
) {
  const { h, projection, visual } = ctx

  const children: Array<CalendarChild> = []

  if (ctx.twoUp) {
    children.push(
      h.div(
        [
          h.Class(
            cn(
              'absolute top-1/2 -translate-y-1/2',
              projection.showWeekNumber ? 'left-[calc(var(--cell-size)*0.75)]' : 'left-0',
            ),
          ),
        ],
        [previous],
      ),
    )
  }
  const { stride } = visual

  if (ctx.twoUp && stride !== null) {
    const fade = first && projection.showWeekNumber ? `calc(var(--cell-size) * 0.75 + ${COL})` : COL
    const mask = `linear-gradient(to ${first ? 'right' : 'left'}, transparent ${fade}, #000 calc(${fade} + 24px))`
    children.push(
      h.div(
        [
          h.Class('pointer-events-none absolute inset-y-0'),
          h.Style(
            css({
              left: first ? 0 : -stride,
              right: last ? 0 : -stride,
              maskImage: mask,
              WebkitMaskImage: mask,
            }),
          ),
        ],
        [
          h.div(
            [
              h.Class('absolute inset-y-0 flex items-center justify-center'),
              h.Style(
                css({
                  left: first ? 0 : stride,
                  right: last ? 0 : stride,
                }),
              ),
            ],
            [caption],
          ),
        ],
      ),
    )
  } else if (projection.months.length === 1 && stride !== null) {
    const navWidth = projection.hideNavigation ? '0px' : `calc(${COL} * 2)`
    const mask = `linear-gradient(to left, transparent calc(${stride}px + ${navWidth}), #000 calc(${stride}px + ${navWidth} + 24px))`
    children.push(
      h.div(
        [
          h.Class('pointer-events-none absolute inset-y-0'),
          h.Style(
            css({
              left: -stride,
              right: -stride,
              maskImage: mask,
              WebkitMaskImage: mask,
            }),
          ),
        ],
        [
          h.div(
            [
              h.Class(
                cn(
                  'absolute inset-y-0 flex items-center',
                  projection.showWeekNumber ? 'pl-[calc(var(--cell-size)*0.75+0.5rem)]' : 'pl-2',
                ),
              ),
              h.Style(css({ left: stride, right: stride })),
            ],
            [caption],
          ),
        ],
      ),
      h.span([h.AriaHidden(true), h.Class('flex-1')], []),
    )
  } else {
    children.push(caption)
  }
  children.push(
    ctx.twoUp ? h.div([h.Class('absolute right-0 top-1/2 -translate-y-1/2')], [next]) : next,
  )

  return children
}

type Direction = 'previous' | 'next'

const COL = 'var(--calendar-col, var(--cell-size))'

export function renderNav(ctx: ViewContext, buttons: ReadonlyArray<Direction>) {
  const { h, inputs, projection } = ctx
  const group = buttons.join('-')
  const standard =
    (ctx.calendar.presentation.hoverMode ??
      resolvePresentation({ context: inputs.presentationContext }).hoverMode) === 'standard'
  const animateHover = (node: Html, options: TargetMotionOptions) =>
    standard ? node : inputs.animate(node, options)

  const highlights = ctx.visual.overlays
    .filter((slot) => slot.group === `nav:${group}` && (!standard || slot.present))
    .map((slot) =>
      animateHover(
        h.keyed('div')(
          slot.key,
          [
            h.Class(
              cn('pointer-events-none absolute left-0 top-0 z-0 bg-hover', inputs.shape.button),
            ),
            h.DataAttribute('slot', 'fluid-hover-highlight'),
            h.AriaHidden(true),
            ...(standard
              ? [
                  h.Style({
                    left: `${slot.rect.left}px`,
                    top: `${slot.rect.top}px`,
                    width: `${slot.rect.width}px`,
                    height: `${slot.rect.height}px`,
                  }),
                ]
              : []),
            h.DataAttribute('calendar-overlay', slot.key),
            h.DataAttribute('calendar-overlay-generation', String(slot.generation)),
            h.DataAttribute('calendar-overlay-present', String(slot.present)),
          ],
          [],
        ),
        {
          initial: {
            opacity: 0,
            x: slot.rect.left,
            y: slot.rect.top,
            width: slot.rect.width,
            height: slot.rect.height,
          },
          animate: {
            opacity: 1,
            x: slot.rect.left,
            y: slot.rect.top,
            width: slot.rect.width,
            height: slot.rect.height,
          },
          exit: { opacity: 0, transition: spring.fast.exit },
          present: slot.present,
          transition: {
            ...(ctx.visual.reduceMotion ? { duration: 0 } : spring.fast),
            opacity: { duration: 0.08 },
          },
        },
      ),
    )

  return h.div(
    [
      h.DataAttribute('slot', 'calendar-nav'),
      h.DataAttribute('calendar-nav-group', group),
      h.Class('relative flex items-center'),
    ],
    [
      ...highlights,
      ...buttons.map((direction) => {
        const target = direction === 'previous' ? projection.previous : projection.next
        const flip = (direction === 'previous') !== (projection.dir === 'rtl')

        const vertical = direction === 'previous' ? 'up' : 'down'
        const horizontal = flip ? 'left' : 'right'
        const orientation = ctx.stacked ? vertical : horizontal

        const attributes = [
          h.Type('button'),
          h.Disabled(target === null),
          h.AriaLabel(direction === 'previous' ? projection.previousLabel : projection.nextLabel),
          ...(target === null ? [h.AriaDisabled(true)] : []),
          h.DataAttribute('calendar-nav', direction),
          ...(ctx.visual.navActive === `${group}:${direction}`
            ? [h.DataAttribute('fluid-hover-active', '')]
            : []),
          h.OnClick(ctx.request(Action.cases.Navigated.make({ direction }))),
        ]

        const icon = inputs.chevron([], orientation)

        const button = inputs.tooltip({
          content: direction === 'previous' ? 'Previous month' : 'Next month',
          render: ({ button: render }) =>
            Button(
              {
                context: inputs.presentationContext,
                variant: 'ghost',
                buttonSize: 'icon-compact',
                disabled: target === null,
                className:
                  'relative z-[1] !size-[min(var(--calendar-col,var(--cell-size)),var(--cell-size))] group-hover:[&>span:first-child]:!bg-transparent group-hover:[&>span:first-child]:!shadow-none',
                attributes,
                children: [icon],
                render: (own, children) => render(boundAttributes(own), children),
              },
              h,
            ),
        })

        return h.span(
          [h.Class('flex w-[var(--calendar-col,var(--cell-size))] justify-center')],
          [h.span([h.Class('relative flex')], [button])],
        )
      }),
    ],
  )
}

function renderCaptionText(
  ctx: ViewContext,
  month: Projection['months'][number],
  index: number,
  key: string,
  present: boolean,
) {
  const { h, inputs, visual, projection } = ctx

  const hiddenElsewhere =
    !present && visual.stride !== null && projection.months.some((item) => item.date === month.date)

  const motion = calendarSlide({
    direction: visual.direction,
    stride: visual.stride,
    stacked: ctx.stacked,
    single: projection.months.length === 1,
    reduceMotion: visual.reduceMotion,
    present,
  })

  return inputs.animate(
    h.keyed('span')(
      `${key}-caption`,
      [
        h.Class(
          cn(
            'col-start-1 row-start-1 whitespace-nowrap text-foreground [text-box:trim-both_cap_alphabetic]',
            ctx.twoUp ? 'justify-self-center' : 'justify-self-start',
            hiddenElsewhere && 'invisible',
            typeClass('body', inputs.compact ? 'compact' : 'default'),
          ),
        ),
        h.DataAttribute('calendar-caption-panel', key),
        h.DataAttribute('calendar-panel', key),
        h.DataAttribute('calendar-present', String(present)),
        ...(present ? [h.Role('status'), h.AriaLive('polite')] : [h.AriaHidden(true)]),
        h.Style({ fontVariationSettings: fontWeights.semibold }),
      ],
      [month.caption],
    ),
    visual.generation === 0 ? { ...motion, initial: false } : motion,
  )
}

function captionNavigation(ctx: ViewContext, first: boolean, last: boolean) {
  if (ctx.projection.hideNavigation || ctx.stacked) {
    return null
  }

  if (ctx.twoUp) {
    return last ? renderNav(ctx, ['next']) : null
  }

  return first ? renderNav(ctx, ['previous', 'next']) : null
}

export function renderCaption(
  ctx: ViewContext,
  month: Projection['months'][number],
  index: number,
  key: string,
) {
  const { h, inputs, visual, projection } = ctx
  const first = index === 0
  const last = index === projection.months.length - 1

  const caption = h.span(
    [h.Class('relative inline-grid')],
    [
      ...visual.retained
        .filter((panel) => panel.index === index)
        .map((panel) => renderCaptionText(ctx, panel.month, index, panel.key, false)),
      renderCaptionText(ctx, month, index, key, true),
    ],
  )

  const previous =
    !projection.hideNavigation && ctx.twoUp && first ? renderNav(ctx, ['previous']) : null

  const next = captionNavigation(ctx, first, last)

  const children = captionLayout(ctx, caption, previous, next, first, last)

  const props: SlotProps = {
    context: ctx,
    month,
    displayIndex: index,
    attributes: [
      h.DataAttribute('slot', 'calendar-caption'),
      h.DataAttribute('calendar-inert', ''),
      h.Class(
        cn(
          'relative flex h-[var(--cell-size)] items-center gap-1',
          ctx.twoUp ? 'justify-center' : 'justify-between pl-2',
          projection.showWeekNumber &&
            (ctx.twoUp
              ? 'pl-[calc(var(--cell-size)*0.75)]'
              : 'pl-[calc(var(--cell-size)*0.75+0.5rem)]'),
          'mb-1',
        ),
      ),
    ],
    children,
  }

  return ctx.render(
    'MonthCaption',
    hasCustomComponent(inputs, 'MonthCaption')
      ? { ...props, sourceChildren: dayPickerCaption(ctx, month, index) }
      : props,
  )
}
