// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Deferred, Effect, Fiber, Option, Queue, Schema, Stream } from 'effect'
import { expect, vi } from 'vitest'
import { cancelFrame, frame, processFrame } from 'motion-dom'
import { observeDropdownPanel } from '../src/dropdown-panel-observer.js'
import { DropdownObservation } from '../src/dropdown-observation.js'
import type { DropdownPanelObservation } from '../src/dropdown-observation.js'
import type { DropdownCallbacks } from '../src/dropdown-resources.js'

const row = (id: string, index: number) => {
  const element = document.createElement('button')
  element.id = id
  element.type = 'button'
  element.tabIndex = -1
  element.dataset.fluidDropdownRow = ''
  element.dataset.fluidHoverIndex = String(index)
  element.dataset.label = id
  element.setAttribute('role', 'menuitem')
  return element
}

const acquirePanel = (
  id: string,
  inline = false,
  callbacks: Pick<DropdownCallbacks, 'onActivate' | 'onSelect'> = {},
) =>
  Effect.gen(function* () {
    const host = document.createElement('div')
    host.id = id
    host.dataset.state = 'open'
    host.dataset.generation = '0'
    // This resource test uses the real hover-open admission to avoid scheduling autofocus.
    host.dataset.openedByHover = 'true'
    host.dataset.restoreFocus = 'false'
    const panel = document.createElement('div')
    panel.dataset.fluidDropdownPanel = ''
    panel.tabIndex = -1
    const first = row(`${id}-first`, 0)
    const second = row(`${id}-second`, 1)
    panel.append(first, second)
    host.append(panel)
    document.body.append(host)
    yield* Effect.addFinalizer(() => Effect.sync(() => host.remove()))

    const mounted = yield* Deferred.make<void>()
    const observations = yield* Queue.unbounded<DropdownPanelObservation>()
    const history: Array<DropdownPanelObservation> = []
    const refs: Array<HTMLElement | null> = []
    const panels = new Map<string, HTMLElement>()
    const fiber = yield* observeDropdownPanel(
      document,
      { registerBranch: () => Effect.void },
      {
        callbacks: () => ({
          ...callbacks,
          contentRef: (element) => {
            refs.push(element)
            if (element !== null) Deferred.doneUnsafe(mounted, Effect.void)
          },
        }),
      },
      panels,
      {
        id,
        rootId: id,
        parentId: Option.none(),
        inline,
        side: 'bottom',
        align: 'start',
        sideOffset: 0,
        alignOffset: 0,
        element: host,
        viewStateChanges: Stream.make('Live'),
      },
    ).pipe(
      Stream.runForEach((observation) =>
        Effect.sync(() => history.push(observation)).pipe(
          Effect.andThen(Queue.offer(observations, observation)),
        ),
      ),
      Effect.forkScoped,
    )
    yield* Deferred.await(mounted)
    return { host, panel, first, second, observations, history, refs, panels, fiber }
  })

type Panel = Effect.Success<ReturnType<typeof acquirePanel>>

// Deliver each real MutationObserver checkpoint before starting the next one.
// The chain stays in microtasks until finish(), before a browser animation frame.
const mutationCheckpoints = (
  host: HTMLElement,
  mutations: ReadonlyArray<() => void>,
  finish: () => void,
) =>
  Effect.callback<void>((resume) => {
    let index = 0
    const observer = new MutationObserver(() => queueMicrotask(advance))
    const advance = () => {
      try {
        const mutate = mutations[index]
        if (mutate === undefined) {
          observer.disconnect()
          finish()
          resume(Effect.void)
          return
        }
        index += 1
        mutate()
        host.dataset.testBarrier = String(Number(host.dataset.testBarrier ?? '0') + 1)
      } catch (error) {
        observer.disconnect()
        resume(Effect.die(error))
      }
    }
    observer.observe(host, { attributes: true, attributeFilter: ['data-test-barrier'] })
    advance()
    return Effect.sync(() => observer.disconnect())
  })

