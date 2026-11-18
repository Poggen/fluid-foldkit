// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- controlled public visibility and rendering-phase deliveries
import { describe, afterEach, beforeEach, expect, test, vi } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { text } from '@tanstack/charts'
import type { ChartRendererHostOptions } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { mountCartesianRenderer } from '../font-renderer'
import { fontAdmissionEnvironment } from '../../../test/font-admission-environment'

describe('Cartesian font admission', () => {
  let environment: ReturnType<typeof fontAdmissionEnvironment>

  beforeEach(() => {
    environment = fontAdmissionEnvironment()
  })

  afterEach(() => {
    environment.destroy()
  })

  const row = { x: 1, y: 2, label: 'Label' }

  const setup = (responsive = false) => {
    const resource = { fontMetricsChanged: () => false }
    const checked = vi.spyOn(resource, 'fontMetricsChanged')
    const rendered = vi.fn<() => void>()

    let options: ChartRendererHostOptions<typeof row, number, number> = {
      renderer: motion({ initial: false }),
      definition: {
        scales: { x: { scale: scaleLinear() }, y: { scale: scaleLinear() } },
        marks: [text([row], { x: 'x', y: 'y', text: 'label' })],
        pointer: false,
        keyboard: false,
      },
      ariaLabel: 'Admission fixture',
      width: 400,
      height: 240,
      onRender: rendered,
    }

    if (responsive) {
      const { width: _width, ...rest } = options
      options = { ...rest, initialWidth: 400 }
    }

    const host = mountCartesianRenderer(environment.container, options, () => resource)

    return { host, checked, rendered, options }
  }

  const observerAt = (index = 0) => {
    const observer = environment.observers.at(index)

    if (observer === undefined) {
      throw new Error('Expected a font admission observer')
    }

    return observer
  }

  const focus = () =>
    environment.container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

  test('same-sized resume checks synchronously without CSS reads while auto-skipped', () => {
    const { host, checked, rendered } = setup()

    try {
      const scene = host.getScene()
      const svg = environment.container.querySelector('svg')
      environment.skip('outer', true)
      environment.styles.mockClear()
      environment.measure.mockClear()
      environment.loaded()
      environment.flush()
      expect(environment.styles).not.toHaveBeenCalled()
      expect(environment.measure).not.toHaveBeenCalled()
      expect(checked).not.toHaveBeenCalled()
      expect(environment.observers).toHaveLength(1)
      expect(environment.visibility).not.toHaveBeenCalled()
      environment.skip('outer', false)
      const mutations = new MutationObserver(vi.fn<MutationCallback>())
      mutations.observe(environment.container, { attributes: true, childList: true, subtree: true })
      const frames = environment.frames.size
      observerAt().deliver(400, 240)
      expect(checked).toHaveBeenCalledTimes(1)
      expect(environment.frames.size).toBe(frames)
      expect(observerAt().disconnect).toHaveBeenCalledTimes(1)
      expect(mutations.takeRecords()).toEqual([])
      mutations.disconnect()
      expect(host.getScene()).toBe(scene)
      expect(environment.container.querySelector('svg')).toBe(svg)
      expect(rendered).toHaveBeenCalledTimes(1)
      focus()
      focus()
      observerAt().deliver(400, 240)
      expect(checked).toHaveBeenCalledTimes(1)
    } finally {
      host.destroy()
    }
  })

  test('nested skipped ancestors reuse one observer and admit the latest font and typography epoch', () => {
    const { host, checked, rendered } = setup()

    try {
      const scene = host.getScene()
      environment.skip('outer', true)
      environment.skip('inner', true)
      environment.styles.mockClear()
      environment.loaded()
      environment.flush()
      environment.setBounds({ right: 40, ascent: 15 })
      environment.container.style.fontFamily = 'Late Family'
      environment.loaded()
      environment.flush()
      environment.skip('outer', false)
      environment.setBounds({ right: 55, ascent: 18 })
      environment.loaded()
      environment.flush()
      expect(environment.observers).toHaveLength(1)
      expect(environment.styles).not.toHaveBeenCalled()
      expect(checked).not.toHaveBeenCalled()
      environment.skip('inner', false)
      observerAt().deliver(400, 240)
      expect(checked).toHaveBeenCalledTimes(1)
      expect(rendered).toHaveBeenCalledTimes(2)
      expect(host.getScene()).not.toBe(scene)
      expect(environment.context.font).toContain('Late Family')
      expect(observerAt().disconnect).toHaveBeenCalledTimes(1)
      focus()
      environment.flush()
      expect(checked).toHaveBeenCalledTimes(1)
    } finally {
      host.destroy()
    }
  })

  test.each(['frame', 'admission'])('focus checks pending fonts before bubbling (%s)', (stage) => {
    const { host, checked, rendered } = setup()

    try {
      environment.skip('outer', true)
      environment.setBounds({ ascent: 16 })
      environment.loaded()

      if (stage === 'admission') {
        environment.flush()
      }

      environment.skip('outer', false)
      const bubbling: Array<number> = []

      const observed = () => {
        bubbling.push(rendered.mock.calls.length)
      }

      environment.container.addEventListener('focusin', observed)

      try {
        focus()
      } finally {
        environment.container.removeEventListener('focusin', observed)
      }

      expect(bubbling).toEqual([2])
      expect(checked).toHaveBeenCalledTimes(1)
      environment.flush()
      focus()
      expect(rendered).toHaveBeenCalledTimes(2)
      expect(checked).toHaveBeenCalledTimes(1)

      if (stage === 'admission') {
        expect(observerAt().disconnect).toHaveBeenCalledTimes(1)
      }
    } finally {
      host.destroy()
    }
  })

  test('a native resize consumes the dirty epoch before admission and cancels only owned work', () => {
    const { host, checked, rendered } = setup(true)

    try {
      environment.skip('outer', true)
      environment.loaded()
      environment.flush()
      expect(environment.observers).toHaveLength(2)
      const admission = observerAt(1)
      environment.skip('outer', false)
      environment.setBounds({ ascent: 17 })
      observerAt(0).deliver(600, 240)
      environment.flush()
      expect(host.getScene().width).toBe(600)
      expect(rendered).toHaveBeenCalledTimes(2)
      expect(admission.disconnect).toHaveBeenCalledTimes(1)
      expect(observerAt(0).disconnect).not.toHaveBeenCalled()
      admission.deliver(400, 240)
      focus()
      expect(checked).not.toHaveBeenCalled()
      expect(rendered).toHaveBeenCalledTimes(2)
    } finally {
      host.destroy()
    }
  })

  test('a public update renders fresh typography and retires pending admission', () => {
    const { host, checked, rendered, options } = setup()

    try {
      environment.skip('outer', true)
      environment.loaded()
      environment.flush()
      environment.container.style.fontFamily = 'Updated Family'
      host.update({ ...options, ariaLabel: 'Updated' })
      expect(environment.context.font).toContain('Updated Family')
      expect(observerAt().disconnect).toHaveBeenCalledTimes(1)
      observerAt().deliver()
      focus()
      expect(checked).not.toHaveBeenCalled()
      expect(rendered).toHaveBeenCalledTimes(2)
    } finally {
      host.destroy()
    }
  })

  test('without ResizeObserver font checks stay eager', () => {
    const { host, checked } = setup()

    try {
      environment.unsupported('observer')
      environment.styles.mockClear()
      environment.loaded()
      environment.flush()
      expect(checked).toHaveBeenCalledTimes(1)
      expect(environment.styles).toHaveBeenCalled()
      expect(environment.visibility).not.toHaveBeenCalled()
      expect(environment.observers).toHaveLength(0)
    } finally {
      host.destroy()
    }
  })

  test.each(['visible', 'visibility', 'option', 'no-box'] as const)(
    'font admission avoids visibility and style probes (%s)',
    (kind) => {
      const { host, checked, rendered } = setup()

      try {
        if (kind === 'no-box') {
          environment.box(false)
        } else if (kind !== 'visible') {
          environment.unsupported(kind)
        }

        const scene = host.getScene()
        const svg = environment.container.querySelector('svg')
        environment.styles.mockClear()
        environment.measure.mockClear()
        environment.loaded()
        environment.flush()
        expect(checked).not.toHaveBeenCalled()
        expect(environment.styles).not.toHaveBeenCalled()
        expect(environment.measure).not.toHaveBeenCalled()
        expect(environment.visibility).not.toHaveBeenCalled()
        expect(environment.observers).toHaveLength(1)
        environment.box(true)
        observerAt().deliver()
        expect(checked).toHaveBeenCalledTimes(1)
        expect(rendered).toHaveBeenCalledTimes(1)
        expect(host.getScene()).toBe(scene)
        expect(environment.container.querySelector('svg')).toBe(svg)
        expect(environment.frames.size).toBe(0)
      } finally {
        host.destroy()
      }
    },
  )

  test('a visible font change renders in the admission callback without another frame', () => {
    const { host, checked, rendered } = setup()

    try {
      const scene = host.getScene()
      const svg = environment.container.querySelector('svg')
      environment.setBounds({ ascent: 19 })
      environment.loaded()
      environment.flush()
      expect(rendered).toHaveBeenCalledTimes(1)
      expect(checked).not.toHaveBeenCalled()
      observerAt().deliver()
      expect(rendered).toHaveBeenCalledTimes(2)
      expect(checked).toHaveBeenCalledTimes(1)
      expect(host.getScene()).not.toBe(scene)
      expect(environment.container.querySelector('svg')).toBe(svg)
      environment.flush()
      expect(rendered).toHaveBeenCalledTimes(2)
    } finally {
      host.destroy()
    }
  })

  test('an unexpected still-skipped observation checks once eagerly and never reobserves in a loop', () => {
    const { host, checked } = setup()

    try {
      environment.skip('outer', true)
      environment.loaded()
      environment.flush()
      observerAt().deliver()
      expect(checked).toHaveBeenCalledTimes(1)
      expect(observerAt().disconnect).toHaveBeenCalledTimes(1)
      observerAt().deliver()
      environment.flush()
      focus()
      expect(checked).toHaveBeenCalledTimes(1)
      expect(environment.observers).toHaveLength(1)
    } finally {
      host.destroy()
    }
  })

  test('custom measurement transitions retire admission and preserve the exact caller measurer', () => {
    const { host, checked, options, rendered } = setup()
    const customMeasurements = { measureText: () => ({ x: 0, y: -12, width: 40, height: 15 }) }
    const measureText = vi.spyOn(customMeasurements, 'measureText')

    try {
      environment.skip('outer', true)
      environment.loaded()
      environment.flush()
      host.update({ ...options, measureText })
      expect(measureText).toHaveBeenCalled()
      expect(observerAt().disconnect).toHaveBeenCalledTimes(1)
      const count = rendered.mock.calls.length
      observerAt().deliver()
      focus()
      environment.loaded()
      environment.flush()
      expect(checked).not.toHaveBeenCalled()
      expect(rendered).toHaveBeenCalledTimes(count)
    } finally {
      host.destroy()
    }
  })

  test.each(['frame', 'admission'])(
    'disposal removes pending font work and the focus guard (%s)',
    (stage) => {
      const { host, checked, rendered } = setup()
      environment.skip('outer', true)
      environment.loaded()

      if (stage === 'admission') {
        environment.flush()
      }

      host.destroy()
      host.destroy()
      const count = rendered.mock.calls.length

      if (stage === 'admission') {
        observerAt().deliver()
      }

      focus()
      environment.loaded()
      environment.flush()
      expect(checked).not.toHaveBeenCalled()
      expect(rendered).toHaveBeenCalledTimes(count)

      if (stage === 'admission') {
        expect(observerAt().disconnect).toHaveBeenCalledTimes(1)
      }

      expect(environment.frames.size).toBe(0)
    },
  )

  test('admission can consume a native resize before its scheduled frame without cancelling that observer', () => {
    const { host, checked, rendered } = setup(true)

    try {
      environment.skip('outer', true)
      environment.loaded()
      environment.flush()
      environment.skip('outer', false)
      environment.setBounds({ ascent: 16 })
      observerAt(0).deliver(600, 240)
      observerAt(1).deliver(400, 240)
      expect(host.getScene().width).toBe(600)
      expect(rendered).toHaveBeenCalledTimes(2)
      expect(checked).toHaveBeenCalledTimes(1)
      expect(observerAt(0).disconnect).not.toHaveBeenCalled()
      environment.flush()
      expect(rendered).toHaveBeenCalledTimes(2)
    } finally {
      host.destroy()
    }
  })

  test('an unchanged admitted epoch does not suppress a later hidden font change', () => {
    const { host, checked, rendered } = setup()

    try {
      environment.skip('outer', true)
      environment.loaded()
      environment.flush()
      environment.skip('outer', false)
      observerAt().deliver()
      expect(rendered).toHaveBeenCalledTimes(1)
      environment.skip('outer', true)
      environment.setBounds({ ascent: 20 })
      environment.loaded()
      environment.flush()
      expect(environment.observers).toHaveLength(2)
      environment.skip('outer', false)
      observerAt(1).deliver()
      expect(checked).toHaveBeenCalledTimes(2)
      expect(rendered).toHaveBeenCalledTimes(2)
    } finally {
      host.destroy()
    }
  })

  test('a stale callback cannot retire admission for a newer font epoch', () => {
    const { host, checked, rendered } = setup()

    try {
      environment.loaded()
      environment.flush()
      const oldAdmission = observerAt()
      oldAdmission.deliver()
      expect(checked).toHaveBeenCalledTimes(1)
      environment.setBounds({ ascent: 21 })
      environment.loaded()
      environment.flush()
      const latestAdmission = observerAt(1)
      oldAdmission.deliver()
      expect(checked).toHaveBeenCalledTimes(1)
      expect(latestAdmission.disconnect).not.toHaveBeenCalled()
      latestAdmission.deliver()
      expect(checked).toHaveBeenCalledTimes(2)
      expect(rendered).toHaveBeenCalledTimes(2)
      expect(latestAdmission.disconnect).toHaveBeenCalledTimes(1)
    } finally {
      host.destroy()
    }
  })
})
