import { modifyFields } from 'foldkit/struct'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Option } from 'effect'
import type { LocalHandlers } from './input-message-transitions.js'
import { Focus, events } from './input-message/definition.js'
import { InputMessageEvent } from './input-message-domain.js'
import type { QueuedMessage } from './input-message-domain.js'

export const RequestedRemoveQueued = ((model, { id }) => {
  const queue = model.queue.filter((item) => item.id !== id)

  return {
    model: modifyFields(model, { queue: () => queue }),
    outMessage: events([InputMessageEvent.cases.QueueChanged.make({ queue })]),
  }
}) satisfies LocalHandlers['RequestedRemoveQueued']

export const RequestedEditQueued = ((model, { id }) => {
  const item = model.queue.find((entry) => entry.id === id)

  if (!model.supportsQueue || item === undefined) {
    return { model }
  }

  const queue = model.queue.filter((entry) => entry.id !== id)
  const maximum = Option.getOrNull(model.maxFiles)
  const files = maximum === null ? item.files : item.files.slice(0, maximum)

  return {
    model: modifyFields(model, {
      queue: () => queue,
      editRevision: (value) => value + 1,
      files: () => (model.supportsFiles ? files : model.files),
      historyIndex: () => Option.none(),
    }),
    commands: [Focus({ id: model.id, caretEnd: true })],
    outMessage: events([
      InputMessageEvent.cases.ValueChanged.make({ value: item.text }),
      ...(model.supportsFiles
        ? [InputMessageEvent.cases.FilesChanged.make({ files }) satisfies InputMessageEvent]
        : []),
      InputMessageEvent.cases.QueueChanged.make({ queue }),
    ]),
  }
}) satisfies LocalHandlers['RequestedEditQueued']

export const RequestedMoveQueued = ((model, { id, direction }) => {
  const index = model.queue.findIndex((item) => item.id === id)
  const destination = index + direction
  const current = model.queue[index]
  const other = model.queue[destination]

  if (current === undefined || other === undefined) {
    return { model }
  }

  const queue = [...model.queue]
  queue[index] = other
  queue[destination] = current

  return {
    model: modifyFields(model, { queue: () => queue }),
    outMessage: events([InputMessageEvent.cases.QueueChanged.make({ queue })]),
  }
}) satisfies LocalHandlers['RequestedMoveQueued']

export const RequestedReorder = ((model, { ids }) => {
  if (ids.length !== model.queue.length || new Set(ids).size !== ids.length) {
    return { model }
  }

  const queue: Array<QueuedMessage> = []

  for (const id of ids) {
    const item = model.queue.find((entry) => entry.id === id)

    if (item === undefined) {
      return { model }
    }

    queue.push(item)
  }

  return {
    model: modifyFields(model, { queue: () => queue }),
    outMessage: events([InputMessageEvent.cases.QueueChanged.make({ queue })]),
  }
}) satisfies LocalHandlers['RequestedReorder']
