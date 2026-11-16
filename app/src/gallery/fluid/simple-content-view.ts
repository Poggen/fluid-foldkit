import { Match } from 'effect'
import { createKeyedLazy } from 'foldkit/html'
import type { FluidConfiguration } from '../../playground/configuration'
import type { ResolvedSettings } from '../../settings'
import type { FluidGalleryBlock } from './block'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { configuredContext } from './configuration-presentation'
import { Badge } from '@foldkit-visuals/fluid/badge'
import { Button } from '@foldkit-visuals/fluid/button'
import { DialogHeader, DialogTitle, DialogDescription } from '@foldkit-visuals/fluid/dialog'
import {
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from '@foldkit-visuals/fluid/table-parts'
import { thinkingIndicatorAnimations } from '@foldkit-visuals/fluid/thinking-indicator'
import { motion, target, highlight } from '../../motion'
import { Table, Thinking, sliderMotion } from './core-bindings'
import { Chat, Color } from './details-bindings'
import { Dialog } from './interactive-bindings'

const renderBadge = (
  c: Extract<FluidConfiguration, { readonly _tag: 'badge' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  return Badge({ context, variant: c.variant, color: c.color, children: [c.label] }, h)
}
type Events = Pick<typeof FluidGalleryBlock.Message, 'Refreshed'>
const renderChatMessage = (
  events: Events,
  chat: FluidGalleryModel['chat'],
  c: Extract<FluidConfiguration, { readonly _tag: 'chat-message' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, undefined)
  return h.block(
    Chat.embedView({
      slotId: 'chat',
      model: chat,
      viewInputs: {
        context,
        animate: (node, options) => target.node(node, { ...options, initial: false }),
        children: () => h.p([], [c.label]),
        ...(c.showTime ? { time: () => c.time } : {}),
        ...(c.showActions
          ? {
              actions: () =>
                Button(
                  {
                    context,
                    variant: 'ghost',
                    children: [c.actionLabel],
                    attributes: [h.OnClick(events.Refreshed())],
                  },
                  h,
                ),
            }
          : {}),
      },
    }),
  )
}
const renderDialog = (
  dialog: FluidGalleryModel['dialog'],
  c: Extract<FluidConfiguration, { readonly _tag: 'dialog' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, undefined)
  return h.block(
    Dialog.embedView({
      slotId: 'dialog',
      model: dialog,
      viewInputs: {
        context,
        animate: motion.node,
        size: c.modalSize,
        position: c.position,
        showCloseButton: c.showCloseButton,
        trigger: (attributes) => Button({ context, children: [c.triggerLabel], attributes }, h),
        content: (modal) => [
          DialogHeader(
            {
              context,
              children: [
                DialogTitle({ context, dialogId: modal.id, children: [c.label] }, h),
                DialogDescription({ context, dialogId: modal.id, children: [c.description] }, h),
              ],
            },
            h,
          ),
          ...(c.showActions
            ? [
                h.div(
                  [h.Class('flex justify-end gap-2 mt-6')],
                  [
                    Button(
                      {
                        context,
                        variant: 'ghost',
                        children: [c.cancelLabel],
                        attributes: modal.close,
                      },
                      h,
                    ),
                    Button({ context, children: [c.confirmLabel], attributes: modal.close }, h),
                  ],
                ),
              ]
            : []),
        ],
      },
    }),
  )
}
const renderTable = (
  table: FluidGalleryModel['table'],
  c: Extract<FluidConfiguration, { readonly _tag: 'table' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  const headers = Array.from(
    { length: c.columnCount },
    (_, i) => c.headers.split(',')[i]?.trim() || `Column ${i + 1}`,
  )
  const rows = Array.from({ length: c.rowCount }, (_, i) => [
    i === 0 ? c.firstCell : `Project ${i + 1}`,
    i % 2 ? 'Draft' : 'Published',
    `${i + 1} minutes ago`,
  ])
  return h.block(
    Table.embedView({
      slotId: 'table',
      model: table,
      viewInputs: {
        context,
        animateHighlight: highlight,
        content: (tableContext) => [
          ...(c.showHeader
            ? [
                TableHeader(
                  {
                    children: [
                      TableRow(
                        {
                          context: tableContext,
                          children: headers.map((label) =>
                            TableHead({ context, children: [label] }, h),
                          ),
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ]
            : []),
          TableBody(
            {
              children: rows.length
                ? rows.map((row, index) =>
                    TableRow(
                      {
                        context: tableContext,
                        index,
                        children: row
                          .slice(0, c.columnCount)
                          .map((value) => TableCell({ context, children: [value] }, h)),
                      },
                      h,
                    ),
                  )
                : [
                    TableEmpty(
                      {
                        columns: c.columnCount,
                        title: c.emptyTitle,
                        description: c.emptyDescription,
                      },
                      h,
                    ),
                  ],
            },
            h,
          ),
        ],
      },
    }),
  )
}
const renderThinkingIndicator = (
  thinking: FluidGalleryModel['thinking'],
  c: Extract<FluidConfiguration, { readonly _tag: 'thinking-indicator' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  return h.block(
    Thinking.embedView({
      slotId: 'thinking',
      model: thinking,
      viewInputs: {
        ...thinkingIndicatorAnimations(target),
        size: context().size,
        showIcon: c.showIcon,
      },
    }),
  )
}
const renderColorPicker = (
  color: FluidGalleryModel['color'],
  c: Extract<FluidConfiguration, { readonly _tag: 'color-picker' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, undefined)
  return h.div(
    [h.Id('showcase-color-container'), h.Class('relative w-full max-w-[280px]')],
    [
      h.block(
        Color.embedView({
          slotId: 'color',
          model: color,
          viewInputs: {
            context,
            portalContainerId: 'showcase-color-container',
            animate: motion.node,
            sliderMotion: sliderMotion.node,
            highlightMotion: highlight,
          },
        }),
      ),
    ],
  )
}

export const makeSimpleContentView = (events: Events) => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    configuration: Extract<
      FluidConfiguration,
      {
        readonly _tag:
          | 'badge'
          | 'chat-message'
          | 'dialog'
          | 'table'
          | 'thinking-indicator'
          | 'color-picker'
      }
    >,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    Match.value(configuration).pipe(
      Match.tag('badge', (c) =>
        lazy('badge', renderBadge, [c, settings.shape, settings.size, settings.hover, h]),
      ),
      Match.tag('chat-message', (c) =>
        lazy('chat-message', renderChatMessage, [
          events,
          model.chat,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('dialog', (c) =>
        lazy('dialog', renderDialog, [
          model.dialog,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('table', (c) =>
        lazy('table', renderTable, [
          model.table,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('thinking-indicator', (c) =>
        lazy('thinking-indicator', renderThinkingIndicator, [
          model.thinking,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('color-picker', (c) =>
        lazy('color-picker', renderColorPicker, [
          model.color,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.exhaustive,
    )
}
