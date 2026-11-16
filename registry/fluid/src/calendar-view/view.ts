import { Match } from 'effect'
// Fluid Functionalism 200b4534, MIT, copyright 2026 Micka Touillaud.
import type { Attribute, HtmlBuilder } from 'foldkit/html'
import type { Message } from '../calendar-definition.js'
import { Action, Selection } from '../calendar-state.js'
import type { CalendarState, Projection } from '../calendar-state.js'
import { calendarSlide } from '../calendar-presentation.js'
import { cn } from '../lib/utils.js'
import { typeClass } from '../lib/type-scale.js'
import { spring } from '../lib/springs.js'
import type {
  CalendarChild,
  CalendarMessage,
  CalendarMountRequirements,
  CalendarViewInputs,
  ViewContext,
} from './contracts.js'
import { createSlotRenderer, hasCustomComponent } from './slots.js'
import { renderDay, renderWeekdays } from './days.js'
import { renderCaption, renderNav } from './captions.js'
import { renderOverlays } from './overlays.js'
import { panelKey } from './state.js'
import type { PresentationProjection, VisualState } from './state.js'

const sideMask =
  'linear-gradient(to right, transparent, #000 8px, #000 calc(100% - 8px), transparent)'

const stackedStripMask = {
  maskImage:
    'linear-gradient(to bottom, transparent calc(var(--strip-clip-top) + 16px), #000 calc(var(--strip-clip-top) + 16px + var(--cell-size) / 4), #000 calc(100% - 24px), transparent), linear-gradient(to left, #000 calc(100% - 16px), transparent), linear-gradient(to bottom, #000 calc(100% - 4px), transparent)',
  maskSize:
    '100% 100%, calc(var(--calendar-col, var(--cell-size)) * 2 + 16px) calc(var(--cell-size) + 4px), calc(var(--calendar-col, var(--cell-size)) * 2 + 16px) calc(var(--cell-size) + 4px)',
  maskPosition: '0 0, right 4px top 16px, right 4px top 16px',
  maskRepeat: 'no-repeat',
  maskComposite: 'subtract, intersect',
}

function renderWeeks(
  ctx: ViewContext,
  month: Projection['months'][number],
  index: number,
  key: string,
  present: boolean,
) {
  const { h, inputs, projection, visual } = ctx

  const hiddenElsewhere =
    !present && visual.stride !== null && projection.months.some((item) => item.date === month.date)

  const rows = month.weeks.map((week) =>
    ctx.render('Week', {
      context: ctx,
      key: String(week.number),
      month,
      week,
      attributes: [h.Role('row'), h.Class('flex')],
      children: [
        ...(projection.showWeekNumber
          ? [
              ctx.render('WeekNumber', {
                context: ctx,
                week,
                month,
                attributes: [
                  h.Role('rowheader'),
                  h.AriaLabel(week.label),
                  h.DataAttribute('calendar-inert', ''),
                  h.Class(
                    cn(
                      'flex w-[calc(var(--cell-size)*0.75)] shrink-0 items-center justify-center tabular-nums text-muted-foreground opacity-60',
                      inputs.fill ? 'max-h-[var(--cell-size)]' : 'h-[var(--cell-size)]',
                      typeClass('caption', inputs.compact ? 'compact' : 'default'),
                    ),
                  ),
                ],
                children: [week.text],
              }),
            ]
          : []),
        ...week.days.map((day) => renderDay(ctx, month, day, present)),
      ],
    }),
  )

  const sharedRows =
    ctx.twoUp && !inputs.fill
      ? Math.max(...projection.months.map((item) => item.weeks.length))
      : null

  const motion = calendarSlide({
    direction: visual.direction,
    stride: visual.stride,
    stacked: ctx.stacked,
    single: projection.months.length === 1,
    reduceMotion: visual.reduceMotion,
    present,
  })

  const panel = inputs.animate(
    h.keyed('div')(
      `${key}-weeks`,
      [
        h.Role('rowgroup'),
        h.DataAttribute('calendar-panel', key),
        h.DataAttribute('calendar-present', String(present)),
        h.DataAttribute('calendar-month', String(month.date)),
        h.DataAttribute('calendar-display-index', String(index)),
        ...(present ? [] : [h.AriaHidden(true), h.Inert(true)]),
        h.Class(
          cn(
            'col-start-1 row-start-1 flex flex-col self-start',
            !present && 'pointer-events-none',
            hiddenElsewhere && 'invisible',
          ),
        ),
      ],
      [
        ...(ctx.stacked ? [] : [renderWeekdays(ctx, false)]),
        ...(sharedRows === null
          ? rows
          : [
              h.div(
                [
                  h.Class('flex flex-col'),
                  h.Style({ minHeight: `calc(var(--cell-size) * ${sharedRows})` }),
                ],
                rows,
              ),
            ]),
      ],
    ),
    visual.generation === 0 ? { ...motion, initial: false } : motion,
  )

  return panel
}

