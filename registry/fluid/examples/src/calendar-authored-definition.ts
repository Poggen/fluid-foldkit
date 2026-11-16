import { PreviewControlsBlock } from '../../../../components/docs/preview-controls'
import type { CalendarEnvironment } from '@foldkit-visuals/fluid/calendar/environment'
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { CalendarBlock } from '@foldkit-visuals/fluid/calendar'

import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import type { TooltipDom } from '@foldkit-visuals/fluid/tooltip'
import { SelectBlock } from '@foldkit-visuals/fluid/select'
import type { DropdownResources } from '@foldkit-visuals/fluid/dropdown/environment'
import { SwitchBlock } from '@foldkit-visuals/fluid/switch'
import { Settings, shuffleSettings } from './calendar-authored-data.js'
import { documentationFields, documentationInMessages } from './documentation.js'
type CalendarResources = CalendarEnvironment | TooltipDom | DropdownResources
export const CalendarAuthoredKey = Symbol('CalendarAuthored')
export const Selection = CalendarBlock.Model.fields.calendar.fields.selection.fields.selected
export const Message = defineMessageUnion({
  ClickedShuffle: {},
  Configured: { settings: Settings },
})

export const CalendarAuthoredBlock = Block.make('CalendarAuthored', {
  key: CalendarAuthoredKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    ...documentationFields,
    documentationTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
    calendars: Schema.Record(Schema.String, CalendarBlock.Model),
    selects: Schema.Record(Schema.String, SelectBlock.Model),
    weekSwitch: SwitchBlock.Model,
    tooltips: DocumentTooltipBlock.Model,
    settings: Settings,
    singleDate: Selection,
    range: Selection,
  }),
  Message,
  InMessage: defineInMessageUnion(documentationInMessages),
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<never, CalendarResources>(),
})

export const Shuffle = CalendarAuthoredBlock.makeCommand('Shuffle', {
  messages: [Message.Configured],
  *handler() {
    return () => shuffleSettings.pipe(Effect.map((settings) => Message.Configured({ settings })))
  },
})
