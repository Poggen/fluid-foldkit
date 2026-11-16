// Fluid Functionalism 200b4534, MIT, copyright 2026 Micka Touillaud.
import type { Attribute } from 'foldkit/html'
import { cn } from '../lib/utils.js'
import { typeClass } from '../lib/type-scale.js'
import { fontWeights } from '../lib/font-weight.js'
import { spring } from '../lib/springs.js'
import { Action, restoreDate } from '../calendar-state.js'
import type { Projection } from '../calendar-state.js'
import { calendarBandSlice } from '../calendar-presentation.js'
import type { CalendarChild, CalendarMessage, ViewContext } from './contracts.js'

const bandStyle = (slice: NonNullable<ReturnType<typeof calendarBandSlice>>) => ({
  left: String(slice.left),
  right: String(slice.right),
  borderTopLeftRadius: String(slice.borderTopLeftRadius),
  borderBottomLeftRadius: String(slice.borderBottomLeftRadius),
  borderTopRightRadius: String(slice.borderTopRightRadius),
  borderBottomRightRadius: String(slice.borderBottomRightRadius),
})

type Day = Projection['months'][number]['weeks'][number]['days'][number]

type Month = Projection['months'][number]

function dayColor(day: Day, selected: boolean, preview: boolean, unavailable: boolean): string {
  if (selected) {
    return 'bg-foreground text-background'
  }

  if (preview) {
    return 'cursor-pointer text-background'
  }

  if (unavailable) {
    return cn(
      'cursor-default text-muted-foreground opacity-50',
      day.flags.booked === true && 'line-through',
    )
  }

  return day.flags.outside === true
    ? 'cursor-pointer text-muted-foreground opacity-60'
    : 'cursor-pointer text-foreground'
}

function dayTransition(ctx: ViewContext, day: Day): string {
  if (ctx.picking) {
    return 'transition-[color] duration-80'
  }

  return ctx.visual.committedEnd === day.ordinal
    ? 'transition-none'
    : 'transition-[color,background-color,font-variation-settings] duration-80'
}

function dayEvents(ctx: ViewContext, day: Day): Array<Attribute<CalendarMessage>> {
  const { h } = ctx

  return [
    h.OnClick(
      ctx.request(
        Action.cases.Picked.make({
          date: day.date,
          displayMonth: day.displayMonth,
          modifiers: day.flags,
        }),
      ),
    ),
    h.OnMouseEnter(
      ctx.request(Action.cases.MouseEntered.make({ date: day.date, modifiers: day.flags })),
    ),
    h.OnMouseLeave(
      ctx.request(Action.cases.MouseLeft.make({ date: day.date, modifiers: day.flags })),
    ),
    h.OnFocus(
      ctx.request(
        Action.cases.Focused.make({
          date: day.date,
          displayMonth: day.displayMonth,
          modifiers: day.flags,
        }),
      ),
    ),
    h.OnBlur(ctx.request(Action.cases.Blurred.make({ date: day.date, modifiers: day.flags }))),
    h.OnKeyDown((key, modifiers) =>
      ctx.request(
        Action.cases.KeyDown.make({
          date: day.date,
          modifiers: day.flags,
          key,
          shift: modifiers.shiftKey,
        }),
      ),
    ),
  ]
}

function renderGhost(
  ctx: ViewContext,
  ghostSlice: ReturnType<typeof calendarBandSlice>,
  ghostEnd: boolean,
) {
  const { h, inputs, visual } = ctx

  return ghostSlice !== null || ghostEnd
    ? inputs.animate(
        h.keyed('span')(
          String(visual.ghost?.generation ?? 0),
          [
            h.DataAttribute('slot', 'calendar-range-ghost'),
            h.AriaHidden(true),
            h.Class('pointer-events-none absolute inset-0 flex items-center justify-center'),
          ],
          [
            ...(ghostSlice === null
              ? []
              : [
                  h.span(
                    [h.Class(cn('absolute inset-y-0 bg-hover')), h.Style(bandStyle(ghostSlice))],
                    [],
                  ),
                ]),
            ...(ghostEnd
              ? [
                  h.span(
                    [
                      h.Class(
                        cn(
                          'relative bg-foreground',
                          inputs.fill
                            ? 'aspect-square h-full max-w-full'
                            : 'size-[var(--cell-size)]',
                          inputs.pill ? 'rounded-full' : inputs.shape.bg,
                        ),
                      ),
                    ],
                    [],
                  ),
                ]
              : []),
          ],
        ),
        { initial: { opacity: 1 }, animate: { opacity: 0 }, transition: spring.moderate.exit },
      )
    : null
}

interface DayAppearance {
  readonly selected: boolean
  readonly preview: boolean
  readonly middle: boolean
  readonly unavailable: boolean
  readonly hasDetail: boolean
  readonly detailId: string
}

