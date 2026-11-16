import { Cause, Effect, Queue, Schema, Stream } from 'effect'
import type { ViewState } from 'foldkit/mount'
import type { SeriesPointMarkerProps } from './props'

export const ENTRANCE_ATTRIBUTE = 'data-bkm-series-point-enter'

const Tokens = Schema.Tuple([
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
])

const Codec = Schema.fromJsonString(Tokens)

type Dependencies = readonly [string, number, number, number, number, number]

const numberToken = (value: number): string => (Object.is(value, -0) ? '-0' : String(value))

function tokenNumber(token: string): number {
  const value = Number(token)

  if (numberToken(value) !== token) {
    throw new TypeError('Invalid SeriesPointMarker numeric transport token')
  }

  return value
}

/** Numeric tokens preserve Object.is distinctions that raw JSON numbers lose. */
export function entranceAttribute(props: SeriesPointMarkerProps): string {
  return Schema.encodeSync(Codec)([
    props.dataKey,
    numberToken(props.index),
    numberToken(props.revealEpoch),
    numberToken(props.revealDelay),
    numberToken(props.enterDuration),
    numberToken(props.enterBlur ?? 2),
  ])
}

function dependencies(encoded: string | null): Dependencies {
  const [dataKey, index, epoch, delay, duration, blur] = Schema.decodeUnknownSync(Codec)(encoded)

  return [
    dataKey,
    tokenNumber(index),
    tokenNumber(epoch),
    tokenNumber(delay),
    tokenNumber(duration),
    tokenNumber(blur),
  ]
}

function same(previous: Dependencies | undefined, next: Dependencies): boolean {
  return previous !== undefined && previous.every((value, index) => Object.is(value, next[index]))
}

function makeEntranceResource(element: Element, onDefect: (cause: Cause.Cause<never>) => void) {
  let animation: Animation | undefined
  let observer: MutationObserver | undefined
  let accepted: Dependencies | undefined
  let live = false
  let pausedByResource = false
  let disposed = false

  const release = (): void => {
    if (disposed) {
      return
    }

    disposed = true
    const ownedAnimation = animation

    animation = undefined

    try {
      observer?.disconnect()
    } finally {
      ownedAnimation?.cancel()
    }
  }

  const reconcile = (next: Dependencies): void => {
    if (same(accepted, next)) {
      return
    }

    animation?.cancel()
    animation = undefined
    pausedByResource = false
    const { 3: delay, 4: duration, 5: blur } = next

    animation = element.animate(
      [
        { opacity: 0, filter: `blur(${blur}px)` },
        { opacity: 1, filter: 'blur(0px)' },
      ],
      {
        delay: delay * 1000,
        duration: duration * 1000,
        easing: 'cubic-bezier(0.85, 0, 0.15, 1)',
        fill: 'backwards',
      },
    )
    accepted = next
  }

  const processCommittedRecords = (records: ReadonlyArray<MutationRecord>): void => {
    for (let index = 0; index < records.length; index += 1) {
      const next = records[index + 1]
      // The next oldValue is this atomic write's committed newValue.
      const encoded = next === undefined ? element.getAttribute(ENTRANCE_ATTRIBUTE) : next.oldValue
      reconcile(dependencies(encoded))
    }
  }

  const observeState = (state: ViewState): void => {
    if (disposed) {
      return
    }

    if (observer === undefined) {
      observer = new MutationObserver((records) => {
        if (disposed || !live) {
          return
        }

        try {
          processCommittedRecords(records)
        } catch (error) {
          try {
            release()
          } finally {
            onDefect(Cause.die(error))
          }
        }
      })
      observer.observe(element, {
        attributes: true,
        attributeFilter: [ENTRANCE_ATTRIBUTE],
        attributeOldValue: true,
        subtree: false,
      })
    }

    const wasLive = live
    live = state === 'Live'

    if (!live) {
      if (animation?.playState === 'running') {
        animation.pause()
        pausedByResource = true
      }

      return
    }

    const pending = observer.takeRecords()

    if (wasLive) {
      processCommittedRecords(pending)
    }

    reconcile(dependencies(element.getAttribute(ENTRANCE_ATTRIBUTE)))

    if (pausedByResource) {
      animation?.play()
      pausedByResource = false
    }
  }

  return { observeState, release }
}

/** One physical acquisition owns its observer, committed facts and exact returned Animation. */
export function observeSeriesPointMarker<Message>(
  element: Element,
  states: Stream.Stream<ViewState>,
  completed: Message,
): Stream.Stream<Message> {
  return Stream.callback<Message>((queue) =>
    Effect.gen(function* () {
      const resource = yield* Effect.acquireRelease(
        Effect.sync(() =>
          makeEntranceResource(element, (cause) => {
            Queue.failCauseUnsafe(queue, cause)
          }),
        ),
        (owned) => Effect.sync(owned.release),
      )

      yield* Stream.runForEach(states, (state) =>
        Effect.sync(() => {
          resource.observeState(state)
          Queue.offerUnsafe(queue, completed)
        }),
      )
    }),
  )
}
