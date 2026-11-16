import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'DatePicker booked days are labeled and unavailable',
  { tags: ['bugbash'] },
  async ({ app, screen, browser }) => {
    await app.open('/components/date-picker')
    await screen
      .getByRole('region', 'Booked days')
      .getByRole('button', 'Check in → check out')
      .tap()

    await expect
      .poll(() =>
        browser.evaluate(() => {
          const booked = [
            ...document.querySelectorAll(
              '#docs-picker-booking-calendar button[data-booked="true"]',
            ),
          ]
          return booked.filter(
            (button) =>
              (button as HTMLButtonElement).disabled ||
              button.getAttribute('aria-disabled') === 'true',
          ).length
        }),
      )
      .toBe(5)
  },
)

test(
  'DatePicker past days are unavailable in booking range',
  { tags: ['bugbash'] },
  async ({ app, screen, browser }) => {
    await app.open('/components/date-picker')
    await screen
      .getByRole('region', 'Booked days')
      .getByRole('button', 'Check in → check out')
      .tap()

    await expect
      .poll(() =>
        browser.evaluate(() => {
          const buttons = [
            ...document.querySelectorAll('#docs-picker-booking-calendar button[aria-label]'),
          ]
          const todayLabel = buttons
            .map((button) => button.getAttribute('aria-label'))
            .find((label) => label?.startsWith('Today, '))
          const match = todayLabel?.match(/^Today, [^,]+, (\w+) (\d+)(?:st|nd|rd|th), (\d{4})$/)
          if (match === undefined || match === null) return false
          const day = Number(match[2])
          if (day < 2) return true
          const previous = day - 1
          const ordinal =
            previous % 100 >= 11 && previous % 100 <= 13
              ? 'th'
              : previous % 10 === 1
                ? 'st'
                : previous % 10 === 2
                  ? 'nd'
                  : previous % 10 === 3
                    ? 'rd'
                    : 'th'
          const expected = `${match[1]} ${previous}${ordinal}, ${match[3]}`
          const previousButton = buttons.find((button) =>
            button.getAttribute('aria-label')?.includes(expected),
          )
          return (
            previousButton instanceof HTMLButtonElement &&
            (previousButton.disabled || previousButton.getAttribute('aria-disabled') === 'true')
          )
        }),
      )
      .toBe(true)
  },
)
