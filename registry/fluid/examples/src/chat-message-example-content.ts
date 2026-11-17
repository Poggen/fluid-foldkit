// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
import { Schema } from 'effect'
import { MessageFile } from '@foldkit-visuals/fluid/input-message'
import { RemoteFile } from '@foldkit-visuals/fluid/chat-message'
import portraitUrl from '../../../../lib/assets/micka.png'

export const Entry = Schema.Struct({
  id: Schema.String,
  section: Schema.Literals(['conversation', 'roles', 'attachments']),
  from: Schema.Literals(['user', 'assistant']),
  text: Schema.String,
  time: Schema.String,
  actions: Schema.Boolean,
  files: Schema.Array(Schema.Union([MessageFile, RemoteFile])),
  entrance: Schema.Boolean,
})
export type Entry = typeof Entry.Type

export const portrait = {
  id: 'chat-portrait',
  name: 'micka.png',
  type: 'image/png',
  size: 156631,
  lastModified: 0,
}

const conversation = [
  {
    from: 'user',
    text: 'What does “good design” actually mean? Everyone says it, no one defines it.',
    time: 'Wednesday 6:06 PM',
  },
  {
    from: 'assistant',
    text: "Good design is mostly invisible — you only notice it when it's missing. It's less about how something looks and more about how effortlessly it lets you do what you came to do.",
    time: '',
  },
  { from: 'user', text: 'So function over form?', time: 'Wednesday 6:07 PM' },
  {
    from: 'assistant',
    text: 'Not quite. Form is part of function — something that feels good to use is, in a real sense, working better. The split between the two is mostly a myth.',
    time: '',
  },
  { from: 'user', text: 'That reframes it completely.', time: 'Wednesday 6:08 PM' },
]

export const initialEntries: ReadonlyArray<Entry> = [
  ...conversation.map((entry, index) =>
    Entry.make({
      ...entry,
      from: index % 2 === 0 ? 'user' : 'assistant',
      id: `chat-m${index + 1}`,
      section: 'conversation',
      actions: true,
      files: [],
      entrance: false,
    }),
  ),
  Entry.make({
    id: 'chat-role-user',
    section: 'roles',
    from: 'user',
    text: 'Right-aligned accent bubble.',
    time: '',
    actions: false,
    files: [],
    entrance: false,
  }),
  Entry.make({
    id: 'chat-role-assistant',
    section: 'roles',
    from: 'assistant',
    text: 'Left-aligned, no background.',
    time: '',
    actions: false,
    files: [],
    entrance: false,
  }),
  Entry.make({
    id: 'chat-attachment-user',
    section: 'attachments',
    from: 'user',
    text: 'Can you use this as my new avatar?',
    time: '',
    actions: false,
    files: [
      portrait,
      { url: portraitUrl, mediaType: 'image', filename: 'Remote portrait' },
      {
        url: 'https://example.test/report.pdf',
        mediaType: 'application/pdf',
        filename: 'Report.pdf',
      },
    ],
    entrance: false,
  }),
  Entry.make({
    id: 'chat-attachment-assistant',
    section: 'attachments',
    from: 'assistant',
    text: "Looks great — it'll crop cleanly into the circle.",
    time: '',
    actions: false,
    files: [],
    entrance: false,
  }),
]

export const streamWords =
  'Good design stays steady as the response grows, one word at a time.'.split(' ')