// Exercise the actual public Motion read queue, without replacing its scheduler.
const readFrameNow = () => {
  let reached = false
  const marker = () => {
    reached = true
  }
  frame.read(marker)
  try {
    processFrame()
    expect(reached).toBe(true)
  } finally {
    cancelFrame(marker)
  }
}

// MovedPointer comes through the same native Stream queue after all earlier observations.
const observationsThroughBarrier = (subject: Panel) =>
  Effect.gen(function* () {
    subject.panel.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }),
    )
    const result: Array<DropdownPanelObservation> = []
    for (;;) {
      const observation = yield* Queue.take(subject.observations)
      if (Schema.is(DropdownObservation.MovedPointer)(observation)) return result
      result.push(observation)
    }
  })

const measured = (observations: ReadonlyArray<DropdownPanelObservation>) => {
  const snapshots = observations.filter(Schema.is(DropdownObservation.MeasuredRows))
  expect(snapshots).toHaveLength(1)
  const snapshot = snapshots[0]
  if (snapshot === undefined) throw new Error('Expected one native row snapshot')
  return snapshot.rows
}

for (const mode of ['open', 'closing', 'inline'] as const) {
  it.effect(`${mode} batches unchanged-metadata availability reads into one Motion read`, () =>
    Effect.gen(function* () {
      const subject = yield* acquirePanel(`batch-${mode}`, mode === 'inline')
      yield* observationsThroughBarrier(subject)
      if (mode === 'closing') {
        yield* mutationCheckpoints(
          subject.host,
          [
            () => {
              subject.host.dataset.state = 'closed'
            },
          ],
          readFrameNow,
        )
        yield* observationsThroughBarrier(subject)
      }
      const reads = vi.spyOn(window, 'getComputedStyle')
      yield* Effect.addFinalizer(() => Effect.sync(() => reads.mockRestore()))
      const firstReads = () =>
        reads.mock.calls.filter(([element]) => element === subject.first).length

      yield* mutationCheckpoints(
        subject.host,
        [
          () => {
            subject.first.style.opacity = '0.8'
          },
          () => {
            subject.first.style.transform = 'translateX(1px)'
          },
          () => {
            subject.first.style.visibility = 'hidden'
          },
        ],
        () => {
          expect(firstReads()).toBe(0)
          readFrameNow()
          expect(firstReads()).toBe(1)
        },
      )
      const rows = measured(yield* observationsThroughBarrier(subject))
      expect(rows[0]?.available).toBe(false)
      expect(rows[1]?.available).toBe(true)
    }).pipe(Effect.scoped),
  )
}

for (const inline of [false, true]) {
  it.effect(
    `${inline ? 'inline' : 'closing'} metadata publishes a full snapshot and cancels a queued read`,
    () =>
      Effect.gen(function* () {
        const subject = yield* acquirePanel(`metadata-${inline}`, inline)
        yield* observationsThroughBarrier(subject)
        const reads = vi.spyOn(window, 'getComputedStyle')
        yield* Effect.addFinalizer(() => Effect.sync(() => reads.mockRestore()))
        const firstReads = () =>
          reads.mock.calls.filter(([element]) => element === subject.first).length
        const replacement = row(`metadata-${inline}-replacement`, 7)
        yield* mutationCheckpoints(
          subject.host,
          [
            () => {
              if (!inline) subject.host.dataset.state = 'closed'
              subject.first.style.visibility = 'hidden'
            },
            () => {
              subject.first.dataset.label = 'Updated during pending read'
              subject.first.dataset.fluidHoverIndex = '5'
              subject.first.setAttribute('role', 'menuitemcheckbox')
              subject.first.setAttribute('aria-checked', 'true')
              subject.first.setAttribute('aria-disabled', 'true')
              subject.first.dataset.closeOnClick = 'false'
              subject.second.replaceWith(replacement)
            },
          ],
          () => {
            expect(firstReads()).toBe(1)
            readFrameNow()
            expect(firstReads()).toBe(1)
          },
        )
        expect(measured(yield* observationsThroughBarrier(subject))).toEqual([
          {
            id: subject.first.id,
            index: 5,
            label: 'Updated during pending read',
            disabled: true,
            available: false,
            kind: 'checkbox',
            checked: true,
            closeOnClick: false,
          },
          {
            id: replacement.id,
            index: 7,
            label: replacement.id,
            disabled: false,
            available: true,
            kind: 'action',
            checked: false,
            closeOnClick: true,
          },
        ])
      }).pipe(Effect.scoped),
  )
}

