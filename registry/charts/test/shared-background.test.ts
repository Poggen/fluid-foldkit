import { DateTime } from 'effect'
import type { SceneNode } from '@tanstack/charts'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { describe, expect, it } from 'vitest'
import { buildTimeSeriesDefinition } from '../src/cartesian/definition'
import { Background, Line } from '../src/cartesian/layers'
import { activeBackground, backgroundCss, backgroundResources } from '../src/cartesian/background'
import { renderPatternPreset } from '../src/kit/pattern/presets'

const descendants: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((node) => [node, ...(node.kind === 'group' ? descendants(node.children) : [])])

const data = [1, 2].map((value, index) => ({
  date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
  value,
}))

describe('plot background carrier', () => {
  it('retains preset fill, outline, scale, complement, background and cross-line options', () => {
    const filled = renderPatternPreset('dots', 'filled', { fill: 'pink', color: 'blue' })

    const outline = renderPatternPreset('dots', 'outline', {
      fill: 'pink',
      color: 'blue',
      dotFill: false,
    })

    const rings = renderPatternPreset('circles', 'rings', {
      color: 'blue',
      scale: 2,
      complement: true,
      tileBackground: 'white',
    })

    const filledCircle = filled?.props.shapes.find((primitive) => primitive.kind === 'circle')
    const outlineCircle = outline?.props.shapes.find((primitive) => primitive.kind === 'circle')
    const ring = rings?.props.shapes.find((primitive) => primitive.kind === 'circle')
    expect(filledCircle).toMatchObject({
      radius: 1.5,
      fill: 'pink',
      stroke: undefined,
      strokeWidth: 1,
    })
    expect(outlineCircle).toMatchObject({ fill: undefined, stroke: 'blue', strokeWidth: 1 })
    expect(rings?.props.width).toBe(12)
    expect(rings?.props.height).toBe(12)
    expect(rings?.props.shapes[0]).toMatchObject({ kind: 'rect', fill: 'white' })
    expect(rings?.props.shapes.filter((primitive) => primitive.kind === 'circle')).toHaveLength(5)
    expect(ring).toMatchObject({ radius: 4, fill: undefined, stroke: 'blue', strokeWidth: 2 })
    expect(
      renderPatternPreset('cross', 'cross')?.props.shapes.filter(
        (primitive) => primitive.kind === 'path',
      ),
    ).toHaveLength(2)
    expect(renderPatternPreset('none', 'none')).toBeUndefined()
  })

  it('draws the preset under series at the plot origin', () => {
    const runtime = createChartRuntime<(typeof data)[number], Date, number>()

    try {
      const scene = runtime.render(
        buildTimeSeriesDefinition(data, {
          id: 'background-owner',
          x: (row) => row.date,
          children: [Background({ pattern: 'dots', opacity: 0.3 }), Line({ dataKey: 'value' })],
        }),
        { width: 320, height: 180 },
      )

      const nodes = descendants(scene.nodes)
      const background = nodes.find((node) => node.key === 'background:fill')
      expect(background?.kind).toBe('group')

      if (background?.kind !== 'group') {
        throw new Error('Expected background plot group')
      }

      expect(nodes.indexOf(background)).toBeLessThan(
        nodes.findIndex((node) => node.kind === 'polyline'),
      )
      expect(background.translateX).toBe(40)
      expect(background.translateY).toBe(40)
      expect(background.children).toEqual([
        {
          kind: 'rect',
          key: 'background:rect',
          x: 0,
          y: 0,
          width: 240,
          height: 100,
          style: { fill: 'url(#background-owner-chart-background)', opacity: 0.3 },
        },
      ])
    } finally {
      runtime.destroy()
    }
  })

  it('preserves first-carrier choice, disabled fill and bounded independent fade edges', () => {
    const first = Background({ pattern: 'none' })
    const second = Background({ pattern: 'dots' })
    expect(activeBackground([first, second])).toBeUndefined()
    expect(backgroundResources([first, second])).toEqual([])
    expect(backgroundResources([Background({ showFill: false })])).toEqual([])
    const painted = [Background({ pattern: 'dots', fadeHorizontalLength: 60, fadeVertical: false })]
    expect(backgroundResources(painted)[0]?.id).toBe('chart-background')
    expect(backgroundCss('owner', painted)).toBe('owner .bkm-bg{--bkm-bg-h:45%;--bkm-bg-v:0%}')
  })
})
