// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Effect, Schema } from 'effect'
import { SelectNamespace, Message } from './block.js'

export const Acknowledge = SelectNamespace.makeCommand('Acknowledge', {
  args: { generation: Schema.Natural },
  messages: [Message.CompletedAcknowledgement],
  *handler() {
    return ({ generation }) =>
      Effect.sleep('300 millis').pipe(Effect.as(Message.CompletedAcknowledgement({ generation })))
  },
})

export const ClearSearch = SelectNamespace.makeCommand('ClearSearch', {
  args: { generation: Schema.Natural },
  messages: [Message.ClearedSearch],
  *handler() {
    return ({ generation }) =>
      Effect.sleep('500 millis').pipe(Effect.as(Message.ClearedSearch({ generation })))
  },
})
