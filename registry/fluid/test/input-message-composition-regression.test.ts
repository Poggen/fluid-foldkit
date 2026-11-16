import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { InputMessageBlock, layer } from '../src/input-message.js'
import { Focus, SettleFiles } from '../src/input-message/definition.js'
import { Queue } from '../src/input-message-bindings.js'
import { InputMessageQueueBlock } from '../src/input-message-queue.js'

const subject = { block: InputMessageBlock, layer }
const file = { id: 'photo', name: 'photo.png', type: 'image/png', size: 10, lastModified: 1 }

it.effect('controlled value reconciliation retains the old button glyph until exit completes', () =>
  Story.story(
    subject,
    Story.init({
      id: 'composer',
      value: '',
      reduceMotion: false,
      status: 'streaming',
      supportsQueue: true,
      supportsStop: true,
    }),
    Story.inMessage(InputMessageBlock.InMessage.InformedOfValue({ value: 'draft' })),
    Story.expectNoOutMessage(),
    Story.model((model) => {
      expect(model.buttonGlyph).toBe('stop')
      expect(model.buttonExiting).toBe(true)
      expect(model.buttonSwaps).toBe(0)
    }),
    Story.message(InputMessageBlock.Message.CompletedButtonExit()),
    Story.model((model) => {
      expect(model.buttonGlyph).toBe('arrow')
      expect(model.buttonExiting).toBe(false)
      expect(model.buttonSwaps).toBe(1)
    }),
    Story.Command.expectNone(),
  ),
)

it.effect('one child queue edit retains its complete ordered events and one focus command', () =>
  Story.story(
    subject,
    Story.init({
      id: 'composer',
      value: '',
      reduceMotion: false,
      status: 'streaming',
      supportsQueue: true,
      supportsFiles: true,
      queue: [{ id: 'queued', text: 'Queued draft', files: [file] }],
    }),
    Story.messageIn(Queue, InputMessageQueueBlock.Message.RequestedEdit({ id: 'queued' })),
    Story.expectOutMessage(
      InputMessageBlock.OutMessage.Events({
        events: [
          { _tag: 'ValueChanged', value: 'Queued draft' },
          { _tag: 'FilesChanged', files: [file] },
          { _tag: 'QueueChanged', queue: [] },
        ],
      }),
    ),
    Story.model((model) => {
      expect(model.editRevision).toBe(1)
      expect(model.value).toBe('')
      expect(model.queue).toEqual([])
      expect(model.files).toEqual([file])
      expect(model.queueView.slots[0]?.present).toBe(true)
    }),
    Story.Command.expectExactInOrder(Focus({ id: 'composer', caretEnd: true })),
    Story.Command.resolve(Focus, InputMessageBlock.Message.CompletedFocus()),
    Story.expectNoOutMessage(),
  ),
)

it.effect(
  'file capture preserves settlement and accepted-files notification through reconciliation',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'composer', value: '', reduceMotion: false, supportsFiles: true }),
      Story.message(InputMessageBlock.Message.CapturedFiles({ batchId: 'upload', files: [file] })),
      Story.expectOutMessage(
        InputMessageBlock.OutMessage.Events({ events: [{ _tag: 'FilesChanged', files: [file] }] }),
      ),
      Story.Command.expectExactInOrder(SettleFiles({ batchId: 'upload', accepted: ['photo'] })),
      Story.Command.resolve(SettleFiles, InputMessageBlock.Message.CompletedFilesSettled()),
      Story.expectNoOutMessage(),
      Story.model((model) => expect(model.filesView.slots[0]?.file.id).toBe('photo')),
    ),
)

it.effect(
  'a stale queue edit still clears the active suggestion without emitting or focusing',
  () =>
    Story.story(
      subject,
      Story.init({
        id: 'composer',
        value: '',
        suggestions: ['Try this'],
        supportsQueue: true,
        reduceMotion: false,
      }),
      Story.inMessage(InputMessageBlock.InMessage.RequestedHighlight({ index: 0 })),
      Story.model((model) => expect(model.hover.activeIndex).toBe(0)),
      Story.messageIn(Queue, InputMessageQueueBlock.Message.RequestedEdit({ id: 'retired' })),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
      Story.model((model) => expect(model.hover.activeIndex).toBeNull()),
    ),
)