function dayStatusAttributes(
  ctx: ViewContext,
  day: Day,
  appearance: DayAppearance,
): Array<Attribute<CalendarMessage>> {
  const { h } = ctx
  const { unavailable, selected, middle, preview, hasDetail, detailId } = appearance

  return [
    ...(unavailable ? [h.DataAttribute('calendar-inert', '')] : []),
    ...(selected ? [h.DataAttribute('selected', 'true')] : []),
    ...(middle ? [h.DataAttribute('range-middle', 'true')] : []),
    ...(day.flags.booked === true ? [h.DataAttribute('booked', 'true')] : []),
    ...(unavailable ? [h.DataAttribute('unavailable', 'true')] : []),
    ...(preview ? [h.DataAttribute('preview-end', 'true')] : []),
    ...(hasDetail ? [h.AriaDescribedBy(detailId)] : []),
  ]
}

function dayInteractionAttributes(
  ctx: ViewContext,
  day: Day,
  present: boolean,
  unavailable: boolean,
): Array<Attribute<CalendarMessage>> {
  const { h, visual, projection } = ctx

  return [
    h.DataAttribute('calendar-button', ''),
    ...(present && day.flags.outside !== true && visual.active === day.ordinal
      ? [h.DataAttribute('fluid-hover-active', '')]
      : []),
    h.Type('button'),
    h.Disabled(unavailable && day.flags.focused !== true),
    ...(unavailable && day.flags.focused === true ? [h.AriaDisabled(true)] : []),
    h.Tabindex(present && day.tabStop ? 0 : -1),
    h.AriaLabel(day.label),
    h.DataAttribute('calendar-ordinal', String(day.ordinal)),
    h.DataAttribute('calendar-display-month', String(day.displayMonth)),
    ...(day.flags.outside !== true && present
      ? [
          h.DataAttribute(
            'calendar-index',
            String(day.ordinal - (projection.months[0]?.weeks[0]?.days[0]?.ordinal ?? 0)),
          ),
        ]
      : []),
  ]
}

function dayButtonAttributes(
  ctx: ViewContext,
  day: Day,
  present: boolean,
  appearance: DayAppearance,
): Array<Attribute<CalendarMessage>> {
  const { h, inputs } = ctx
  const { selected, preview, unavailable, hasDetail } = appearance

  return [
    h.Class(
      cn(
        'relative z-[2] flex items-center justify-center p-0 outline-none select-none tabular-nums',
        hasDetail && 'flex-col gap-2',
        dayTransition(ctx, day),
        inputs.fill ? 'aspect-square h-full max-w-full' : 'size-[var(--cell-size)]',
        inputs.pill ? 'rounded-full' : inputs.shape.bg,
        typeClass('body', inputs.compact ? 'compact' : 'default'),
        dayColor(day, selected, preview, unavailable),
      ),
    ),
    ...dayInteractionAttributes(ctx, day, present, unavailable),
    ...dayStatusAttributes(ctx, day, appearance),
    h.Style({
      fontVariationSettings: day.flags.today === true ? fontWeights.semibold : fontWeights.normal,
    }),
    ...(present ? dayEvents(ctx, day) : []),
  ]
}

function dayCellAttributes(ctx: ViewContext, day: Day): Array<Attribute<CalendarMessage>> {
  const { h, inputs } = ctx

  return [
    h.Role('gridcell'),
    h.DataAttribute('calendar-date', String(day.date)),
    h.DataAttribute('calendar-outside', String(day.flags.outside === true)),
    ...(day.flags.outside === true ? [h.DataAttribute('outside', 'true')] : []),
    h.DataAttribute('day', day.isoDate),
    ...(day.flags.selected === true ? [h.AriaSelected(true)] : []),
    ...(day.flags.today === true ? [h.DataAttribute('today', 'true')] : []),
    ...(day.flags.hidden === true ? [h.DataAttribute('hidden', 'true')] : []),
    h.Class(
      cn(
        'relative flex items-center justify-center p-0',
        inputs.fill
          ? 'aspect-square max-h-[var(--cell-size)] min-w-0 flex-1'
          : 'size-[var(--cell-size)]',
      ),
    ),
  ]
}

function dayButtonContent(
  ctx: ViewContext,
  day: Day,
  detail: CalendarChild,
  appearance: DayAppearance,
): ReadonlyArray<CalendarChild> {
  const { h, inputs } = ctx
  const { hasDetail, detailId, selected, preview, unavailable } = appearance

  return [
    h.span([h.Class('[text-box:trim-both_cap_alphabetic]')], [day.text]),
    ...(hasDetail
      ? [
          h.span(
            [
              h.Class(
                cn(
                  'whitespace-nowrap [text-box:trim-both_cap_alphabetic]',
                  typeClass('caption', inputs.compact ? 'compact' : 'default'),
                  selected || preview
                    ? '[&_*]:!text-current'
                    : !unavailable && 'text-muted-foreground',
                ),
              ),
              h.Id(detailId),
              h.DataAttribute('slot', 'calendar-day-detail'),
              h.Style({ fontVariationSettings: fontWeights.normal }),
            ],
            [detail],
          ),
        ]
      : []),
    ...(day.flags.today === true && !hasDetail
      ? [
          h.span(
            [
              h.AriaHidden(true),
              h.DataAttribute('slot', 'calendar-today-dot'),
              h.Class(
                'absolute bottom-[14%] left-1/2 size-1 -translate-x-1/2 rounded-full bg-current',
              ),
            ],
            [],
          ),
        ]
      : []),
  ]
}

