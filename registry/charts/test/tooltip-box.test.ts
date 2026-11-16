import { expect, test } from 'vitest'
import {
  TooltipBoxBlock,
  TooltipBoxLayer,
  TooltipBoxConfiguration,
} from '../src/cartesian/tooltip-box-index'
import { Story } from 'foldkit'
import { it } from '@effect/vitest'
import { tooltipBoxTarget } from '../src/cartesian/tooltip-box-geometry'
import { tooltipBoxMotion } from '../src/cartesian/tooltip-motion'

const configuration = TooltipBoxConfiguration.make({
  containerId: 'chart',
  x: 80,
  y: 120,
  containerWidth: 640,
  containerHeight: 320,
  visible: false,
})

it.effect('public tooltip visibility and retargeting are typed requests on its own model', () =>
  Story.story(
    { block: TooltipBoxBlock, layer: TooltipBoxLayer },
    Story.init('tooltip', configuration),
    Story.models(
      Story.steps(
        Story.inMessage(
          TooltipBoxBlock.InMessage.RequestedConfigure({
            configuration: { ...configuration, x: 580, y: 250, visible: true },
          }),
        ),
        Story.model((model: typeof TooltipBoxBlock.Model.Type) => {
          expect(model.configuration.visible).toBe(true)
          expect(model.configuration.x).toBe(580)
        }),
        Story.inMessage(TooltipBoxBlock.InMessage.RequestedConfigure({ configuration })),
      ),
      (initial, hidden) => {
        expect(hidden.configuration.visible).toBe(false)
        expect(initial.configuration.visible).toBe(false)
      },
    ),
  ),
)

test('measured panels flip at the right edge and stay inside the vertical bounds', () => {
  expect(
    tooltipBoxTarget({ ...configuration, x: 580, y: 310 }, { width: 160, height: 100 }),
  ).toEqual({ left: 404, top: 204, flipped: true })
  expect(tooltipBoxTarget({ ...configuration, x: 80, y: 20 }, { width: 160, height: 100 })).toEqual(
    { left: 96, top: 16, flipped: false },
  )
})

test('horizontal bars use centered placement while vertical callers can override only top', () => {
  const horizontal = tooltipBoxTarget(
    { ...configuration, x: 235, y: 60 },
    { width: 140, height: 100 },
  )

  expect(horizontal).toEqual({ left: 251, top: 16, flipped: false })
  expect(
    tooltipBoxTarget({ ...configuration, x: 235, y: 60, top: 40 }, { width: 140, height: 100 }),
  ).toEqual(horizontal)
})

test('matching the crosshair inherits its spring without changing the independent box default', () => {
  const inherited = { stiffness: 40, damping: 12 }
  expect(tooltipBoxMotion({ matchCrosshair: true }, inherited)).toMatchObject(inherited)
  expect(tooltipBoxMotion({}, inherited)).toMatchObject({ stiffness: 100, damping: 20 })
  expect(
    tooltipBoxMotion(
      { matchCrosshair: true, springConfig: { stiffness: 70, damping: 15 } },
      inherited,
    ),
  ).toMatchObject({ stiffness: 70, damping: 15 })
  expect(
    tooltipBoxMotion(
      {
        matchCrosshair: true,
        springConfig: { stiffness: 70, damping: 15 },
        boxSpringConfig: { stiffness: 90, damping: 18 },
      },
      inherited,
    ),
  ).toMatchObject({ stiffness: 90, damping: 18 })
})
