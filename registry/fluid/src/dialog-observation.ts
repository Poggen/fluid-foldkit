import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const DIALOG_MOTION_COMPLETE = 'fluid-dialog-motion-complete'

export const dialogObservationFields = {
  ObservedOpenIntent: { open: Schema.Boolean },
  Entered: { generation: Schema.Natural },
  CompletedExit: { generation: Schema.Natural },
  Released: { generation: Schema.Natural },
}

export const DialogObservation = defineMessageUnion(dialogObservationFields)

export type DialogObservation = typeof DialogObservation.Type
