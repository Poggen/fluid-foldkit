import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { DateTime, Effect, Layer, Schema, Struct } from 'effect'
import { Block } from 'foldkit'
import { Server } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'
import { CalendarBlock, layer as CalendarLayer } from '../src/calendar.js'
import { makeCalendarEnvironment, prepareCalendar } from '../src/calendar-environment.js'
import type { CalendarEnvironment } from '../src/calendar-environment.js'
import { createTargetMotionScope } from '../src/motion-target.js'
import { createPresentationContext, resolvePresentation } from '../src/presentation.js'
import { fontWeights } from '../src/lib/font-weight.js'

const CalendarStyleKey = Symbol('CalendarStyle')

const effects = Block.makeEffectsContract<never, CalendarEnvironment>()

const CalendarStyleBlock = Block.make('CalendarStyle', {
  key: CalendarStyleKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ calendar: CalendarBlock.Model }),
  Message: defineMessageUnion({ Noop: {} }),
  view: { kind: 'Document' },
  effects,
})

for (const selected of [false, true]) {
  it.effect(`Visible day details and Today styles survive selected=${String(selected)}`, () =>
    Effect.gen(function* rendersCalendarStyles() {
      const today = DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-09T00:00:00Z'))
      const hidden = DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-10T00:00:00Z'))
      const disabled = DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-11T00:00:00Z'))
      const environment = makeCalendarEnvironment(() => ({
        today,
        timeZone: 'UTC',
        hidden,
        disabled,
        showOutsideDays: true,
      }))
      const config = { id: 'calendar-style', month: today }

      const prepared = yield* prepareCalendar(
        selected ? { ...config, selected: today } : config,
      ).pipe(Effect.provide(environment))

      const Calendar = CalendarStyleBlock.makeRequiredFieldBinding(CalendarBlock, {
        field: 'calendar',
        init: { contextToArgs: () => [prepared] },
      }).withOutMessagePolicy({
        fold: CalendarStyleBlock.makeOutMessageFold(CalendarBlock, {
          Transitioned: CalendarStyleBlock.makeNoopStep,
        }),
      })

      const CalendarStyleComposition = CalendarStyleBlock.makeComposition({ bindings: [Calendar] })
      const motion = createTargetMotionScope('calendar-style')
      const context = createPresentationContext()
      const presentation = resolvePresentation({ context })

      const layer = CalendarStyleBlock.makeLayer({
        init: CalendarStyleComposition.makeInit(() => ({ model: {} })),
        update: CalendarStyleComposition.makeUpdate({ Noop: CalendarStyleBlock.makeNoopStep() }),
        view: CalendarStyleComposition.makeView((model, h) => ({
          title: 'Calendar styles',
          body: h.block(
            Calendar.embedView({
              slotId: 'calendar-style',
              model: model.calendar,
              viewInputs: {
                presentationContext: context,
                keyboardTrigger: false,
                compact: false,
                fill: false,
                pill: false,
                ...Struct.pick(presentation, ['shape']),
                animate: motion.node,
                tooltip: ({ render }) =>
                  render({ button: (attributes, children) => h.button(attributes, children) }),
                chevron: (attributes) => h.span(attributes, []),
                dayDetail: (date) => {
                  if (date.getMonth() !== 10 || date.getDate() === 10) {
                    throw new Error('dayDetail received a hidden or outside date')
                  }
                  return `Price for November ${String(date.getDate())}`
                },
                styles: {
                  DayButton: { color: 'red', fontVariationSettings: '"wght" 900' },
                  Months: { color: 'blue' },
                },
              },
            }),
          ),
        })),
      }).pipe(Layer.provide(CalendarLayer))

      const result = yield* Server.renderToString(
        { block: CalendarStyleBlock, layer },
        {},
        { isHydratable: false },
      ).pipe(Effect.provide(Layer.merge(environment, motion.layer)))

      const todayCell = /<[^>]*data-day="2026-11-09"[^>]*>(?<content>[\s\S]*?)<\/button>/u.exec(
        result.html,
      )?.groups?.content

      expect(todayCell).toBeDefined()
      expect(todayCell).toContain(
        `font-variation-settings: ${fontWeights.semibold.replaceAll('"', '&quot;')}`,
      )
      expect(todayCell).toContain('color: red')
      expect(todayCell?.includes('data-selected="true"')).toBe(selected)
      for (const day of ['09', '11']) {
        const cell = new RegExp(
          `<div[^>]*data-day="2026-11-${day}"[^>]*>(?<content>[\\s\\S]*?)</div>`,
          'u',
        ).exec(result.html)?.groups?.content

        expect(cell).toBeDefined()
        expect(cell).toContain(`Price for November ${String(Number(day))}`)
        const description = /aria-describedby="(?<id>[^"]+)"/u.exec(cell ?? '')?.groups?.id
        expect(description).toBeDefined()
        expect(cell).toContain(`id="${description}"`)
        expect(cell).toContain('data-slot="calendar-day-detail"')
        if (day === '11') {
          expect(cell).toContain('disabled')
          expect(cell).toContain('data-unavailable="true"')
        }
      }

      const hiddenCell = /<div[^>]*data-day="2026-11-10"[^>]*>[\s\S]*?<\/div>/u.exec(
        result.html,
      )?.[0]
      expect(hiddenCell).toBeDefined()
      expect(hiddenCell).toContain('data-hidden="true"')
      expect(hiddenCell).not.toContain('<button')
      expect(hiddenCell).not.toContain('calendar-day-detail')
      expect(hiddenCell).not.toContain('aria-describedby')
      expect(result.html).toContain('data-outside="true"')
      expect(result.html).toMatch(/data-slot="calendar-months"[^>]*style="[^"]*color: blue/u)
      expect(result.html).toMatch(
        /data-slot="calendar-months"[^>]*style="[^"]*--calendar-col: var\(--cell-size\)/u,
      )
    }),
  )
}
