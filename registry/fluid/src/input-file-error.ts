import { Schema } from 'effect'

export class InputFileUnavailable extends Schema.TaggedError<InputFileUnavailable>()(
  'InputFileUnavailable',
  { id: Schema.String },
) {}
