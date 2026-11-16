import { Context, Exit, Option, Predicate, type Clock, type Tracer } from 'effect'
import type { Runtime } from 'foldkit'

export const messageRoute = (message: unknown): string => {
  const parts: Array<string> = []
  let current = message
  while (parts.length < 16 && Predicate.hasProperty(current, '_tag')) {
    if (typeof current._tag !== 'string') break
    parts.push(current._tag)
    if (Predicate.hasProperty(current, 'key') && typeof current.key === 'string')
      parts.push(current.key)
    current = Predicate.hasProperty(current, 'message') ? current.message : undefined
  }
  return parts.join('/') || 'none'
}

export const makeRecorder = (
  tracer: Tracer.Tracer,
  clock: Clock.Clock,
  session: Tracer.Span,
  performance: Performance,
) => {
  const revisions = new WeakMap<object, number>()
  let nextRevision = 0
  let capture: Tracer.Span | undefined
  let captureStartedAt = 0
  let count = 0
  let dropped = 0
  let excludedBeforeCapture = 0
  const revision = (model: unknown) => {
    if (typeof model !== 'object' || model === null) return -1
    const previous = revisions.get(model)
    if (previous !== undefined) return previous
    const value = ++nextRevision
    revisions.set(model, value)
    return value
  }
  const timestamp = (relativeMs: number) =>
    clock.currentTimeNanosUnsafe() + BigInt(Math.round((relativeMs - performance.now()) * 1e6))
  const span = (
    name: string,
    startMs: number,
    durationMs: number,
    attributes: Readonly<Record<string, string | number | boolean>>,
  ) => {
    if (capture === undefined) return
    if (startMs < captureStartedAt) {
      excludedBeforeCapture++
      return
    }
    if (count >= 20_000) {
      dropped++
      return
    }
    count++
    const started = timestamp(startMs)
    const value = tracer.span({
      name,
      parent: Option.some(capture),
      annotations: Context.empty(),
      links: [],
      startTime: started,
      kind: 'internal',
      root: false,
      sampled: true,
    })
    for (const [key, item] of Object.entries(attributes)) value.attribute(key, item)
    value.end(started + BigInt(Math.round(Math.max(0, durationMs) * 1e6)), Exit.void)
  }
  const end = () => {
    capture?.attribute('showcase.dropped_observations', dropped)
    capture?.attribute('showcase.excluded_pre_capture_observations', excludedBeforeCapture)
    capture?.end(clock.currentTimeNanosUnsafe(), Exit.void)
    capture = undefined
  }
  const start = (label: string) => {
    end()
    count = 0
    dropped = 0
    excludedBeforeCapture = 0
    captureStartedAt = performance.now()
    capture = tracer.span({
      name: `showcase.capture.${label}`,
      parent: Option.some(session),
      annotations: Context.empty(),
      links: [],
      startTime: clock.currentTimeNanosUnsafe(),
      kind: 'internal',
      root: false,
      sampled: true,
    })
    capture.attribute('showcase.correlation', 'capture-window; not inferred per-input causality')
    return { traceId: capture.traceId, spanId: capture.spanId }
  }
  const phase = (context: Runtime.SlowContext<unknown, unknown>) => {
    const observedAt = performance.now()
    const message =
      context._tag === 'Update'
        ? context.message
        : context._tag === 'SubscriptionDependencies'
          ? undefined
          : Option.getOrUndefined(context.message)
    const model = context._tag === 'Update' ? context.nextModel : context.model
    span(`foldkit.${context._tag}`, observedAt - context.durationMs, context.durationMs, {
      'foldkit.phase': context._tag,
      'foldkit.duration_ms': context.durationMs,
      'foldkit.message_route': messageRoute(message),
      'foldkit.model_revision': revision(model),
      'foldkit.timing_source': 'public post-phase duration; placement reconstructed at callback',
      ...(context._tag === 'SubscriptionDependencies'
        ? { 'foldkit.subscription': context.subscriptionKey }
        : {}),
    })
  }
  return {
    start,
    end,
    span,
    phase,
    snapshot: () => ({ count, dropped, excludedBeforeCapture, active: capture !== undefined }),
  }
}
