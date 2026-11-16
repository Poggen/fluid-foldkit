import { it as effectIt } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { Schema } from 'effect'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { expect } from 'vitest'
import { Bar, BarChart, ChartConfigProvider, ChartTooltip } from '../src/index'
import type { BarSnapshot } from '../src/bar/definition'
import type { BarDatum } from '../src/bar/model'

const Row = Schema.Struct({ name: Schema.String, value: Schema.Finite })

const rows = [Row.make({ name: 'A', value: 10 }), Row.make({ name: 'B', value: 20 })]

const root = BarChart({ name: 'hover-spring-contract', Row })

export const HoverSpringKey = Symbol('HoverSpring')

const Chart = Block.make(root.namespace, { key: HoverSpringKey, ...root.contract })

const subject = { block: Chart, layer: Chart.makeLayer(root.plans(Chart)) }

effectIt.effect(
  'the compiled Bar hover owner receives the lexical spring and honors its instance override',
  () =>
    Story.withBlock(subject, (chart) => {
      const environment = ChartConfigProvider({
        value: { tooltipSpring: { stiffness: 40, damping: 12 } },
        children: (value) => value,
      })

      const runtime = createChartRuntime<
        BarDatum<typeof Row.Type>,
        string | number,
        string | number
      >()

      try {
        for (const springConfig of [undefined, { stiffness: 70, damping: 15 }]) {
          const props = {
            environment,
            animationDuration: 0,
            children: [
              Bar({ dataKey: 'value' }),
              ChartTooltip(
                springConfig === undefined
                  ? { matchCrosshair: true }
                  : { matchCrosshair: true, springConfig },
              ),
            ],
          }

          const state = chart.init('hover-spring-contract', rows, root.configuration(props)).model

          let snapshot: BarSnapshot<typeof Row.Type> | undefined

          const definition = root.inputs('hover-spring-contract', props).resourceDefinition?.(
            rows,
            state,
            (value) => {
              snapshot = value
            },
            () => 0,
          )

          if (!definition) {
            throw new Error('The Bar must expose its real drawing definition')
          }

          runtime.render(definition, { width: 640, height: 320 })
          expect(snapshot?.overlay?.springConfig).toEqual(
            springConfig ?? { stiffness: 40, damping: 12 },
          )
        }
      } finally {
        runtime.destroy()
      }
    }),
)
