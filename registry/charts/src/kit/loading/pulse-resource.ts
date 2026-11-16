import { Cause, Effect, Queue, Schema, Stream } from 'effect'
import type { ViewState } from 'foldkit/mount'
import { createPulseClipMotion } from './pulse-clip-motion'
import { PULSE_CONFIGURATION, PulseTransportCodec } from './pulse-model'
import type { PulseTransport } from './pulse-model'

function makePulseResource(
  element: Element,
  completed: (generation: number) => void,
  defect: (cause: Cause.Cause<never>) => void,
) {
  const rect = element.querySelector('rect[data-bkm-pulse-clip]')

  if (!(rect instanceof SVGRectElement)) {
    throw new TypeError('LineLoadingPulseStroke requires its view-owned clip rect')
  }

  let accepted: PulseTransport | undefined
  let live = false
  let disposed = false

  const motion = createPulseClipMotion(rect, () => {
    if (!disposed && live && accepted !== undefined) {
      completed(accepted.generation)
    }
  })

  const accept = (encoded: string | null) => {
    const transport = Schema.decodeUnknownSync(PulseTransportCodec)(encoded)
    accepted = transport
    const { configuration } = transport
    motion.update({
      width: configuration.innerWidth ?? 0,
      height: configuration.innerHeight ?? 0,
      left: 0,
      top: 0,
      mode: configuration.mode ?? 'loop',
      epoch: configuration.loopEpoch ?? 0,
      callbackKey: undefined,
    })
  }

  const records = (changes: ReadonlyArray<MutationRecord>) => {
    for (let index = 0; index < changes.length; index += 1) {
      const next = changes[index + 1]
      accept(next === undefined ? element.getAttribute(PULSE_CONFIGURATION) : next.oldValue)
    }
  }

  const observer = new MutationObserver((changes) => {
    if (disposed || !live) {
      return
    }

    try {
      records(changes)
    } catch (error) {
      defect(Cause.die(error))
    }
  })

  observer.observe(element, {
    attributes: true,
    attributeFilter: [PULSE_CONFIGURATION],
    attributeOldValue: true,
  })

  return {
    state(next: ViewState) {
      if (disposed) {
        return
      }

      const wasLive = live
      live = next === 'Live'

      if (!live) {
        motion.pause()

        return
      }

      const pending = observer.takeRecords()

      if (wasLive) {
        records(pending)
      }

      accept(element.getAttribute(PULSE_CONFIGURATION))
      motion.play()
    },
    release() {
      disposed = true
      observer.disconnect()
      motion.destroy()
    },
  }
}

export function observePulse<Message>(
  element: Element,
  states: Stream.Stream<ViewState>,
  observed: (generation: number) => Message,
  mounted: Message,
): Stream.Stream<Message> {
  return Stream.callback<Message>((queue) =>
    Effect.gen(function* pulseAcquisition() {
      const resource = yield* Effect.acquireRelease(
        Effect.sync(() =>
          makePulseResource(
            element,
            (generation) => {
              Queue.offerUnsafe(queue, observed(generation))
            },
            (cause) => {
              Queue.failCauseUnsafe(queue, cause)
            },
          ),
        ),
        (owned) =>
          Effect.sync(() => {
            owned.release()
          }),
      )

      yield* Stream.runForEach(states, (state) =>
        Effect.sync(() => {
          resource.state(state)
          Queue.offerUnsafe(queue, mounted)
        }),
      )
    }),
  )
}
