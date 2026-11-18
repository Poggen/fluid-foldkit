import { Schema } from 'effect'
import type { CartesianSnapshot } from './definition'

export const chartViewport: <Row>(snapshot: CartesianSnapshot<Row>) => ChartViewport =
  function chartViewport<Row>(snapshot: CartesianSnapshot<Row>) {
    return {
      width: snapshot.width,
      height: snapshot.height,
      margin: snapshot.margin,
      xDomain: [snapshot.domains.x[0].getTime(), snapshot.domains.x[1].getTime()],
    } satisfies ChartViewport
  }

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