function renderMonth(ctx: ViewContext, month: Projection['months'][number], index: number) {
  const { h, inputs, visual, projection, calendar, stacked } = ctx

  const key = panelKey(visual, month, index)
  const old = visual.retained.filter((panel) => panel.index === index)
  const caption = renderCaption(ctx, month, index, key)

  const panels = [
    ...old.map((panel) => renderWeeks(ctx, panel.month, index, panel.key, false)),
    renderWeeks(ctx, month, index, key, true),
  ]

  const weeks = inputs.animate(
    ctx.render('Weeks', {
      context: ctx,
      month,
      displayIndex: index,
      attributes: [
        h.Class(cn('relative grid', visual.heightSpring && !stacked ? '[overflow-y:clip]' : '')),
        h.DataAttribute('slot', 'calendar-weeks'),
        h.DataAttribute('calendar-weeks-slot', String(index)),
      ],
      children: panels,
    }),
    {
      initial: false,
      animate: { height: visual.heights[String(index)] ?? 'auto' },
      transition: visual.heightSpring && !visual.reduceMotion ? spring.moderate : { duration: 0 },
      onAnimationComplete: (element) => {
        element.style.removeProperty('overflow-y')
      },
    },
  )

  return ctx.render('Month', {
    context: ctx,
    key: String(index),
    month,
    displayIndex: index,
    attributes: [
      h.DataAttribute('slot', 'calendar-month'),
      h.Class(cn('flex flex-col', inputs.fill && 'min-w-0 flex-1')),
    ],
    children: [
      caption,
      ctx.render('MonthGrid', {
        context: ctx,
        month,
        displayIndex: index,
        attributes: [
          h.DataAttribute('slot', 'calendar-grid'),
          h.Role('grid'),
          h.AriaLabel(month.label),
          h.Class('flex flex-col'),
          ...(calendar.selection.mode === 'range' ? [h.AriaMultiSelectable(true)] : []),
        ],
        children: [
          // The native Weekdays slot is invoked, and its frozen Fluid default is null.
          ...(projection.hideWeekdays
            ? []
            : [
                ctx.render('Weekdays', {
                  context: ctx,
                  month,
                  attributes: [],
                  children: hasCustomComponent(inputs, 'Weekdays')
                    ? [
                        ...(projection.showWeekNumber
                          ? [
                              ctx.render('WeekNumberHeader', {
                                context: ctx,
                                month,
                                attributes: [
                                  h.Role('columnheader'),
                                  h.AriaLabel(projection.weekNumberLabel),
                                ],
                                children: [projection.weekNumberHeader],
                              }),
                            ]
                          : []),
                        ...projection.weekdays.map((weekday) =>
                          ctx.render('Weekday', {
                            context: ctx,
                            month,
                            attributes: [h.Role('columnheader'), h.AriaLabel(weekday.label)],
                            children: [weekday.text],
                          }),
                        ),
                      ]
                    : [],
                }),
              ]),
          weeks,
        ],
      }),
    ],
  })
}

function renderMonths(
  ctx: ViewContext,
  months: ReadonlyArray<CalendarChild>,
  orientation: 'horizontal' | 'vertical',
) {
  const { h, inputs, visual, projection, stacked } = ctx

  const strip = h.div(
    [
      h.Class(
        cn(
          stacked
            ? 'pointer-events-none -mx-1 -mb-6 -mt-4 flex flex-col gap-4 px-1 pb-6 pt-4 [&>[data-slot=calendar-month]]:pointer-events-auto'
            : cn('-mx-2 -mb-2 flex flex-row gap-x-6 px-2 pb-2', inputs.fill && 'min-w-0 flex-1'),
        ),
      ),
      h.DataAttribute('calendar-strip', ''),
      h.Style(
        stacked
          ? { ...stackedStripMask, '--strip-clip-top': '0px' }
          : { maskImage: sideMask, WebkitMaskImage: sideMask },
      ),
    ],
    [...renderOverlays(ctx), ...months],
  )

  return ctx.render('Months', {
    context: ctx,
    attributes: [
      h.DataAttribute('slot', 'calendar-months'),
      ...(projection.months.length > 1 ? [h.DataAttribute('orientation', orientation)] : []),
      ...(visual.active === null
        ? []
        : [
            h.DataAttribute(
              'fluid-hover-active-index',
              String(visual.active - (projection.months[0]?.weeks[0]?.days[0]?.ordinal ?? 0)),
            ),
          ]),
      h.Class(
        cn(
          'relative isolate flex',
          stacked ? 'flex-col gap-4 bg-inherit' : 'flex-row flex-wrap gap-x-6 gap-y-4',
          inputs.fill && 'w-full',
        ),
      ),
      h.Style({ '--calendar-col': 'var(--cell-size)' }),
    ],
    children: [
      ...(stacked ? [renderWeekdays(ctx, true)] : []),
      ...(stacked && !projection.hideNavigation
        ? [
            h.div(
              [
                h.DataAttribute('calendar-inert', ''),
                h.Class(
                  'absolute right-0 top-[calc(var(--cell-size)*0.8_+_16px)] z-[3] flex h-[var(--cell-size)] items-center supports-[width:round(1px,1px)]:top-[calc(round(down,var(--cell-size)*0.8,1px)_+_16px)]',
                ),
              ],
              [renderNav(ctx, ['previous', 'next'])],
            ),
          ]
        : []),
      strip,
    ],
  })
}

