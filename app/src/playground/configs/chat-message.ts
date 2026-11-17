import { Effect, Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'
import type { ChatMessageConfig } from '@foldkit-visuals/fluid/chat-message'
import portrait from '../../../../lib/assets/micka.png'

const Attachments = Schema.Literals(['none', 'image', 'document', 'mixed'])

export const Configuration = Schema.TaggedStruct('chat-message', {
  appearance: Appearance,
  label: Schema.String,
  from: Schema.Literals(['assistant', 'user']),
  showTime: Schema.Boolean,
  time: Schema.String,
  showActions: Schema.Boolean,
  actionLabel: Schema.String,
  attachments: Attachments.pipe(Schema.withDecodingDefaultKey(Effect.succeed('none'))),
  thumbnailSize: Schema.Finite.pipe(Schema.withDecodingDefaultKey(Effect.succeed(64))),
  remoteUrl: Schema.String.pipe(Schema.withDecodingDefaultKey(Effect.succeed(portrait))),
  mediaType: Schema.String.pipe(Schema.withDecodingDefaultKey(Effect.succeed('image/png'))),
  filename: Schema.String.pipe(Schema.withDecodingDefaultKey(Effect.succeed('micka.png'))),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'chat-message',
  appearance: {},
  label: 'A comfortable space for conversation',
  from: 'assistant',
  showTime: false,
  time: '12:42',
  showActions: false,
  actionLabel: 'Copy message',
  attachments: 'none',
  thumbnailSize: 64,
  remoteUrl: portrait,
  mediaType: 'image/png',
  filename: 'micka.png',
})
export const filesFor = (configuration: Configuration): NonNullable<ChatMessageConfig['files']> => {
  const remote = {
    url: configuration.remoteUrl,
    mediaType: configuration.mediaType,
    ...(configuration.filename === '' ? {} : { filename: configuration.filename }),
  }
  switch (configuration.attachments) {
    case 'none':
      return []
    case 'image':
      return [remote]
    case 'document':
      return [{ ...remote, mediaType: 'application/pdf' }]
    case 'mixed':
      return [
        {
          id: 'chat-portrait',
          name: 'Local portrait',
          type: 'image/png',
          size: 156631,
          lastModified: 0,
        },
        remote,
        {
          url: 'https://example.test/report.pdf',
          mediaType: 'application/pdf',
          filename: 'Report.pdf',
        },
      ]
  }
}

export const controls = [
  {
    kind: 'choice',
    prop: 'attachments',
    group: 'Content',
    initial: defaults.attachments,
    values: Attachments.literals,
  },
  {
    kind: 'choice',
    prop: 'thumbnailSize',
    group: 'Properties',
    initial: defaults.thumbnailSize,
    values: [32, 64, 96, 128],
  },
  {
    kind: 'text',
    prop: 'remoteUrl',
    group: 'Content',
    initial: defaults.remoteUrl,
    values: [defaults.remoteUrl],
  },
  {
    kind: 'text',
    prop: 'mediaType',
    group: 'Content',
    initial: defaults.mediaType,
    values: [defaults.mediaType],
  },
  {
    kind: 'text',
    prop: 'filename',
    group: 'Content',
    initial: defaults.filename,
    values: [defaults.filename],
  },
  {
    kind: 'text',
    prop: 'label',
    group: 'Content',
    initial: defaults.label,
    values: [defaults.label],
  },
  {
    kind: 'choice',
    prop: 'from',
    group: 'Properties',
    initial: defaults.from,
    values: Configuration.fields.from.literals,
  },
  { kind: 'toggle', prop: 'showTime', group: 'Content', initial: defaults.showTime },
  { kind: 'text', prop: 'time', group: 'Content', initial: defaults.time, values: [defaults.time] },
  { kind: 'toggle', prop: 'showActions', group: 'Content', initial: defaults.showActions },
  {
    kind: 'text',
    prop: 'actionLabel',
    group: 'Content',
    initial: defaults.actionLabel,
    values: [defaults.actionLabel],
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (configuration: Configuration): ReadonlyArray<Control> =>
  controls.map((control) => {
    if (['remoteUrl', 'mediaType', 'filename', 'thumbnailSize'].includes(control.prop))
      return { ...control, enabled: configuration.attachments !== 'none' }
    if (control.prop === 'time') return { ...control, enabled: configuration.showTime }
    if (control.prop === 'actionLabel') return { ...control, enabled: configuration.showActions }
    return control
  })
