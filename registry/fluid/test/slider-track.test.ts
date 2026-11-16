// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Schedule } from 'effect'
import { Program, Runtime } from 'foldkit'
import { expect, vi } from 'vitest'
import {
  SliderAskExampleBlock,
  SliderAskExampleLayer,
  SliderAskMotionLayer,
  sliderAskEnvironment,
} from '../examples/src/slider-ask-example.js'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('10 millis') }))

it.live(
  'Slider preserves comfortable/compact bubble placement, fixed tooltips, and the measured track through dragging',
  () =>
    Effect.gen(function* preservesSliderPlacementAndTrack() {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

          if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
            throw new Error('Slider test requires scoped WAAPI capability removal')
          }

          return descriptor
        }),
        (descriptor) =>
          Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
      )

      const host = yield* Effect.acquireRelease(
        Effect.sync(() => {
          const container = document.createElement('div')
          container.id = 'slider-track-regression'
          const wrapper = document.createElement('div')
          wrapper.append(container)
          document.body.append(wrapper)

          return wrapper
        }),
        (container) =>
          Effect.sync(() => {
            container.remove()
          }),
      )

      yield* Effect.acquireRelease(
        Effect.sync(() =>
          Runtime.embed(
            Program.make({
              block: SliderAskExampleBlock,
              layer: SliderAskExampleLayer,
              container: host.querySelector<HTMLElement>('#slider-track-regression'),
            }).provide({
              services: sliderAskEnvironment(document, navigator.platform),
              runtime: SliderAskMotionLayer,
            }),
          ),
        ),
        (program) => Effect.promise(program.dispose),
      )
      yield* eventually(() => {
        expect(host.querySelector('#scrubber [data-slider-track]')).not.toBeNull()
      })
      const track = host.querySelector<HTMLElement>('#scrubber [data-slider-track]')
      const root = host.querySelector<HTMLElement>('#scrubber')

      if (track === null || root === null) {
        throw new Error('Missing mounted comfortable Slider')
      }

      Object.defineProperties(track, {
        offsetWidth: { configurable: true, get: () => 320 },
        clientWidth: { configurable: true, get: () => 318 },
        getBoundingClientRect: { configurable: true, value: () => new DOMRect(376, 237, 320, 32) },
        setPointerCapture: { configurable: true, value: vi.fn() },
      })
      const value = () => host.querySelector<HTMLInputElement>('#scrubber input[type=range]')?.value
      expect(value()).toBe('40')
      yield* eventually(() => {
        root.dispatchEvent(new MouseEvent('mouseenter'))
        root.dispatchEvent(
          new MouseEvent('mousemove', { clientX: 536, clientY: 253, bubbles: true }),
        )
        expect(root.children).toHaveLength(3)
      })
      const bubble = root.querySelector<HTMLElement>('.pointer-events-none.z-20')
      if (bubble === null) throw new Error('Missing comfortable Slider bubble')
      expect(getComputedStyle(bubble).top).toBe('-30px')
      expect(getComputedStyle(bubble).left).toBe('159px')
      expect(bubble?.textContent).toBe('50')
      expect(root.querySelector('[data-slider-track]')).toBe(track)
      track.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 400,
          clientY: 253,
          pointerType: 'mouse',
          button: 0,
          bubbles: true,
        }),
      )
      yield* eventually(() => {
        expect(value()).toBe('8')
      })
      track.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 410,
          clientY: 253,
          pointerType: 'mouse',
          bubbles: true,
        }),
      )
      yield* eventually(() => {
        expect(value()).toBe('11')
      })
      track.dispatchEvent(
        new PointerEvent('pointerup', {
          clientX: 410,
          clientY: 253,
          pointerType: 'mouse',
          bubbles: true,
        }),
      )
      root.dispatchEvent(new MouseEvent('mouseleave'))
      yield* eventually(() => {
        expect(root.querySelector('[data-slider-track]')).toBe(track)
        expect(root.children).toHaveLength(2)
        expect(value()).toBe('11')
      })
      yield* eventually(() => {
        expect(host.querySelector('#radix [data-slider-track]')).not.toBeNull()
      })
      const fixedSurface = host.querySelector('#base [data-slider-track]')?.parentElement
      if (fixedSurface === null || fixedSurface === undefined) {
        throw new Error('Missing fixed-tooltip Slider surface')
      }
      yield* eventually(() => {
        fixedSurface.dispatchEvent(new MouseEvent('mouseenter'))
        const tooltip = host.querySelector<HTMLElement>('#base [data-slider-tooltip="0"]')
        expect(tooltip?.textContent).toBe('0.5×')
        if (tooltip === null) throw new Error('Missing fixed Slider tooltip')
        expect(getComputedStyle(tooltip).top).toBe('-16px')
        expect(tooltip?.style.left).toBe('')
        expect(Number(tooltip?.style.opacity)).toBeGreaterThan(0.9)
      })
      fixedSurface.dispatchEvent(new MouseEvent('mouseleave'))
      const compactTrack = host.querySelector<HTMLElement>('#radix [data-slider-track]')
      const surface = compactTrack?.parentElement
      if (compactTrack === null || surface === null || surface === undefined) {
        throw new Error('Missing mounted compact Slider')
      }
      Object.defineProperties(compactTrack, {
        offsetWidth: { configurable: true, get: () => 320 },
        clientWidth: { configurable: true, get: () => 318 },
        getBoundingClientRect: { configurable: true, value: () => new DOMRect(376, 237, 320, 36) },
      })
      yield* eventually(() => {
        surface.dispatchEvent(new MouseEvent('mouseenter'))
        surface.dispatchEvent(
          new MouseEvent('mousemove', { clientX: 536, clientY: 253, bubbles: true }),
        )
        const bubble = compactTrack.querySelector<HTMLElement>('.pointer-events-none.z-20')
        expect(bubble?.textContent).toBe('50')
        if (bubble === null) throw new Error('Missing compact Slider bubble')
        expect(getComputedStyle(bubble).top).toBe('-20px')
        expect(getComputedStyle(bubble).left).toBe('160px')
      })
      surface.dispatchEvent(new MouseEvent('mouseleave'))
      yield* eventually(() => {
        expect(compactTrack.querySelector('.pointer-events-none.z-20')).toBeNull()
      })
    }),
)
