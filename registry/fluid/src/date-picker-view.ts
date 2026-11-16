import { cn } from './lib/utils.js'
import { instantDate } from './calendar-domain/date-boundary.js'
import { childAttributes } from 'foldkit/html'
import { resolvePresentation } from './presentation.js'
import { fontWeights } from './lib/font-weight.js'
import { nestedRadius, popupShape } from './lib/shape.js'
import { spring } from './lib/springs.js'
import { LayoutResource, PresetFocusResource } from './date-picker-layout.js'
import type { Message } from './date-picker-definition.js'
import { TriggerResource } from './date-picker-definition.js'
import type { Model } from './date-picker-definition.js'
import { restoreDate } from './calendar-state.js'
import {
  dateLabelSizer,
  formatDateLabel,
  formatDuration,
  formatRangeLabel,
  formValue,
  timeToMinutes,
} from './date-picker-format.js'
import { sizeMap } from './lib/size.js'
import type {
  DatePickerViewInputs,
  DatePickerViewBindings,
  DatePickerViewBuilder,
} from './date-picker.js'

export const renderDatePicker = (
  model: typeof Model.Type,
  inputs: DatePickerViewInputs,
  h: DatePickerViewBuilder,
  bindings: DatePickerViewBindings,
  messages: Pick<typeof Message, 'Requested' | 'Disposed'>,
) => {
  const {
    Segments,
    SegmentHighlight,
    Presets,
    PresetHighlight,
    Popup,
    Calendar,
    PrimaryTime,
    EndTime,
    Clear,
  } = bindings
  const { picker, presentation, twoRows } = model
  const orientation = presentation.orientation === 'auto' ? picker.layout : presentation.orientation
  const size = sizeMap[presentation.compact ? 'compact' : 'default']
  const { shape, icons } = resolvePresentation({ context: inputs.presentationContext })
  const popupClasses = popupShape(shape.variant)
  const field = presentation.variant === 'outline'
  const timed = picker.hasTime || picker.hasTimeRange
  const locale = presentation.locale ?? undefined
  const now = instantDate(model.renderNow)
  const date = picker.value._tag === 'Single' ? restoreDate(picker.value.date) : undefined

  const range =
    picker.value._tag === 'Range'
      ? {
          from: picker.value.from === null ? undefined : restoreDate(picker.value.from),
          to: picker.value.to === null ? undefined : restoreDate(picker.value.to),
        }
      : undefined

  const hasValue = picker.mode === 'single' ? !!date : !!range?.from

  const placeholder =
    presentation.placeholder ?? (picker.mode === 'range' ? 'Pick dates' : 'Pick a date')

  const label = hasValue
    ? picker.mode === 'single' && date
      ? formatDateLabel(date, locale, now)
      : range
        ? formatRangeLabel(range, locale, now)
        : ''
    : placeholder

  const labelSizer = dateLabelSizer(
    picker.mode,
    picker.mode === 'single' ? date : range,
    locale,
    now,
  )

  const innerRadius =
    shape.variant === 'sharp'
      ? 'rounded-none'
      : field
        ? nestedRadius(shape.bgRadius, 3) === 5
          ? 'rounded-[5px]'
          : 'rounded-[17px]'
        : shape.bg

  const segmentClass = `relative z-[1] inline-flex h-full items-center outline-none transition-[color] duration-80 focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] ${presentation.compact || twoRows ? 'px-1.5' : 'px-2'} ${innerRadius}`

  const iconOptions = {
    size: size.icon,
    strokeWidth: 1.5,
    className: 'shrink-0 text-muted-foreground',
  }

  const start = timeToMinutes(picker.timeRange?.start)
  const end = timeToMinutes(picker.timeRange?.end)

  const duration =
    start !== null && end !== null && end > start
      ? h.span(
          [
            h.DataAttribute('slot', 'date-picker-duration'),
            h.Class(`whitespace-nowrap text-muted-foreground ${size.text}`),
          ],
          [formatDuration(end - start)],
        )
      : undefined

  const presetList =
    picker.mode === 'range' && presentation.presets.length > 0
      ? [
          h.div(
            [
              h.OnMount(PresetFocusResource()),
              h.Class(
                `shrink-0 ${orientation === 'vertical' ? 'mt-1 border-t border-border pt-1' : 'w-[152px] border-r border-border pr-1'}`,
              ),
            ],
            [
              h.block(
                Presets.embedView({
                  slotId: 'presets',
                  model: model.presets,
                  viewInputs: {
                    attributes: childAttributes([
                      h.Role('group'),
                      h.AriaLabel('Presets'),
                      h.DataAttribute('slot', 'date-picker-presets'),
                    ]),
                    className: 'relative flex flex-col p-1',
                    content: (snapshot) => [
                      h.block(
                        PresetHighlight.embedView({
                          slotId: 'preset-highlight',
                          model: model.presetHighlight,
                          viewInputs: {
                            animate: inputs.highlight,
                            className: popupClasses.bg,
                            mode: model.presets.mode,
                          },
                        }),
                      ),
                      ...presentation.presets.map((preset, index) => {
                        const selected =
                          picker.value._tag === 'Range' &&
                          picker.value.from !== null &&
                          picker.value.to !== null &&
                          preset.range.from !== null &&
                          preset.range.to !== null &&
                          picker.value.from.ordinal === preset.range.from.ordinal &&
                          picker.value.to.ordinal === preset.range.to.ordinal

                        return h.keyed('button')(
                          preset.label,
                          [
                            h.Type('button'),
                            h.DataAttribute('preset-index', String(index)),
                            h.AriaPressed(String(selected)),
                            ...snapshot.itemAttributes(index),
                            h.OnClick(
                              messages.Requested({
                                action: { _tag: 'PresetSelected', value: preset.range },
                              }),
                            ),
                            h.Class(
                              `relative z-10 flex shrink-0 cursor-pointer items-center ${popupClasses.bg} text-left whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] ${size.control} ${size.itemPx} ${size.text} transition-[color] duration-80 ${selected || snapshot.activeIndex === index ? 'text-foreground' : 'text-muted-foreground'}`,
                            ),
                          ],
                          [
                            h.span(
                              [h.Class('inline-grid')],
                              [
                                h.span(
                                  [
                                    h.Class(
                                      'invisible col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]',
                                    ),
                                    h.AriaHidden(true),
                                    h.Style({ fontVariationSettings: fontWeights.semibold }),
                                  ],
                                  [preset.label],
                                ),
                                h.span(
                                  [
                                    h.Class(
                                      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
                                    ),
                                    h.Style({
                                      fontVariationSettings: selected
                                        ? fontWeights.semibold
                                        : fontWeights.normal,
                                    }),
                                  ],
                                  [preset.label],
                                ),
                              ],
                            ),
                          ],
                        )
                      }),
                    ],
                  },
                }),
              ),
            ],
          ),
        ]
      : []

  const popup = h.block(
    Popup.embedView({
      slotId: 'popup',
      model: model.popup,
      viewInputs: {
        animate: inputs.animate,
        context: inputs.presentationContext,
        ariaLabelledBy: presentation.triggerId ?? picker.id,
        content: () => [
          h.div(
            [
              h.Class(
                `flex rounded-[inherit] bg-inherit p-1 ${orientation === 'vertical' && presetList.length > 0 ? 'flex-col' : 'flex-row'} ${orientation === 'vertical' && (presentation.numberOfMonths ?? (picker.mode === 'range' ? 2 : 1)) > 1 ? 'max-h-[min(560px,var(--popup-available-height,560px))] overflow-y-auto' : ''}`,
              ),
            ],
            [
              ...(orientation === 'horizontal' ? presetList : []),
              h.div(
                [h.Class(`${popupClasses.bg} bg-inherit`)],
                [
                  h.block(
                    Calendar.embedView({
                      slotId: 'calendar',
                      model: model.calendar,
                      viewInputs: {
                        ...inputs,
                        compact: presentation.compact,
                        cellSize: presentation.cellSize ?? (presentation.compact ? 32 : 36),
                      },
                    }),
                  ),
                ],
              ),
              ...(orientation === 'vertical' ? presetList : []),
            ],
          ),
        ],
      },
    }),
  )

  return h.block(
    Segments.embedView({
      slotId: 'segments',
      model: model.segments,
      viewInputs: {
        attributes: childAttributes([
          h.Role('group'),
          ...(presentation.ariaLabel ? [h.AriaLabel(presentation.ariaLabel)] : []),
          h.DataAttribute('slot', 'date-picker'),
          h.DataAttribute('variant', presentation.variant),
          h.DataAttribute('timed', String(timed)),
          ...(twoRows ? [h.DataAttribute('two-rows', 'true')] : []),
        ]),
        className: `group/date-picker relative inline-flex items-center ${twoRows ? 'flex-wrap' : size.control} ${size.text} ${field ? `border border-border bg-transparent ${twoRows ? 'p-1' : 'p-0.5'} ${shape.input} ${presentation.compact ? 'min-w-[128px]' : 'min-w-[160px]'}` : ''} ${presentation.disabled ? 'pointer-events-none opacity-50' : ''} ${presentation.className}`,
        content: (snapshot) => [
          h.block(
            SegmentHighlight.embedView({
              slotId: 'segment-highlight',
              model: model.segmentHighlight,
              viewInputs: {
                animate: inputs.highlight,
                className: `z-0 ${innerRadius}`,
                mode: model.segments.mode,
              },
            }),
          ),
          ...(presentation.name
            ? [
                h.input([
                  h.Type('hidden'),
                  h.Name(presentation.name),
                  h.Value(
                    formValue(
                      picker.mode === 'single' ? date : range,
                      picker.hasTime ? picker.time : null,
                      picker.hasTimeRange ? picker.timeRange : null,
                    ),
                  ),
                ]),
              ]
            : []),
          h.span(
            [
              h.Class(
                cn(
                  `inline-flex items-center ${field && !timed ? 'flex-1' : ''} ${twoRows ? 'order-1' : ''}`,
                  twoRows ? '' : 'h-full',
                ),
              ),
              h.OnMount(LayoutResource()),
              h.OnUnmount(messages.Disposed()),
              h.Style(twoRows ? { height: `${size.controlHeight - (field ? 6 : 0)}px` } : {}),
            ],
            [
              h.button(
                [
                  h.Id(presentation.triggerId ?? picker.id),
                  h.DataAttribute('date-picker-anchor', picker.id),
                  h.Type('button'),
                  h.Disabled(presentation.disabled),
                  h.AriaHasPopup('dialog'),
                  h.AriaExpanded(picker.open),
                  h.AriaControls(`${picker.id}-popup`),
                  ...(picker.open ? [h.DataAttribute('popup-open', '')] : []),
                  ...(picker.open && model.popup.openingInteraction !== null
                    ? [h.DataAttribute('pressed', '')]
                    : []),
                  ...(presentation.disabled ? [h.DataAttribute('disabled', '')] : []),
                  ...(presentation.ariaLabel
                    ? [h.AriaLabel(`${presentation.ariaLabel}: ${label}`)]
                    : []),
                  h.DataAttribute('slot', 'date-picker-trigger'),
                  ...(!hasValue ? [h.DataAttribute('placeholder', '')] : []),
                  h.DataAttribute('picker-open', String(picker.open)),
                  h.OnMount(TriggerResource()),
                  ...snapshot.itemAttributes(0),
                  h.Class(
                    `${segmentClass} ${presentation.compact ? 'gap-1' : 'gap-1.5'} cursor-pointer whitespace-nowrap ${field && !timed ? 'flex-1' : ''} ${hasValue || picker.open ? 'text-foreground' : 'text-muted-foreground'}`,
                  ),
                ],
                [
                  ...(field ? [icons.calendar(iconOptions, h)] : []),
                  h.span(
                    [h.Class('inline-grid text-left tabular-nums')],
                    [
                      h.span(
                        [h.Class('col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]')],
                        [label],
                      ),
                      h.span(
                        [
                          h.AriaHidden(true),
                          h.Class('invisible col-start-1 row-start-1 inline-flex whitespace-pre'),
                        ],
                        labelSizer.map((options) =>
                          h.span(
                            [h.Class('inline-grid')],
                            options.map((option) =>
                              h.span(
                                [
                                  h.Class(
                                    'col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]',
                                  ),
                                ],
                                [option],
                              ),
                            ),
                          ),
                        ),
                      ),
                      h.span(
                        [
                          h.AriaHidden(true),
                          h.Class(
                            'invisible col-start-1 row-start-1 whitespace-pre [text-box:trim-both_cap_alphabetic]',
                          ),
                        ],
                        [placeholder],
                      ),
                    ],
                  ),
                ],
              ),
              popup,
            ],
          ),
          ...(timed && !twoRows
            ? [
                h.span([
                  h.AriaHidden(true),
                  h.Class('relative z-[1] mx-0.5 h-4 w-px shrink-0 bg-border'),
                ]),
              ]
            : []),
          ...(twoRows
            ? [h.span([h.AriaHidden(true), h.Class('order-3 my-1 h-px basis-full bg-border')])]
            : []),
          ...(timed
            ? [
                h.span(
                  [
                    h.Class(
                      cn(
                        `inline-flex items-center ${twoRows ? 'order-4' : ''}`,
                        twoRows ? '' : 'h-full',
                      ),
                    ),
                    h.Style(twoRows ? { height: `${size.controlHeight - (field ? 6 : 0)}px` } : {}),
                  ],
                  [
                    h.block(
                      PrimaryTime.embedView({
                        slotId: 'primary-time',
                        model: model.primaryTime,
                        viewInputs: {
                          animate: inputs.animate,
                          highlight: inputs.highlight,
                          compact: presentation.compact,
                          segmentClass,
                          context: inputs.presentationContext,
                          attributes: childAttributes(snapshot.itemAttributes(1)),
                          prefix: icons.clock(iconOptions, h),
                        },
                      }),
                    ),
                    ...(!picker.hasTime && picker.hasTimeRange
                      ? [
                          h.block(
                            EndTime.embedView({
                              slotId: 'end-time',
                              model: model.endTime,
                              viewInputs: {
                                animate: inputs.animate,
                                highlight: inputs.highlight,
                                compact: presentation.compact,
                                segmentClass,
                                context: inputs.presentationContext,
                                attributes: childAttributes(snapshot.itemAttributes(2)),
                                prefix: icons['arrow-right'](iconOptions, h),
                                ...(duration ? { suffix: duration } : {}),
                              },
                            }),
                          ),
                        ]
                      : []),
                  ],
                ),
              ]
            : []),
          h.block(
            Clear.embedView({
              slotId: 'clear',
              model: model.clear,
              viewInputs: {
                className: cn(
                  `relative z-[1] ml-auto inline-flex shrink-0 ${twoRows ? 'order-2 ml-0' : ''}`,
                  twoRows ? '' : 'h-full',
                ),
                attributes: childAttributes([
                  h.Style(twoRows ? { height: `${size.controlHeight - (field ? 6 : 0)}px` } : {}),
                ]),
                animate: (node, present) =>
                  inputs.animate(node, {
                    initial: model.clear.generation === 0 ? false : { opacity: 0 },
                    animate: { opacity: 1 },
                    exit: { opacity: 0, transition: spring.fast.exit },
                    transition: spring.fast,
                    present,
                  }),
                content: () =>
                  h.button(
                    [
                      h.Type('button'),
                      h.AriaLabel('Clear'),
                      h.DataAttribute('slot', 'date-picker-clear'),
                      ...snapshot.itemAttributes(9),
                      h.Class(
                        `inline-flex h-full shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] ${presentation.compact ? 'w-6' : 'w-7'} ${innerRadius}`,
                      ),
                      h.OnClick(messages.Requested({ action: { _tag: 'Cleared' } })),
                    ],
                    [icons.x({ size: size.icon, strokeWidth: 1.5 }, h)],
                  ),
              },
            }),
          ),
        ],
      },
    }),
  )
}
