import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { TestClock } from 'effect/testing'
import { expect } from 'vitest'
import { prepareApplicationFlagsFor } from './application-flags'

it.effect(
  'production preparation separates first-page date options from neutral return defaults',
  () =>
    Effect.gen(function* () {
      const now = Date.UTC(2026, 10, 14, 12)
      yield* TestClock.setTime(now)
      const home = yield* prepareApplicationFlagsFor('https://example.test/')
      expect(home.baseline.calendar.initial.selection).toMatchObject({
        mode: 'range',
        selected: { _tag: 'Empty' },
      })
      expect(home.baseline.calendar.initial.presentation.numberOfMonths).toBe(2)
      expect(home.baseline.picker.initial).toMatchObject({
        mode: 'single',
        value: { _tag: 'Single', date: { ordinal: Math.floor(now / 86400000) } },
      })
      expect(home.baseline.picker.presentation).toMatchObject({
        disabled: false,
        variant: 'outline',
        numberOfMonths: 1,
        placeholder: 'Choose a date',
      })

      const datePicker = yield* prepareApplicationFlagsFor(
        'https://example.test/components/date-picker',
      )
      expect(datePicker.page.calendar.initial.selection.mode).toBe('single')
      expect(datePicker.page.picker.initial.value._tag).toBe('Empty')
      expect(datePicker.baseline).toEqual(home.baseline)

      const props = encodeURIComponent(
        JSON.stringify({
          type: 'range',
          disabled: true,
          variant: 'ghost',
          numberOfMonths: 2,
          placeholder: 'Route-specific prompt',
        }),
      )
      const embedded = yield* prepareApplicationFlagsFor(
        `https://example.test/components/date-picker?embed=1&props=${props}`,
      )
      expect(embedded.page.picker.initial.mode).toBe('range')
      expect(embedded.page.picker.presentation).toMatchObject({
        disabled: true,
        variant: 'ghost',
        numberOfMonths: 2,
        placeholder: 'Route-specific prompt',
      })
      expect(embedded.baseline).toEqual(home.baseline)

      for (const pathname of [
        '/components/calendar',
        '/components/input',
        '/charts/bar',
        '/ramka/lightbox',
      ]) {
        const prepared = yield* prepareApplicationFlagsFor(`https://example.test${pathname}`)
        expect(prepared.baseline).toEqual(home.baseline)
      }
    }),
)
