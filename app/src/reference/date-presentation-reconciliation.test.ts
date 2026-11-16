import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { AuthoredDatesBlock, layer as datesLayer } from './authored-dates'
import {
  CalendarAuthoredBlock,
  layer as calendarLayer,
} from '../../../registry/fluid/examples/src/calendar-authored-block'
import { componentPresentation, defaults } from '../settings'

it.effect('changes picker hover mode without refreshing calendars or restarting date state', () =>
  Story.story(
    { block: AuthoredDatesBlock, layer: datesLayer },
    Story.init(),
    Story.models(
      Story.steps(
        Story.inMessage(
          AuthoredDatesBlock.InMessage.InformedOfPresentation({
            presentation: { ...componentPresentation(defaults), hover: 'standard' },
          }),
        ),
      ),
      (before, after) => {
        for (const [key, picker] of Object.entries(after.pickers)) {
          expect(picker.presentation.hoverMode).toBe('standard')
          expect(picker.calendar.pending).toEqual(before.pickers[key]?.calendar.pending)
          expect(picker.calendar.working).toEqual(before.pickers[key]?.calendar.working)
          expect(picker.calendar.generation).toEqual(before.pickers[key]?.calendar.generation)
          expect(picker.picker).toBe(before.pickers[key]?.picker)
        }
      },
    ),
    Story.Command.expectNone(),
  ),
)

it.effect('calendar options retain the current global hover mode after in-app changes', () =>
  Story.withBlock({ block: CalendarAuthoredBlock, layer: calendarLayer }, (calendar) => {
    const initial = calendar.init().model
    const informed = calendar.inMessageUpdate(
      initial,
      CalendarAuthoredBlock.InMessage.InformedOfDocumentation({
        embedded: true,
        shape: 'sharp',
        size: 'default',
        hoverMode: 'standard',
      }),
    ).model
    const configured = calendar.update(
      informed,
      CalendarAuthoredBlock.Message.Configured({
        settings: { ...informed.settings, months: 2 },
      }),
    ).model
    const synchronization = configured.calendars.playground?.pending.find(
      (action) => action._tag === 'Synchronized',
    )
    expect(synchronization?._tag).toBe('Synchronized')
    if (synchronization?._tag === 'Synchronized') {
      expect(synchronization.presentation.hoverMode).toBe('standard')
      expect(synchronization.presentation.numberOfMonths).toBe(2)
    }
  }),
)
