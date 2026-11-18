/* @license Derived from pinned Radix Popper and Base UI useAnchorPositioning. MIT; see dropdown-primitives.txt. */
import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  limitShift,
  offset,
  shift,
  size,
  detectOverflow,
} from '@floating-ui/dom'
import type {
  ComputePositionReturn,
  Middleware,
  MiddlewareState,
  Placement,
} from '@floating-ui/dom'
import { Effect, Exit, Queue, Schema, Stream } from 'effect'
import { flow } from 'effect/Function'
import { DropdownIndex } from './dropdown-state.js'
const configuration: (element: HTMLElement) => DropdownPositionConfig = function configuration(
  element: HTMLElement,
) {
  return Schema.decodeUnknownSync(Config)({
    side: element.dataset.requestedSide,
    align: element.dataset.requestedAlign,
    sideOffset: element.dataset.sideOffset,
    alignOffset: element.dataset.alignOffset,
    direction: element.dataset.direction,
    sub: element.dataset.sub === 'true',
  })
}

export const dropdownPositionMiddleware: (
  config: DropdownPositionConfig,
  element: HTMLElement,
  active: () => boolean,
) => ReadonlyArray<Middleware> = function dropdownPositionMiddleware(
  config: DropdownPositionConfig,
  element: HTMLElement,
  active: () => boolean,
) {
  const sizeOptions: Parameters<typeof size>[0] = {
    padding: 5,
    apply: ({ rects, availableWidth, availableHeight }) => {
      if (!active()) {
        return
      }
      const dpr = sourceNumberOr(element.ownerDocument.defaultView?.devicePixelRatio, 1)
      const anchor = rects.reference
      const width = (Math.round((anchor.x + anchor.width) * dpr) - Math.round(anchor.x * dpr)) / dpr
      const height =
        (Math.round((anchor.y + anchor.height) * dpr) - Math.round(anchor.y * dpr)) / dpr
      element.style.setProperty('--available-width', `${availableWidth}px`)
      element.style.setProperty('--available-height', `${availableHeight}px`)
      element.style.setProperty('--anchor-width', `${width}px`)
      element.style.setProperty('--anchor-height', `${height}px`)
    },
  }
  const sizeMiddleware = size(sizeOptions)
  const baseFlip = flip({
    padding: {
      top: 6 + (config.side === 'bottom' ? 1 : 0),
      right: 6 + (config.side === 'left' ? 1 : 0),
      bottom: 6 + (config.side === 'top' ? 1 : 0),
      left: 6 + (config.side === 'right' ? 1 : 0),
    },
    mainAxis: true,
    crossAxis: 'alignment',
    fallbackAxisSideDirection: config.sub ? 'end' : 'none',
  })
  const baseShift = shift({ padding: 5, mainAxis: true, crossAxis: false, limiter: limitShift() })
  const fakeArrow = element.ownerDocument.createElement('div')
  return [
    offset({
      mainAxis: config.sideOffset,
      crossAxis: config.alignOffset,
      alignmentAxis: config.alignOffset,
    }),
    ...(config.align === 'center' ? [baseShift, baseFlip] : [baseFlip, baseShift]),
    sizeMiddleware,
    arrow({ element: fakeArrow, padding: 0 }),
    {
      name: 'hide',
      fn: flow(
        Effect.fn('DropdownPosition.referenceHidden')(function* (state: MiddlewareState) {
          const overflow = yield* Effect.promise(
            detectOverflow.bind(undefined, state, { elementContext: 'reference' }),
          )
          const { width, height, x, y } = state.rects.reference
          return {
            data: {
              referenceHidden:
                (width === 0 && height === 0 && x === 0 && y === 0) ||
                overflow.top - height >= 0 ||
                overflow.right - width >= 0 ||
                overflow.bottom - height >= 0 ||
                overflow.left - width >= 0,
            },
          }
        }),
        Effect.runPromise,
      ),
    },
    {
      name: 'transformOrigin',
      fn: ({ placement, middlewareData, platform }) => {
        if (!active()) {
          return {}
        }
        const { side, align } = part(placement)
        const vertical = side === 'top' || side === 'bottom'
        const unshifted =
          Math.abs(
            vertical
              ? sourceNumberOr(middlewareData.shift?.x, 0)
              : sourceNumberOr(middlewareData.shift?.y, 0),
          ) <= 1
        let cross = `${vertical ? sourceNumberOr(middlewareData.arrow?.x, 0) : sourceNumberOr(middlewareData.arrow?.y, 0)}px`
        if (align !== 'center' && unshifted) {
          cross =
            (align === 'start') === (vertical && platform.isRTL?.(element) === true) ? '100%' : '0%'
        }
        const along =
          side === 'top' || side === 'left'
            ? `calc(100% + ${config.sideOffset}px)`
            : `${-config.sideOffset}px`
        element.style.setProperty(
          '--transform-origin',
          vertical ? `${cross} ${along}` : `${along} ${cross}`,
        )
        return {}
      },
    },
  ]
}