const intents = ['navigation', 'typeahead', 'keyboard activation', 'click', 'focus'] as const
for (const intent of intents) {
  it.effect(`same-task visibility is fresh before closing ${intent}`, () =>
    Effect.gen(function* () {
      const subject = yield* acquirePanel(`fresh-${intent.replaceAll(' ', '-')}`)
      yield* observationsThroughBarrier(subject)
      yield* mutationCheckpoints(
        subject.host,
        [
          () => {
            subject.host.dataset.state = 'closed'
          },
        ],
        readFrameNow,
      )
      yield* observationsThroughBarrier(subject)

      subject.first.style.visibility = 'hidden'
      if (intent === 'click') {
        subject.first.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      } else if (intent === 'focus') {
        subject.first.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      } else {
        subject.first.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: intent === 'navigation' ? 'ArrowDown' : intent === 'typeahead' ? 'f' : 'Enter',
            bubbles: true,
            cancelable: true,
          }),
        )
      }
      const observations = yield* observationsThroughBarrier(subject)
      const rows = measured(observations)
      expect(rows[0]?.available).toBe(false)
      const expected =
        intent === 'navigation'
          ? DropdownObservation.PressedNavigationKey({ key: 'ArrowDown', searchId: Option.none() })
          : intent === 'typeahead'
            ? DropdownObservation.TypedCharacter({ character: 'f' })
            : intent === 'focus'
              ? DropdownObservation.FocusedRow({
                  id: Option.some(subject.first.id),
                  visible: subject.first.matches(':focus-visible'),
                })
              : DropdownObservation.ActivatedRow({ id: subject.first.id })
      expect(observations).toEqual([DropdownObservation.MeasuredRows({ rows }), expected])
    }).pipe(Effect.scoped),
  )
}

it.effect('a native input flush cancels an already queued availability read', () =>
  Effect.gen(function* () {
    const subject = yield* acquirePanel('input-cancels-read')
    yield* observationsThroughBarrier(subject)
    const reads = vi.spyOn(window, 'getComputedStyle')
    yield* Effect.addFinalizer(() => Effect.sync(() => reads.mockRestore()))
    const firstReads = () =>
      reads.mock.calls.filter(([element]) => element === subject.first).length
    yield* mutationCheckpoints(
      subject.host,
      [
        () => {
          subject.first.style.visibility = 'hidden'
        },
      ],
      () => {
        expect(firstReads()).toBe(0)
        subject.first.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'f',
            bubbles: true,
            cancelable: true,
          }),
        )
        expect(firstReads()).toBe(1)
        readFrameNow()
        expect(firstReads()).toBe(1)
      },
    )
    const observations = yield* observationsThroughBarrier(subject)
    expect(measured(observations)[0]?.available).toBe(false)
    expect(observations.map(({ _tag }) => _tag)).toEqual(['MeasuredRows', 'TypedCharacter'])
  }).pipe(Effect.scoped),
)

it.effect(
  'reopening publishes current availability immediately and cancels the older queued read',
  () =>
    Effect.gen(function* () {
      const subject = yield* acquirePanel('reopen-read')
      yield* observationsThroughBarrier(subject)
      const reads = vi.spyOn(window, 'getComputedStyle')
      yield* Effect.addFinalizer(() => Effect.sync(() => reads.mockRestore()))
      const firstReads = () =>
        reads.mock.calls.filter(([element]) => element === subject.first).length
      yield* mutationCheckpoints(
        subject.host,
        [
          () => {
            subject.host.dataset.state = 'closed'
            subject.first.style.visibility = 'hidden'
          },
          () => {
            subject.host.dataset.state = 'open'
          },
        ],
        () => {
          expect(firstReads()).toBe(1)
          readFrameNow()
          expect(firstReads()).toBe(1)
        },
      )
      expect(measured(yield* observationsThroughBarrier(subject))[0]?.available).toBe(false)
    }).pipe(Effect.scoped),
)

