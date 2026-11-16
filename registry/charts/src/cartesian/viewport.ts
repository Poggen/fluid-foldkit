import { Schema } from 'effect'
import type { CartesianSnapshot } from './definition'

/** Reactive draw measurements; canonical rows, selection and hover stay in their existing owner. */
export const ChartViewport = Schema.Struct({
  width: Schema.Finite,
  height: Schema.Finite,
  margin: Schema.Struct({
    top: Schema.Finite,
    right: Schema.Finite,
    bottom: Schema.Finite,
    left: Schema.Finite,
  }),
  xDomain: Schema.Tuple([Schema.Finite, Schema.Finite]),
})

export type ChartViewport = typeof ChartViewport.Type

export function chartViewport<Row>(snapshot: CartesianSnapshot<Row>): ChartViewport {
  return {
    width: snapshot.width,
    height: snapshot.height,
    margin: snapshot.margin,
    xDomain: [snapshot.domains.x[0].getTime(), snapshot.domains.x[1].getTime()],
  }
}
