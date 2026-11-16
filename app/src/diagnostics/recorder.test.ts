import { Clock, Context, Effect, Option, Tracer } from 'effect'
import { expect, it, vi } from 'vitest'
import { makeRecorder } from './recorder'

it('does not attribute old or crossing timing entries to a newer capture', () => {
  const spans: Array<Tracer.Span> = []
  const tracer = Tracer.make({
    span(options) {
      const span = new Tracer.NativeSpan(options)
      spans.push(span)
      return span
    },
  })
  const session = tracer.span({
    name: 'session',
    parent: Option.none(),
    annotations: Context.empty(),
    links: [],
    startTime: 0n,
    kind: 'internal',
    root: true,
    sampled: true,
  })
  const now = vi.spyOn(performance, 'now').mockReturnValue(100)
  try {
    const recorder = makeRecorder(tracer, Effect.runSync(Clock.Clock), session, performance)
    recorder.start('new-window')
    now.mockReturnValue(120)
    recorder.span('old-longtask', 90, 5, {})
    recorder.span('crossing-frame', 95, 10, {})
    recorder.span('inside', 105, 3, {})
    recorder.end()
    expect(spans.map((span) => span.name)).toEqual([
      'session',
      'showcase.capture.new-window',
      'inside',
    ])
    expect(recorder.snapshot()).toMatchObject({ count: 1, excludedBeforeCapture: 2, active: false })
  } finally {
    now.mockRestore()
  }
})
