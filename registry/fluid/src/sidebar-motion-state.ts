/** The original shell holds clipping and drag transitions across open-state flips. */
export function sidebarOpenMotion(
  model: {
    readonly open: boolean
    readonly peeking: boolean
    readonly pinHold: boolean
    readonly pinGeneration: number
    readonly dragFlip: number
    readonly dragGeneration: number
  },
  open: boolean,
  resizing: boolean,
) {
  const flipped = resizing && open !== model.open
  const dragGeneration = model.dragGeneration + (flipped ? 1 : 0)
  const pinned = open !== model.open && open && model.peeking
  return {
    pinHold: pinned || model.pinHold,
    pinGeneration: model.pinGeneration + (pinned ? 1 : 0),
    dragGeneration,
    dragFlip: resizing ? (flipped ? dragGeneration : model.dragFlip) : 0,
  }
}
