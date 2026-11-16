import type { HeatmapInputs } from './block'

export class HeatmapPresentation<Row> {
  readonly data: ReadonlyArray<Row>
  readonly focused: number | null
  readonly inputs: HeatmapInputs<Row>
  readonly level: number | null
  readonly entered: boolean
  constructor(
    data: ReadonlyArray<Row>,
    focused: number | null,
    inputs: HeatmapInputs<Row>,
    level: number | null,
    entered: boolean,
  ) {
    this.data = data
    this.focused = focused
    this.inputs = inputs
    this.level = level
    this.entered = entered
  }
}
