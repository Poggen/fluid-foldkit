import { Effect, Schema } from 'effect'
import { motionValue } from 'motion-dom'
import type { MotionResource } from './motion-resource.js'
import { carouselFillAt } from './carousel-dots-state.js'

export const CarouselPresentation = Symbol('CarouselPresentation')

export interface CarouselPresentationFacet {
  readonly paint: (snapshot: CarouselPaint) => Effect.Effect<void>
  readonly resource: (snapshot: CarouselPaint) => MotionResource
}

export const CarouselPaint = Schema.Struct({
  id: Schema.String,
  identity: Schema.String,
  index: Schema.NumberFromString,
  generation: Schema.Natural,
  revision: Schema.Natural,
  progress: Schema.NumberFromString,
})
export type CarouselPaint = typeof CarouselPaint.Type

const samePresentation = (left: CarouselPaint, right: CarouselPaint) =>
  left.generation === right.generation &&
  left.identity === right.identity &&
  Object.is(left.index, right.index)

interface PaintBinding {
  readonly snapshot: CarouselPaint
  readonly paint: (progress: number) => void
  readonly release: () => void
}
interface PaintRecord {
  latest: CarouselPaint
  key: object
  keySnapshot: CarouselPaint
  readonly bindings: Set<PaintBinding>
}

/** A projection of accepted Model snapshots, never a playback clock or state controller. */
export function createCarouselProgress() {
  const records = new Map<string, PaintRecord>()
  let disposed = false

  const paint = (snapshot: CarouselPaint) => {
    const record = records.get(snapshot.id)
    if (disposed || record === undefined || snapshot.revision < record.latest.revision) return
    record.latest = snapshot
    for (const binding of record.bindings) {
      if (samePresentation(binding.snapshot, snapshot)) binding.paint(snapshot.progress)
    }
  }

  const resource = (snapshot: CarouselPaint): MotionResource => {
    let record = records.get(snapshot.id)
    if (record === undefined) {
      record = { latest: snapshot, key: {}, keySnapshot: snapshot, bindings: new Set() }
      records.set(snapshot.id, record)
    } else if (!samePresentation(record.keySnapshot, snapshot)) {
      record.key = {}
      record.keySnapshot = snapshot
    }
    const captured = record
    return {
      key: captured.key,
      mount: (visual) => {
        if (disposed) throw new Error('CarouselDots progress scope is disposed')
        if (!records.has(snapshot.id)) records.set(snapshot.id, captured)
        if (snapshot.revision > captured.latest.revision) captured.latest = snapshot
        const initial = samePresentation(captured.latest, snapshot)
          ? captured.latest.progress
          : snapshot.progress
        const value = motionValue(carouselFillAt(initial))
        let released = false
        const binding: PaintBinding = {
          snapshot,
          paint: (progress) => value.set(carouselFillAt(progress)),
          release: () => {
            if (released) return
            released = true
            captured.bindings.delete(binding)
            visual.removeValue('transform')
            value.destroy()
            if (captured.bindings.size === 0 && records.get(snapshot.id) === captured)
              records.delete(snapshot.id)
          },
        }
        captured.bindings.add(binding)
        visual.addValue('transform', value)
        visual.render()
        return binding.release
      },
    }
  }

  return {
    paint,
    resource,
    dispose: () => {
      disposed = true
      for (const record of records.values()) {
        for (const binding of record.bindings) binding.release()
      }
      records.clear()
    },
  }
}
