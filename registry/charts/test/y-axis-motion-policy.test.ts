// oxlint-disable no-comments/no-comments -- The genuine motion renderer acquires browser classes at module load.
// @vitest-environment happy-dom
// oxlint-enable no-comments/no-comments -- Resume the source comment policy.
import { expect, test } from 'vitest'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import { Bar, YAxis } from '@foldkit-visuals/charts/bar'
import { nativeObservations } from '../src/cartesian/native-resource'
import { initialInteraction } from '../src/cartesian/state'
import { fontTestEnvironment } from './font-test-environment'
import { bar, barProps, rows, size } from './y-axis-source-fixture'

test('the real motion renderer delivers numeric axis guides to the existing Bar snap policy', () => {
  const environment = fontTestEnvironment()
  const element = environment.container
  const props = {
    ...barProps({ numTicks: 2 }),
    children: [
      Bar({ dataKey: 'value' }),
      Bar({ dataKey: 'other', yAxisId: 7 }),
      YAxis({ numTicks: 2 }),
      YAxis({ yAxisId: 7, numTicks: 2 }),
      YAxis({ yAxisId: 7, numTicks: 2 }),
    ],
  }
  const inputs = bar.inputs('motion-guides', props)
  const resource = inputs.createResource?.(element, nativeObservations(element), () => 1000)
  if (resource === undefined || inputs.resourceDefinition === undefined) {
    throw new Error('Expected real Bar resource definition')
  }
  const state = {
    ...initialInteraction(bar.configuration(props)),
    phaseClockReady: true,
    revealReady: true,
    updateStep: 'snap',
  } satisfies Parameters<typeof inputs.resourceDefinition>[1]
  const definition = inputs.resourceDefinition(rows, state, resource.draw, () => 1000)
  const policy = definition.motion
  if (typeof policy !== 'function') throw new Error('Expected existing Bar motion policy')
  const observed: Array<{
    readonly key: string
    readonly role: string
    readonly axis: string | undefined
    readonly scaleId: string | undefined
    readonly disabled: boolean
  }> = []
  const surface = document.createElement('div')
  element.append(surface)
  const renderer = motion({ initial: false, transition: { type: 'tween', duration: 30 } })
  const watchedOptions = (next: typeof definition) => ({
    ...size,
    ariaLabel: inputs.ariaLabel,
    renderer,
    definition: {
      ...next,
      motion: (context: Parameters<typeof policy>[0]) => {
        const decision = policy(context)
        observed.push({
          key: context.key,
          role: context.role,
          axis: context.axis,
          scaleId: context.scaleId,
          disabled: decision === false,
        })
        return decision
      },
    },
  })
  const host = mountChartRenderer(surface, watchedOptions(definition))
  try {
    resource.attach(host)
    resource.update(state, rows, null)
    const repositionedProps = {
      ...props,
      children: [
        Bar({ dataKey: 'value' }),
        Bar({ dataKey: 'other', yAxisId: 7 }),
        YAxis({ numTicks: 2, orientation: 'right' }),
        YAxis({ yAxisId: 7, numTicks: 2, orientation: 'left' }),
        YAxis({ yAxisId: 7, numTicks: 2, orientation: 'left' }),
      ],
    }
    const repositioned = bar.inputs('motion-guides', repositionedProps)
    if (repositioned.resourceDefinition === undefined) throw new Error('Missing Bar definition')
    host.update(
      watchedOptions(repositioned.resourceDefinition(rows, state, resource.draw, () => 1000)),
    )
    const svg = element.querySelector('svg.ts-chart')
    const labels = [...(svg?.querySelectorAll('[data-ts-key$=":source-y-axes"] text') ?? [])]
    expect(labels).toHaveLength(9)
    const allKeys = [...(svg?.querySelectorAll('[data-ts-key]') ?? [])].map((node) =>
      node.getAttribute('data-ts-key'),
    )
    expect(new Set(allKeys).size).toBe(allKeys.length)
    for (const [index, label] of labels.entries()) {
      const delivered = observed.filter(
        (context) => context.key === label.getAttribute('data-ts-key'),
      )
      expect(
        delivered.length,
        JSON.stringify({ label: label.getAttribute('data-ts-key'), observed }),
      ).toBeGreaterThan(0)
      expect(
        delivered.every((context) => context.role === 'tick-label' && context.axis === 'y'),
      ).toBe(true)
      expect(delivered.every((context) => context.scaleId === (index < 3 ? 'y' : 'y:7'))).toBe(true)
      expect(delivered.every((context) => context.disabled)).toBe(true)
      expect(label.getAttribute('opacity')).toBe('1')
      expect(label.hasAttribute('data-ts-motion-role')).toBe(false)
    }
  } finally {
    resource.destroy()
    host.destroy()
    environment.destroy()
  }
})
