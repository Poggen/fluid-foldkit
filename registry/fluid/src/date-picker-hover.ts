import type { HoverMode } from './hover-observation.js'
import { HoverBlock } from './hover.js'
import type { HoverConfig } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'
import { DatePickerBlock } from './date-picker-definition.js'
import type { DatePickerPreparedConfig } from './date-picker-config.js'

export const SegmentHighlight = DatePickerBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'segmentHighlight',
  init: {
    contextToArgs: (config: DatePickerPreparedConfig) =>
      [
        {
          id: `${config.initial.id}-segment-highlight`,
          mode: config.presentation.hoverMode ?? 'fluid',
        },
      ] satisfies [{ readonly id: string; readonly mode: HoverMode }],
  },
})

export const Segments = DatePickerBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'segments',
  init: {
    contextToArgs: (config: DatePickerPreparedConfig) =>
      [
        {
          id: `${config.initial.id}-segments`,
          axis: 'x',
          gapClick: false,
          mode: config.presentation.hoverMode ?? 'fluid',
        },
      ] satisfies [HoverConfig],
  },
}).withOutMessagePolicy({
  fold: DatePickerBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      DatePickerBlock.makeStep((model) =>
        SegmentHighlight.informOfSource({ snapshot, hidden: false, mode: model.segments.mode }),
      ),
  }),
})

export const PresetHighlight = DatePickerBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'presetHighlight',
  init: {
    contextToArgs: (config: DatePickerPreparedConfig) =>
      [
        {
          id: `${config.initial.id}-preset-highlight`,
          mode: config.presentation.hoverMode ?? 'fluid',
        },
      ] satisfies [{ readonly id: string; readonly mode: HoverMode }],
  },
})

export const Presets = DatePickerBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'presets',
  init: {
    contextToArgs: (config: DatePickerPreparedConfig) =>
      [
        {
          id: `${config.initial.id}-presets`,
          axis: 'xy',
          mode: config.presentation.hoverMode ?? 'fluid',
        },
      ] satisfies [HoverConfig],
  },
}).withOutMessagePolicy({
  fold: DatePickerBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      DatePickerBlock.makeStep((model) =>
        PresetHighlight.informOfSource({ snapshot, hidden: false, mode: model.presets.mode }),
      ),
  }),
})
