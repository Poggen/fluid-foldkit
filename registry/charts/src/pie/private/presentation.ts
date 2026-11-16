import type { PolarInputs } from './block'

export function presentationClass<Row>() {
  return class Presentation {
    readonly data: ReadonlyArray<Row>
    readonly focused: number | null
    readonly inputs: PolarInputs<Row>
    readonly size: number
    readonly hostReady: boolean
    constructor(
      data: ReadonlyArray<Row>,
      focused: number | null,
      inputs: PolarInputs<Row>,
      size: number,
      hostReady: boolean,
    ) {
      this.data = data
      this.focused = focused
      this.inputs = inputs
      this.size = size
      this.hostReady = hostReady
    }
  }
}
