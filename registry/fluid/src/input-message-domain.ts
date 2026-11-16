// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Schema } from 'effect'

/** Browser File values live in the resource registry; checked Models retain identities only. */
export const MessageFile = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.String,
  size: Schema.Natural,
  lastModified: Schema.Finite,
})

export type MessageFile = typeof MessageFile.Type

export const QueuedMessage = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  files: Schema.Array(MessageFile),
})

export type QueuedMessage = typeof QueuedMessage.Type

export const InputMessageEvent = Schema.Union([
  Schema.TaggedStruct('ValueChanged', { value: Schema.String }),
  Schema.TaggedStruct('FilesChanged', { files: Schema.Array(MessageFile) }),
  Schema.TaggedStruct('QueueChanged', { queue: Schema.Array(QueuedMessage) }),
  Schema.TaggedStruct('Sent', {
    text: Schema.String,
    files: Schema.Array(MessageFile),
    queuedId: Schema.NullOr(Schema.String),
  }),
  Schema.TaggedStruct('Stopped', {}),
  Schema.TaggedStruct('Focused', { visible: Schema.Boolean }),
  Schema.TaggedStruct('Blurred', {}),
]).pipe(Schema.toTaggedUnion('_tag'))

export type InputMessageEvent = Schema.Schema.Type<typeof InputMessageEvent>

export const messageFileFingerprint = (file: Pick<MessageFile, 'name' | 'size' | 'lastModified'>) =>
  `${file.name}-${file.size}-${file.lastModified}`

export function acceptMessageFiles(
  current: ReadonlyArray<MessageFile>,
  incoming: ReadonlyArray<MessageFile>,
  accept: string,
  maxFiles: number | null,
) {
  const tokens = accept
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)

  const seen = new Set(current.map(messageFileFingerprint))
  const accepted: Array<MessageFile> = []

  for (const file of incoming) {
    if (
      !tokens.some((token) => {
        if (token.endsWith('/*')) {
          return file.type.startsWith(token.slice(0, -1))
        }

        if (token.startsWith('.')) {
          return file.name.toLowerCase().endsWith(token.toLowerCase())
        }

        return file.type === token
      })
    ) {
      continue
    }

    const key = messageFileFingerprint(file)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    accepted.push(file)
  }

  if (accepted.length === 0) {
    return null
  }

  const next = [...current, ...accepted]

  return maxFiles === null ? next : next.slice(0, maxFiles)
}

export interface MessageKey {
  readonly key: string
  readonly composing: boolean
  readonly shift: boolean
  readonly alt: boolean
  readonly meta: boolean
  readonly ctrl: boolean
  readonly selectionStart: number
  readonly selectionEnd: number
}

export interface MessageKeyState {
  readonly value: string
  readonly history: ReadonlyArray<string>
  readonly historyIndex: number | null
  readonly draftBeforeHistory: string
  readonly suggestions: ReadonlyArray<string>
  readonly activeSuggestion: number | null
  readonly placeholderSuggestion: string | null
}

export type MessageKeyIntent =
  | { readonly kind: 'Native' }
  | { readonly kind: 'Highlight'; readonly index: number | null }
  | { readonly kind: 'Fill'; readonly text: string }
  | {
      readonly kind: 'History'
      readonly index: number | null
      readonly text: string
      readonly savedDraft: string
    }
  | { readonly kind: 'Submit' }

function suggestionKeyIntent(state: MessageKeyState, key: string): MessageKeyIntent | undefined {
  if (key === 'ArrowDown') {
    return {
      kind: 'Highlight',
      index:
        state.activeSuggestion === null
          ? 0
          : Math.min(state.activeSuggestion + 1, state.suggestions.length - 1),
    }
  }

  if (state.activeSuggestion === null) {
    return undefined
  }

  if (key === 'ArrowUp') {
    return {
      kind: 'Highlight',
      index: state.activeSuggestion === 0 ? null : state.activeSuggestion - 1,
    }
  }

  if (key === 'Escape') {
    return { kind: 'Highlight', index: null }
  }

  const text = state.suggestions[state.activeSuggestion]

  return key === 'Enter' && text !== undefined ? { kind: 'Fill', text } : undefined
}

function historyKeyIntent(state: MessageKeyState, key: MessageKey): MessageKeyIntent | undefined {
  if (key.key === 'ArrowUp' && !state.value.slice(0, key.selectionStart).includes('\n')) {
    const index = (state.historyIndex ?? state.history.length) - 1
    const text = state.history[index]

    return index >= 0 && text !== undefined
      ? {
          kind: 'History',
          index,
          text,
          savedDraft: state.historyIndex === null ? state.value : state.draftBeforeHistory,
        }
      : { kind: 'Native' }
  }

  if (
    key.key === 'ArrowDown' &&
    state.historyIndex !== null &&
    !state.value.slice(key.selectionEnd).includes('\n')
  ) {
    const next = state.historyIndex + 1

    return {
      kind: 'History',
      index: next >= state.history.length ? null : next,
      text: state.history[next] ?? state.draftBeforeHistory,
      savedDraft: state.draftBeforeHistory,
    }
  }

  return undefined
}

/** The DOM observer uses the same independent input snapshot, without owning logical state. */
export function messageKeyIntent(state: MessageKeyState, key: MessageKey): MessageKeyIntent {
  if (key.composing) {
    return { kind: 'Native' }
  }

  const plain = !key.shift && !key.alt && !key.meta && !key.ctrl

  if (state.suggestions.length > 0 && state.value === '' && plain) {
    const intent = suggestionKeyIntent(state, key.key)

    if (intent !== undefined) {
      return intent
    }
  }

  if (
    key.key === 'Tab' &&
    !key.shift &&
    state.placeholderSuggestion !== null &&
    state.placeholderSuggestion !== '' &&
    state.value === ''
  ) {
    return { kind: 'Fill', text: state.placeholderSuggestion }
  }

  if (state.history.length > 0 && plain) {
    const intent = historyKeyIntent(state, key)

    if (intent !== undefined) {
      return intent
    }
  }

  return key.key === 'Enter' && !key.shift ? { kind: 'Submit' } : { kind: 'Native' }
}

export const inputMessageRemoveTooltipKey = (ownerId: string, itemId: string) =>
  `${ownerId}-remove-${encodeURIComponent(itemId)}`
