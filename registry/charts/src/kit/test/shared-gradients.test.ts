import { describe, expect, it } from 'vitest'
import {
  GradientPinkBlue,
  GradientPinkRed,
  LinearGradient,
  RadialGradient,
  userGradients,
} from '../gradients'
import type { GradientLayer } from '../gradients'

describe('shared gradient declaration roles', () => {
  it('retains first-role and within-role order, including duplicate resource ids', () => {
    const a = LinearGradient({ id: 'same', from: 'red' })
    const b = RadialGradient({ id: 'radial', from: 'green' })
    const c = LinearGradient({ id: 'same', from: 'blue' })
    expect(userGradients([a, b, c])).toEqual([a.props, c.props, b.props])
    expect(userGradients([a, b, c])[1]).toBe(c.props)
  })

  it('keeps each preset role distinct from other presets and explicit linear declarations', () => {
    const a = GradientPinkBlue({ id: 'a' })
    const b = LinearGradient({ id: 'b' })
    const c = GradientPinkRed({ id: 'c' })
    const d = GradientPinkBlue({ id: 'd' })
    expect(userGradients([a, b, c, d])).toEqual([a.props, d.props, b.props, c.props])
  })

  it('groups manual native resources without guessing a Source role from their converted geometry', () => {
    const linear = LinearGradient({ id: 'linear' })
    const a: GradientLayer = { kind: 'gradient', props: linear.props }
    const radial = RadialGradient({ id: 'radial' })

    const b: GradientLayer = {
      kind: 'gradient',
      carrierRole: 'customGradient',
      props: radial.props,
    }

    expect(userGradients([a, linear, b])).toEqual([a.props, b.props, linear.props])
  })
})
