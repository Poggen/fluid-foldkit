import { DateTime, Schema } from 'effect'
import { Bar, BarChart } from '@foldkit-visuals/charts/bar'
import { Candlestick, CandlestickChart, Grid, YAxis } from '@foldkit-visuals/charts/candlestick'
import { Scatter, ScatterChart } from '@foldkit-visuals/charts/scatter'
import type { YAxisConfig } from '../src/cartesian/axis-options'

export const Row = Schema.Struct({
  name: Schema.String,
  date: Schema.DateFromString,
  value: Schema.Finite,
  other: Schema.Finite,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
})
export type Row = typeof Row.Type

export const rows = [
  Row.make({
    name: 'A',
    date: DateTime.toDateUtc(DateTime.makeUnsafe(0)),
    value: 90,
    other: 90,
    open: 30,
    high: 95,
    low: 5,
    close: 45,
  }),
  Row.make({
    name: 'B',
    date: DateTime.toDateUtc(DateTime.makeUnsafe(1000)),
    value: 45,
    other: 45,
    open: 45,
    high: 80,
    low: 20,
    close: 60,
  }),
]

export const margin = { top: 20, right: 30, bottom: 40, left: 50 }
export const size = { width: 400, height: 240 }
const common = { ...size, margin, animationDuration: 0 }

export const bar = BarChart({ name: 'source-axis-bar', Row })
export const candle = CandlestickChart({ name: 'source-axis-candle', Row })
export const scatter = ScatterChart({ name: 'source-axis-scatter', Row })

export const barProps = (axis: YAxisConfig = { numTicks: 20 }) => ({
  ...common,
  children: [Bar({ dataKey: 'value' }), Grid({ numTicksRows: 2 }), YAxis(axis)],
})

export const candleProps = (axis: YAxisConfig = { numTicks: 20 }) => ({
  ...common,
  children: [Candlestick(), Grid({ numTicksRows: 2 }), YAxis(axis)],
})

export const scatterProps = (secondary: YAxisConfig = { yAxisId: 7, numTicks: 20 }) => ({
  ...common,
  children: [
    Scatter({ dataKey: 'value' }),
    Scatter({ dataKey: 'other', yAxisId: 7 }),
    Grid({ numTicksRows: 2 }),
    YAxis(secondary),
    YAxis({ numTicks: 20 }),
  ],
})

export const twentyTicks = [
  '0',
  '5',
  '10',
  '15',
  '20',
  '25',
  '30',
  '35',
  '40',
  '45',
  '50',
  '55',
  '60',
  '65',
  '70',
  '75',
  '80',
  '85',
  '90',
  '95',
  '100',
]
