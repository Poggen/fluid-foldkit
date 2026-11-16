import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { constUndefined } from 'effect/Function'
import { RadarChart, RadarArea } from './index'
import type { RadarChartProps } from './options'

it.effect('publishes accepted responsive geometry for both absent and zero size', () => {
  const radar = RadarChart({ name: 'radar-responsive-context' })
  const props: RadarChartProps = {
    data: [{ label: 'North', values: { speed: 80, safety: 60, range: 70 } }],
    metrics: [
      { key: 'speed', label: 'Speed' },
      { key: 'safety', label: 'Safety' },
      { key: 'range', label: 'Range' },
    ],
    children: [RadarArea({ index: 0 })],
  }
  const Key = Symbol('RadarResponsive')
  const Declared = Block.make(radar.namespace, { ...radar.contract, key: Key })
  return Story.story(
    { block: Declared, layer: Declared.makeLayer(radar.plans<typeof Key>(Declared)) },
    Story.init('responsive-context', props.data, radar.configuration(props)),
    Story.message(Declared.Message.ObservedSize({ size: 320 })),
    Story.model((measured) => {
      for (const inputs of [props, { ...props, size: 0 }]) {
        const context = radar.context(measured, inputs, constUndefined)
        expect(context.size).toBe(320)
        expect(context.radius).toBe(100)
        expect(context.getPointPosition(0, 80).y).toBe(-80)
      }
      expect(radar.context(measured, { ...props, size: 280 }, constUndefined).size).toBe(280)
    }),
  )
})
