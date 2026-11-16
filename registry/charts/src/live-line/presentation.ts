import type { LiveInputs } from './block'
import type { LiveCursor } from './options'
import type { LiveState } from './state'

export class LiveLinePresentation<Row> {
  readonly data: ReadonlyArray<Row>
  readonly focused: number | null
  readonly inputs: LiveInputs<Row>
  readonly state: LiveState
  readonly cursor: LiveCursor | null
  readonly needsClock: boolean
  constructor(
    data: ReadonlyArray<Row>,
    focused: number | null,
    inputs: LiveInputs<Row>,
    state: LiveState,
    cursor: LiveCursor | null,
    needsClock: boolean,
  ) {
    this.needsClock = needsClock
    this.data = data
    this.focused = focused
    this.inputs = inputs
    this.state = state
    this.cursor = cursor
  }
}