it.effect('finalization cancels pending Motion reads and releases DOM listeners', () =>
  Effect.gen(function* () {
    const subject = yield* acquirePanel('released-read')
    yield* observationsThroughBarrier(subject)
    const reads = vi.spyOn(window, 'getComputedStyle')
    yield* Effect.addFinalizer(() => Effect.sync(() => reads.mockRestore()))
    const firstReads = () =>
      reads.mock.calls.filter(([element]) => element === subject.first).length
    yield* mutationCheckpoints(
      subject.host,
      [
        () => {
          subject.first.style.visibility = 'hidden'
        },
      ],
      () => {
        expect(firstReads()).toBe(0)
      },
    )
    yield* Fiber.interrupt(subject.fiber)
    expect(subject.panels.has('released-read')).toBe(false)
    expect(subject.refs).toEqual([subject.panel, null])
    const observationCount = subject.history.length
    readFrameNow()
    expect(firstReads()).toBe(0)
    const key = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    })
    subject.first.dispatchEvent(key)
    expect(key.defaultPrevented).toBe(false)
    expect(subject.history).toHaveLength(observationCount)
  }).pipe(Effect.scoped),
)

it.effect('input refresh preserves disabled admission and consumer activation veto', () =>
  Effect.gen(function* () {
    const activations: Array<string> = []
    const subject = yield* acquirePanel('refresh-veto', false, {
      onActivate: (id, event) => {
        activations.push(id)
        event.preventDefault()
      },
    })
    yield* observationsThroughBarrier(subject)
    subject.first.setAttribute('aria-disabled', 'true')
    subject.first.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    const disabled = yield* observationsThroughBarrier(subject)
    expect(disabled.map(({ _tag }) => _tag)).toEqual(['MeasuredRows'])
    expect(measured(disabled)[0]?.disabled).toBe(true)
    expect(activations).toEqual([])

    subject.first.setAttribute('aria-disabled', 'false')
    subject.first.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    )
    const vetoed = yield* observationsThroughBarrier(subject)
    expect(vetoed.map(({ _tag }) => _tag)).toEqual(['MeasuredRows'])
    expect(measured(vetoed)[0]?.disabled).toBe(false)
    expect(activations).toEqual([subject.first.id])
  }).pipe(Effect.scoped),
)

it.effect('input earlier in the same Motion read batch retires the queued row scan', () =>
  Effect.gen(function* () {
    const subject = yield* acquirePanel('same-read-batch')
    yield* observationsThroughBarrier(subject)
    const reads = vi.spyOn(window, 'getComputedStyle')
    yield* Effect.addFinalizer(() => Effect.sync(() => reads.mockRestore()))
    const firstReads = () =>
      reads.mock.calls.filter(([element]) => element === subject.first).length
    const inputDuringRead = () => {
      subject.first.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'f',
          bubbles: true,
          cancelable: true,
        }),
      )
      expect(firstReads()).toBe(1)
    }
    yield* Effect.addFinalizer(() => Effect.sync(() => cancelFrame(inputDuringRead)))

    yield* mutationCheckpoints(
      subject.host,
      [
        () => {
          // This callback enters the public read queue before the observer's pending scan.
          frame.read(inputDuringRead)
          subject.first.style.visibility = 'hidden'
        },
      ],
      () => {
        expect(firstReads()).toBe(0)
        readFrameNow()
        expect(firstReads()).toBe(1)
      },
    )
    const observations = yield* observationsThroughBarrier(subject)
    expect(measured(observations)[0]?.available).toBe(false)
    expect(observations.map(({ _tag }) => _tag)).toEqual(['MeasuredRows', 'TypedCharacter'])
  }).pipe(Effect.scoped),
)
