import type { Inputs, State } from './block'

export function presentationClass() {
  return class Presentation {
    readonly state: State
    readonly inputs: Inputs
    constructor(state: State, inputs: Inputs) {
      this.state = state
      this.inputs = inputs
    }
  }
}
