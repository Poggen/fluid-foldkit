import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

const configurations = [
  ['Single', '1', 'Horizontal', false],
  ['Single', '1', 'Horizontal', true],
  ['Single', '1', 'Vertical', false],
  ['Single', '1', 'Vertical', true],
  ['Single', '2', 'Horizontal', false],
  ['Single', '2', 'Horizontal', true],
  ['Single', '2', 'Vertical', false],
  ['Single', '2', 'Vertical', true],
  ['Range', '1', 'Horizontal', false],
  ['Range', '1', 'Horizontal', true],
  ['Range', '1', 'Vertical', false],
  ['Range', '1', 'Vertical', true],
  ['Range', '2', 'Horizontal', false],
  ['Range', '2', 'Horizontal', true],
  ['Range', '2', 'Vertical', false],
  ['Range', '2', 'Vertical', true],
] as const

test(
  'Calendar remains usable across live configuration changes and repeated Shuffle',
  { tags: ['bugbash'] },
  async ({ app, screen, browser }) => {
    await app.open('/components/calendar')
    const preview = screen.getByRole('region', 'Playground')
    await expect(preview.getByRole('grid')).toHaveCount(2)
    await expect(screen.getByRole('button', 'Shuffle')).toBeVisible()

    const choose = async (name: string, value: string) => {
      await screen.getByRole('combobox', name).tap()
      await screen.getByRole('option', value).tap()
      await expect(screen.getByRole('combobox', name)).toContainText(value)
    }

    const inspect = async () =>
      browser.evaluate(() => {
        const heading = [...document.querySelectorAll('h2')].find(
          (node) => node.textContent?.trim() === 'Playground',
        )
        const region = heading?.closest('section,[role="region"]')
        const grids = [...(region?.querySelectorAll('[role="grid"]') ?? [])] as HTMLElement[]
        const days = [
          ...(region?.querySelectorAll('[role="gridcell"] button') ?? []),
        ] as HTMLButtonElement[]
        const calendar = region?.querySelector('[data-calendar-show-week-number]')
        const months = region?.querySelector('[data-slot="calendar-months"]')
        const allInside = grids.every((grid) => {
          const rect = grid.getBoundingClientRect()
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            Number.isFinite(rect.left) &&
            Number.isFinite(rect.top)
          )
        })
        return {
          grids: grids.length,
          days: days.length,
          showWeekNumber: calendar?.getAttribute('data-calendar-show-week-number'),
          orientation: months?.getAttribute('data-orientation'),
          multiSelectable: grids.every(
            (grid) => grid.getAttribute('aria-multiselectable') === 'true',
          ),
          allInside,
          enabledDays: days.filter((day) => !day.disabled).length,
        }
      })

    for (const [type, months, orientation, weeks] of configurations) {
      await choose('Type', type)
      await choose('Number of months', months)
      await choose('Orientation', orientation)
      if (weeks) await screen.getByRole('switch', 'Show week number').check()
      else await screen.getByRole('switch', 'Show week number').uncheck()

      const state = await inspect()
      expect(state.grids, `${type}/${months}/${orientation}/${weeks}: month grids`).toBe(
        Number(months),
      )
      expect(
        state.enabledDays,
        `${type}/${months}/${orientation}/${weeks}: selectable days`,
      ).toBeGreaterThan(0)
      expect(
        state.allInside,
        `${type}/${months}/${orientation}/${weeks}: positive grid layout`,
      ).toBe(true)
      expect(state.showWeekNumber, `${type}/${months}/${orientation}/${weeks}: week numbers`).toBe(
        String(weeks),
      )
      expect(state.orientation, `${type}/${months}/${orientation}/${weeks}: month layout`).toBe(
        months === '2' ? orientation.toLowerCase() : null,
      )
      expect(
        state.multiSelectable,
        `${type}/${months}/${orientation}/${weeks}: selection mode`,
      ).toBe(type === 'Range')
      await expect(preview.getByRole('button', 'Go to the Next Month')).toBeVisible()
    }

    for (let index = 0; index < 12; index++) {
      await screen.getByRole('button', 'Shuffle').tap()
      const state = await inspect()
      expect(state.grids, `Shuffle ${index + 1}: month grids`).toBeGreaterThanOrEqual(1)
      expect(state.grids, `Shuffle ${index + 1}: month grids`).toBeLessThanOrEqual(2)
      expect(state.enabledDays, `Shuffle ${index + 1}: selectable days`).toBeGreaterThan(0)
      expect(state.allInside, `Shuffle ${index + 1}: positive grid layout`).toBe(true)
    }
  },
)
