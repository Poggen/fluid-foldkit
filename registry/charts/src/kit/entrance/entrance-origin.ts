const MAX_RESOLVE_DELAY_MS = 40

const MOTION_FIRST_FRAME_MS = 1000 / 60

type EntranceOrigin = 'frame' | 'motion'

/** Resolves motion's two entrance clocks in the first rAF after the call: `frame` for a WAAPI-backed value, `motion` for a JS-driven one (see the header).
 * `createdAt` is motion's creation clock. Returns the cancel function. */
const resolveEntranceOrigins: (
  createdAt: number | 'frame',
  onResolved: (clocks: Readonly<Record<EntranceOrigin, number>>) => void,
  resolveOnFrame: boolean,
  now: () => number,
) => () => void = (
  createdAt: number | 'frame',
  onResolved: (clocks: Readonly<Record<EntranceOrigin, number>>) => void,
  resolveOnFrame: boolean,
  now: () => number,
) => {
  const id = requestAnimationFrame((frameTime) => {
    const resolvedAt = resolveOnFrame ? frameTime : now()
    const created = createdAt === 'frame' ? frameTime : createdAt
    const stamp = resolvedAt - created > MAX_RESOLVE_DELAY_MS ? resolvedAt : created
    onResolved({ frame: stamp, motion: stamp + MOTION_FIRST_FRAME_MS })
  })

  return () => {
    cancelAnimationFrame(id)
  }
}

/** Call from a layout effect after the entrance DOM is committed; returns the cleanup. `origins` maps a CSS animation name to its origin. `createdAt` is motion's creation clock:
 * a `now()` reading, or "frame" (the first rAF's timestamp) when bklit's counterpart is created well before the migrated commit. */
const alignEntranceStart: (
  host: HTMLElement | (() => HTMLElement | null),
  origins: Readonly<Record<string, EntranceOrigin>>,
  createdAt: number | 'frame',
  resolveOnFrame: boolean,
  now: () => number,
) => () => void = (
  host: HTMLElement | (() => HTMLElement | null),
  origins: Readonly<Record<string, EntranceOrigin>>,
  createdAt: number | 'frame',
  resolveOnFrame: boolean,
  now: () => number,
) => {
  let second = 0

  const cancelFirst = resolveEntranceOrigins(
    createdAt,
    (clocks) => {
      second = requestAnimationFrame(() => {
        // oxlint-disable-next-line no-restricted-properties -- one subtree getAnimations() per alignment pass, never per element (AGENTS.md exception)
        for (const animation of (typeof host === 'function' ? host() : host)?.getAnimations({
          subtree: true,
        }) ?? []) {
          const origin =
            animation instanceof CSSAnimation ? origins[animation.animationName] : undefined

          if (origin !== undefined) {
            const fill = animation.effect?.getTiming().fill

            if (fill !== 'backwards' && fill !== 'both') {
              animation.effect?.updateTiming({ fill: fill === 'forwards' ? 'both' : 'backwards' })
            }

            animation.startTime = clocks[origin]
          }
        }
      })
    },
    resolveOnFrame,
    now,
  )

  return () => {
    cancelFirst()
    cancelAnimationFrame(second)
  }
}

export { alignEntranceStart, resolveEntranceOrigins }

export type { EntranceOrigin }
