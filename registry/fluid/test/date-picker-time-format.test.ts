import { describe, expect, it } from 'vitest'
import { buildSlots, makeTimeFormatter } from '../src/date-picker-format.js'

describe('DatePicker time slot labels', () => {
  it('keeps midnight, noon and end-of-day labels in the requested clock', () => {
    const twelve = makeTimeFormatter(12, 'en-US')
    const twentyFour = makeTimeFormatter(24, 'sv-SE')

    expect([0, 60, 720, 1439].map(twelve)).toEqual(['12:00 AM', '1:00 AM', '12:00 PM', '11:59 PM'])
    expect([0, 60, 720, 1439].map(twentyFour)).toEqual(['00:00', '01:00', '12:00', '23:59'])
  })

  it('keeps separate configurations independent across a full slot list', () => {
    const twelve = makeTimeFormatter(12, 'en-US')
    const twentyFour = makeTimeFormatter(24, 'en-US')
    const slots = buildSlots(30)

    const twelveLabels = slots.map((slot) => twelve(slot.minutes))
    const twentyFourLabels = slots.map((slot) => twentyFour(slot.minutes))

    expect(twelveLabels).toHaveLength(48)
    expect(twelveLabels[0]).toBe('12:00 AM')
    expect(twentyFourLabels[0]).toBe('00:00')
    expect(twelveLabels[47]).toBe('11:30 PM')
    expect(twentyFourLabels[47]).toBe('23:30')
  })
})