const Config = Schema.Struct({
  side: Schema.Literals(['top', 'bottom', 'left', 'right']),
  align: Schema.Literals(['start', 'center', 'end']),
  sideOffset: DropdownIndex,
  alignOffset: DropdownIndex,
  direction: Schema.Literals(['ltr', 'rtl']),
  sub: Schema.Boolean,
})
export type DropdownPositionConfig = typeof Config.Type
const part = (placement: Placement) => {
  const [side, align] = placement.split('-')
  return { side, align: align ?? 'center' }
}

const sourceNumberOr: (value: number | undefined, fallback: number) => number = (
  value: number | undefined,
  fallback: number,
) => (value === undefined || value === 0 || Number.isNaN(value) ? fallback : value)
class DropdownPositionError extends Schema.TaggedError<
  DropdownPositionError,
  {
    readonly brand: unique symbol
  }
>()('DropdownPositionError', { message: Schema.String }) {}
export const mountDropdownPositioner = (element: HTMLElement, trigger: HTMLElement | null) =>
  Effect.gen(function* () {
    let active = true
    const pending = new Set<Promise<ComputePositionReturn>>()
    const positionClasses = [
      'top-0',
      'left-0',
      '[position:var(--dropdown-position,fixed)]',
      '[opacity:var(--dropdown-opacity,1)]',
      '[transform:var(--dropdown-transform)]',
      '[will-change:var(--dropdown-will-change,auto)]',
    ]
    const originalStyle = element.getAttribute('style')
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        element.classList.add(...positionClasses)
        element.style.setProperty('--dropdown-position', 'fixed')
        element.style.setProperty('--dropdown-opacity', '0')
        element.style.setProperty('--available-width', '100vw')
        element.style.setProperty('--available-height', '100vh')
      }),
      () =>
        Effect.gen(function* () {
          active = false
          yield* Effect.promise(Promise.allSettled.bind(Promise, pending))
          yield* Effect.sync(() => {
            if (originalStyle === null) {
              element.removeAttribute('style')
            } else {
              element.setAttribute('style', originalStyle)
            }
            element.classList.remove(...positionClasses)
            delete element.dataset.side
            delete element.dataset.align
          })
        }),
    )
    if (trigger === null) {
      return
    }
    const update = Effect.fn('DropdownPosition.update')(() =>
      Effect.gen(function* () {
        const config = yield* Effect.sync(() => configuration(element))
        const placement: Placement =
          config.align === 'center' ? config.side : `${config.side}-${config.align}`
        let computation: Promise<ComputePositionReturn> | undefined
        const result = yield* Effect.tryPromise({
          // oxlint-disable-next-line typescript/promise-function-async -- Effect.tryPromise owns errors and interruption; this adapter must return the original tracked Floating UI Promise.
          try: () => {
            const requested = computePosition(trigger, element, {
              placement,
              strategy: 'absolute',
              middleware: [...dropdownPositionMiddleware(config, element, () => active)],
            })
            computation = requested
            pending.add(requested)
            return requested
          },
          catch: (error) =>
            new DropdownPositionError({
              message: error instanceof Error ? error.message : String(error),
            }),
        }).pipe(
          Effect.onExit((exit) => {
            const settled = computation
            if (Exit.hasInterrupts(exit) || settled === undefined) {
              return Effect.void
            }
            return Effect.sync(() => {
              pending.delete(settled)
            })
          }),
          Effect.orDie,
        )
        yield* Effect.sync(() => {
          if (!active) {
            return
          }
          const dpr = sourceNumberOr(element.ownerDocument.defaultView?.devicePixelRatio, 1)
          element.style.setProperty('--dropdown-position', 'absolute')
          element.style.setProperty(
            '--dropdown-transform',
            `translate(${Math.round(result.x * dpr) / dpr}px, ${Math.round(result.y * dpr) / dpr}px)`,
          )
          element.style.removeProperty('--dropdown-opacity')
          if (dpr > 1) {
            element.style.setProperty('--dropdown-will-change', 'transform')
          }
          const { side, align } = part(result.placement)
          if (side !== undefined && side !== '') {
            element.dataset.side = side
          }
          element.dataset.align = align
          if (result.middlewareData.hide?.referenceHidden === true) {
            element.dataset.anchorHidden = ''
          } else {
            delete element.dataset.anchorHidden
          }
        })
      }),
    )
    const updates = Stream.callback<'RecomputePosition'>((queue) => {
      const request = () => {
        Queue.offerUnsafe(queue, 'RecomputePosition')
      }
      return Effect.acquireRelease(
        Effect.sync(() => {
          const stop = autoUpdate(trigger, element, request, {
            ancestorScroll: true,
            elementResize: typeof ResizeObserver !== 'undefined',
            layoutShift: typeof IntersectionObserver !== 'undefined',
          })
          const observer = new MutationObserver(request)
          observer.observe(element, {
            attributes: true,
            attributeFilter: [
              'data-requested-side',
              'data-requested-align',
              'data-side-offset',
              'data-align-offset',
              'data-direction',
            ],
          })
          return () => {
            observer.disconnect()
            stop()
          }
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.andThen(Effect.never))
    })
    yield* Effect.forkScoped(Stream.runForEach(updates, update))
  })
