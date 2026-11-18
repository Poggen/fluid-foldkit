import { Block } from 'foldkit'
import { Schema } from 'effect'
import { BarChart } from '../../index'

export const Row = Schema.Struct({ name: Schema.String, a: Schema.Finite, b: Schema.Finite })

export const data = [Row.make({ name: 'A', a: 20, b: 10 }), Row.make({ name: 'B', a: -10, b: 0 })]

export const root = BarChart({ name: 'bar-contract', Row })

export const BarContractKey = Symbol('BarContractKey')

export const Chart = Block.make(root.namespace, { key: BarContractKey, ...root.contract })

export const subject = { block: Chart, layer: Chart.makeLayer(root.plans(Chart)) }