export function renderDay(ctx: ViewContext, month: Month, day: Day, present: boolean) {
  const { h, inputs, visual, projection } = ctx
  const { band, previewEnd } = projection.preview
  const selected = ctx.isEnd(day.ordinal)
  const preview = ctx.picking && previewEnd === day.ordinal && !selected
  const middle = band !== null && day.ordinal > band.from && day.ordinal < band.to
  const unavailable = day.flags.disabled === true
  const zone = projection.timeZone ?? ctx.calendar.month.timeZone
  const date = restoreDate({ timestamp: day.date, ordinal: day.ordinal, timeZone: zone })
  const detail =
    day.flags.hidden !== true && day.flags.outside !== true && inputs.dayDetail !== undefined
      ? inputs.dayDetail(date)
      : null
  const hasDetail = detail !== null && detail !== ''
  const detailId = `${ctx.calendar.id}-detail-${day.displayMonth}-${day.ordinal}`

  const slice = (value: typeof band) =>
    calendarBandSlice({
      day: date,
      displayMonth: restoreDate({ ...ctx.calendar.month, timestamp: month.date, timeZone: zone }),
      gridFirst: month.weeks[0]?.days[0]?.ordinal ?? day.ordinal,
      gridLast: month.weeks.at(-1)?.days.at(-1)?.ordinal ?? day.ordinal,
      hidden: day.flags.hidden === true,
      outsideHidden: projection.outsideHidden,
      band: value,
    })

  const liveSlice = slice(band)
  const ghostSlice = slice(visual.ghost)

  const ghostEnd =
    visual.ghost !== null &&
    day.flags.hidden !== true &&
    (day.ordinal === visual.ghost.from || day.ordinal === visual.ghost.to)

  const ghost = renderGhost(ctx, ghostSlice, ghostEnd)

  const appearance: DayAppearance = { selected, preview, middle, unavailable, hasDetail, detailId }
  const buttonAttributes = dayButtonAttributes(ctx, day, present, appearance)

  return ctx.render('Day', {
    context: ctx,
    key: `${day.isoDate}_${day.displayMonthId}`,
    day,
    month,
    attributes: dayCellAttributes(ctx, day),
    children: [
      ghost,
      ...(liveSlice === null
        ? []
        : [
            h.span(
              [
                h.Class(cn('pointer-events-none absolute inset-y-0 bg-hover')),
                h.DataAttribute('slot', 'calendar-range-band'),
                h.AriaHidden(true),
                h.Style(bandStyle(liveSlice)),
              ],
              [],
            ),
          ]),
      ...(day.flags.hidden === true
        ? []
        : [
            ctx.render('DayButton', {
              context: ctx,
              day,
              month,
              attributes: buttonAttributes,
              children: dayButtonContent(ctx, day, detail, appearance),
            }),
          ]),
    ],
  })
}

export function renderWeekdays(ctx: ViewContext, sticky: boolean) {
  const { h, inputs, projection } = ctx

  const cells = [
    ...(projection.showWeekNumber
      ? [
          h.span(
            [
              ...(sticky ? [] : [h.Role('columnheader'), h.AriaLabel(projection.weekNumberLabel)]),
              h.Class('w-[calc(var(--cell-size)*0.75)] shrink-0'),
            ],
            [],
          ),
        ]
      : []),
    ...projection.weekdays.map((weekday) =>
      h.span(
        [
          ...(sticky ? [] : [h.Role('columnheader'), h.AriaLabel(weekday.label)]),
          h.Class(
            cn(
              'flex h-[calc(var(--cell-size)*0.8)] items-center justify-center text-muted-foreground supports-[width:round(1px,1px)]:h-[round(down,calc(var(--cell-size)*0.8),1px)]',
              inputs.fill ? 'min-w-0 flex-1' : 'w-[var(--cell-size)]',
              typeClass('caption', inputs.compact ? 'compact' : 'default'),
            ),
          ),
        ],
        [weekday.text],
      ),
    ),
    ...(sticky ? [h.span([h.Class('sr-only')], [projection.weekNumberLabel])] : []),
  ]

  return h.div(
    [
      h.DataAttribute('calendar-inert', ''),
      h.Class(sticky ? 'sticky top-0 z-[4] flex bg-inherit' : 'flex'),
      ...(sticky
        ? [h.AriaHidden(true), h.DataAttribute('calendar-sticky-weekdays', '')]
        : [h.Role('row')]),
    ],
    cells,
  )
}
