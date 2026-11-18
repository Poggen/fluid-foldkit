import { expect, it } from 'vitest'
import { pulseClipGeometry } from '../pulse-clip-motion'

it('clips the pulse through the authored ten-pixel overscan on both sides', () => {
  expect(pulseClipGeometry(560, 0)).toEqual({ x: -10, width: 0 })
  expect(pulseClipGeometry(560, 0.25)).toEqual({ x: -10, width: 290 })
  expect(pulseClipGeometry(560, 0.5)).toEqual({ x: -10, width: 580 })
  expect(pulseClipGeometry(560, 0.75)).toEqual({ x: 280, width: 290 })
  expect(pulseClipGeometry(560, 1)).toEqual({ x: 570, width: 0 })
})