export function renderCalendar(
  calendar: CalendarState,
  visual: VisualState,
  projection: Projection & PresentationProjection,
  inputs: CalendarViewInputs,
  h: HtmlBuilder<typeof Message.Type, CalendarMountRequirements>,
  mountAttributes: ReadonlyArray<Attribute<CalendarMessage, CalendarMountRequirements>>,
  request: ViewContext['request'],
) {
  const configuredOrientation = calendar.presentation.orientation

  const fittedOrientation = visual.fits ? 'horizontal' : 'vertical'
  const orientation = configuredOrientation === 'auto' ? fittedOrientation : configuredOrientation

  const stacked = projection.months.length > 1 && orientation === 'vertical'
  const selection = calendar.selection.selected

  const picking =
    Selection.isAnyOf(['Range'])(selection) && selection.from !== null && selection.to === null

  const ctx: ViewContext = {
    h,
    inputs,
    calendar,
    projection,
    visual,
    stacked,
    twoUp: projection.months.length > 1 && !stacked,
    cellSize: inputs.cellSize ?? (inputs.compact ? 32 : 36),
    picking,
    selected: selection,
    request,
    goToMonth: (month) => request(Action.cases.MonthRequested.make({ month })),
    render: createSlotRenderer(h, inputs),
    isEnd: (ordinal) =>
      Selection.isAnyOf(['Single'])(selection)
        ? selection.date.ordinal === ordinal
        : Selection.isAnyOf(['Range'])(selection) &&
          (selection.from?.ordinal === ordinal || (!picking && selection.to?.ordinal === ordinal)),
  }

  const months = projection.months.map((month, index) => renderMonth(ctx, month, index))

  const monthsView = renderMonths(ctx, months, orientation)

  return h.div(
    [
      h.Id(calendar.id),
      h.DataAttribute('slot', 'calendar-root'),
      h.DataAttribute('calendar-picking', String(picking)),
      h.DataAttribute('calendar-auto-focus', String(calendar.autoFocus)),
      h.DataAttribute('calendar-keyboard-trigger', String(inputs.keyboardTrigger)),
      h.DataAttribute('calendar-cell-size', String(ctx.cellSize)),
      h.DataAttribute('calendar-fill', String(inputs.fill)),
      h.DataAttribute('calendar-auto', String(configuredOrientation === 'auto')),
      h.DataAttribute('calendar-show-week-number', String(projection.showWeekNumber)),
      h.DataAttribute('calendar-generation', String(visual.generation)),
      h.DataAttribute('calendar-ghost', String(visual.ghost !== null)),
      h.DataAttribute('calendar-ghost-generation', String(visual.ghostGeneration)),
      h.DataAttribute('calendar-committed-end', String(visual.committedEnd !== null)),
      h.DataAttribute('calendar-committed-end-generation', String(visual.committedEndGeneration)),
      h.Class(
        cn(
          'rounded-[inherit] bg-inherit',
          inputs.fill ? 'w-full' : 'w-fit',
          inputs.wrapperClassName,
        ),
      ),
      h.Style({ '--cell-size': `${ctx.cellSize}px` }),
      ...(projection.dir === null
        ? []
        : [
            h.Dir(
              Match.value(projection.dir).pipe(
                Match.when('rtl', (): 'Rtl' => 'Rtl'),
                Match.when('auto', (): 'Auto' => 'Auto'),
                Match.orElse((): 'Ltr' => 'Ltr'),
              ),
            ),
          ]),
      ...(projection.lang === null ? [] : [h.Lang(projection.lang)]),
      ...mountAttributes,
    ],
    [
      ctx.render('Root', {
        context: ctx,
        attributes: [
          h.DataAttribute('slot', 'calendar'),
          h.Class(cn('bg-inherit p-2', inputs.fill && 'w-full', inputs.className)),
          ...(inputs.attributes ?? []),
        ],
        children: [
          monthsView,
          ...(inputs.footer === undefined || inputs.footer === null || inputs.footer === ''
            ? []
            : [
                ctx.render('Footer', {
                  context: ctx,
                  attributes: [h.Role('status'), h.AriaLive('polite')],
                  children: [inputs.footer],
                }),
              ]),
        ],
      }),
    ],
  )
}
