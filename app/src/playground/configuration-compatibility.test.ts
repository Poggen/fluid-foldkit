import * as DataTable from './configs/data-table'
import { expect, test } from 'vitest'
import { Effect, Option } from 'effect'
import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { ComponentReferenceBlock } from '../reference/block'
import { layer } from '../reference/layer'
import { prepareGalleryFlagsFor } from '../gallery/flags'
import { componentPresentation, defaults as settings } from '../settings'
import { decodeConfiguration } from './configuration'
import { previewOptionsFromUrl } from './options'
import * as Chat from './configs/chat-message'
import * as Thinking from './configs/thinking-steps'
import * as Table from './configs/table'

const legacyThinking = {
  _tag: 'thinking-steps',
  appearance: { size: 'compact', shape: 'rounded' },
  label: 'Saved reasoning',
  count: 2,
  stepLabel: 'Saved step',
  stepDescription: 'Keep this description',
  status: 'active',
  showIcons: false,
  open: false,
  disabled: true,
  size: 'site',
}
const legacyChat = {
  _tag: 'chat-message',
  appearance: { size: 'compact', shape: 'pill' },
  label: 'Saved reply',
  from: 'user',
  showTime: true,
  time: '09:41',
  showActions: true,
  actionLabel: 'Save reply',
}

const legacyTable = {
  _tag: 'table',
  appearance: { size: 'compact', shape: 'rounded' },
  size: 'site',
  rowCount: 2,
  columnCount: 2,
  showHeader: false,
  headers: 'Saved name, Saved status',
  firstCell: 'Saved row',
  emptyTitle: 'Saved empty state',
  emptyDescription: 'Keep this explanation',
}

const legacyDataTable = {
  _tag: 'data-table',
  appearance: { size: 'compact' },
  title: 'Saved components',
  search: false,
  filters: false,
  viewOptions: false,
  pagination: false,
  selectionBar: false,
}

for (const [slug, legacy, defaults] of [
  ['thinking-steps', legacyThinking, Thinking.defaults],
  ['chat-message', legacyChat, Chat.defaults],
  ['table', legacyTable, Table.defaults],
  ['data-table', legacyDataTable, DataTable.defaults],
] as const) {
  it.effect(`${slug} preserves saved URL settings when additive fields are absent`, () =>
    Effect.gen(function* () {
      const url = new URL(`/components/${slug}`, 'https://example.test')
      url.searchParams.set('props', JSON.stringify(legacy))
      const flags = yield* prepareGalleryFlagsFor(previewOptionsFromUrl(url.href))
      yield* Story.withBlock({ block: ComponentReferenceBlock, layer }, (reference) => {
        const model = reference.init(url.pathname, flags, componentPresentation(settings)).model
        expect(model.configuration).toEqual({ ...defaults, ...legacy })
      })
    }),
  )
}

test('additive playground defaults do not accept explicitly invalid values', () => {
  for (const [legacy, fields] of [
    [
      legacyDataTable,
      {
        pageSize: 0,
        searchMode: 'unknown',
        cellAlignment: 'bottom',
        editable: null,
        empty: 'true',
      },
    ],
    [
      legacyTable,
      {
        selection: 'unknown',
        headerHover: null,
        heldHeader: 3,
        hideHeaderHighlight: 'false',
        keepHeaderRule: 1,
        hoverMarker: null,
      },
    ],
    [legacyThinking, { meta: null, stepMeta: false, href: 4, running: 'unknown', control: null }],
    [
      legacyChat,
      {
        attachments: 'unknown',
        thumbnailSize: '64',
        remoteUrl: null,
        mediaType: 1,
        filename: false,
      },
    ],
  ] as const) {
    for (const [key, value] of Object.entries(fields)) {
      expect(Option.isNone(decodeConfiguration(JSON.stringify({ ...legacy, [key]: value })))).toBe(
        true,
      )
    }
  }
})
