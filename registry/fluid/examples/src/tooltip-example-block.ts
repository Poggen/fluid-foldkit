import {
  hoverModeOf as controlsHoverModeOf,
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs'

import { initAndInsert } from 'foldkit/binding'

import {
  documentationFields,
  documentationInMessages,
  documentationDefaults,
} from './documentation.js'
import { docSection } from './doc-section.js'
import { defineInMessageUnion } from 'foldkit/message'
import source from './tooltip-example-block.ts?raw'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { Button } from '@foldkit-visuals/fluid/button'
import { fontWeights } from '@foldkit-visuals/fluid/tokens'
import { DocumentTooltipBlock, layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import type { DocumentTooltipOptions } from '@foldkit-visuals/fluid/tooltip'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'

const cases: ReadonlyArray<{
  key: string
  label: string
  content: string
  options?: DocumentTooltipOptions
}> = [
  { key: 'basic', label: 'Hover me', content: 'Save your changes' },
  ...(['top', 'right', 'bottom', 'left'] as const).map((side) => ({
    key: side,
    label: side[0]?.toUpperCase() + side.slice(1),
    content: side[0]?.toUpperCase() + side.slice(1),
    options: { side },
  })),
  { key: 'rich', label: 'Save', content: '' },
  {
    key: 'follow-x',
    label: 'Move along me',
    content: 'Following x',
    options: { followCursor: 'x' },
  },
  {
    key: 'follow-y',
    label: 'Move along me',
    content: 'Following y',
    options: { followCursor: 'y', side: 'right' },
  },
  { key: 'instant', label: 'No delay', content: 'Instant', options: { delayDuration: 0 } },
  { key: 'slow', label: '500ms delay', content: 'Slow', options: { delayDuration: 500 } },
]

export const motion = createMotionScope('tooltip-showcase')

const Model = Schema.Struct({
  ...documentationFields,
  docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  tooltips: DocumentTooltipBlock.Model,
})

export const TooltipShowcaseKey = Symbol('TooltipShowcase')

const effects = Block.makeEffectsContract<
  never,
  Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
>()

export const TooltipShowcaseBlock = Block.make('TooltipShowcase', {
  key: TooltipShowcaseKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message: Schema.Never,
  InMessage: defineInMessageUnion(documentationInMessages),
  view: { kind: 'Element' },
  effects,
})

const Tooltips = TooltipShowcaseBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: TooltipShowcaseBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: () => TooltipShowcaseBlock.makeNoopStep(),
  }),
})

export const DocTabs = TooltipShowcaseBlock.makeRecordBinding(PreviewControlsBlock, {
  field: 'docTabs',
})
const initDocTabs = ['Basic', 'Placement', 'Rich Content', 'Follow cursor', 'Delay'].map((key) =>
  TooltipShowcaseBlock.makeStep((model) =>
    initAndInsert(DocTabs, model, {
      key,
      args: [
        {
          id: previewCodeTabId('tooltip', key),
          idPrefix: previewCodeTabId('tooltip', key),
          selectedIndex: 0,
        },
      ],
    }),
  ),
)
const TooltipShowcaseComposition = TooltipShowcaseBlock.makeComposition({
  bindings: [DocTabs, Tooltips],
})

const init = TooltipShowcaseComposition.makeInit(() => ({
  model: { ...documentationDefaults, docTabs: {} },
  steps: [
    ...initDocTabs,
    ...cases.map(({ key, options }) =>
      Tooltips.requestAdd(
        options === undefined
          ? { key: `docs-tooltip-${key}` }
          : { key: `docs-tooltip-${key}`, options },
      ),
    ),
  ],
}))

const update = TooltipShowcaseComposition.makeUpdate({})
const inMessageUpdate = TooltipShowcaseComposition.makeInMessageUpdate({
  InformedOfDocumentation: TooltipShowcaseBlock.makeStep(
    (model, { embedded, shape, size, hoverMode }) =>
      Update.combineSteps([
        TooltipShowcaseBlock.makeFieldsStep(() => ({
          isDocEmbedded: () => embedded,
          docShape: () => shape,
          docSize: () => size,
          docHover: () => hoverMode,
        })),
        ...Object.entries(model.docTabs).flatMap(([key, child]) =>
          controlsHoverModeOf(child) === hoverMode
            ? []
            : [DocTabs.requestHoverMode(key, { mode: hoverMode })],
        ),
      ]),
  ),
})

const view = TooltipShowcaseComposition.makeView((model, h) => {
  const appearance = { shape: model.docShape, size: model.docSize, hoverMode: model.docHover }
  const documentationTabs = (key: string) => {
    const child = model.docTabs[key]
    return child === undefined
      ? h.empty
      : h.block(
          DocTabs.embedView({
            key,
            slotId: child.tabs.id,
            model: child,
            viewInputs: previewCodeTabsViewInputs(h, {
              ...appearance,
              animate: motion.node,
              ariaLabel: `${key} example`,
            }),
          }),
        )
  }
  const section = (
    title: string,
    children: ReadonlyArray<ReturnType<typeof h.div>>,
    className = 'flex items-center gap-3',
  ) =>
    docSection(h, {
      title,
      children,
      source,
      presentation: appearance,
      className,
      pane: model.docTabs[title]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
      tabs: documentationTabs(title),
      tabsId: previewCodeTabId('tooltip', title),
    })
  return h.block(
    Tooltips.embedView({
      slotId: 'tooltips',
      model: model.tooltips,
      viewInputs: {
        renderTrigger: (id, { button, div }) => {
          const key = id.replace(/^docs-tooltip-/, '')
          const item = cases.find((entry) => entry.key === key)

          if (!item) {
            throw new Error(`Unknown Tooltip example ${key}`)
          }

          if (key === 'follow-x' || key === 'follow-y') {
            return div(
              childAttributes([
                h.Class(
                  key === 'follow-x'
                    ? 'flex h-12 w-64 cursor-default items-center justify-center rounded-lg border border-border text-[12px] text-muted-foreground'
                    : 'flex h-40 w-12 cursor-default items-center justify-center rounded-lg border border-border text-[12px] text-muted-foreground',
                ),
              ]),
              [
                key === 'follow-y'
                  ? h.span([h.Class('rotate-90 whitespace-nowrap')], [item.label])
                  : item.label,
              ],
            )
          }

          return Button(
            {
              children: [item.label],
              variant: ['top', 'right', 'bottom', 'left', 'instant', 'slow'].includes(key)
                ? 'secondary'
                : 'primary',
              render: (attributes, children) =>
                button(
                  attributes.flatMap((attribute) =>
                    '__childAttribute' in attribute ? [attribute] : childAttributes([attribute]),
                  ),
                  children,
                ),
              ...appearance,
            },
            h,
          )
        },
        renderContent: (key) =>
          key.endsWith('rich')
            ? h.div(
                [h.Class('flex flex-col gap-1')],
                [
                  h.span(
                    [h.Style({ fontVariationSettings: fontWeights.semibold })],
                    ['Keyboard shortcut'],
                  ),
                  h.span([h.Class('text-muted-foreground')], ['⌘ + S']),
                ],
              )
            : h.span(
                [],
                [
                  cases.find((entry) => entry.key === key.replace(/^docs-tooltip-/, ''))?.content ??
                    '',
                ],
              ),
        render: ({ tooltip }) => {
          const item = (key: string) => {
            const options = {
              shapeClass: model.docShape === 'sharp' ? 'rounded-none' : 'rounded-lg',
              animate: motion.node,
              reducedMotion: 'user',
            } satisfies Parameters<typeof tooltip>[1]

            return tooltip(
              `docs-tooltip-${key}`,
              key === 'rich'
                ? options
                : {
                    ...options,
                    content:
                      cases.find((entry) => entry.key === key.replace(/^docs-tooltip-/, ''))
                        ?.content ?? '',
                  },
            )
          }

          return h.div(
            [
              h.Class(
                model.isDocEmbedded
                  ? ''
                  : 'max-w-200 m-[0_auto] p-[48px_24px_96px] [&_h1]:text-[28px] [&_h1]:m-[24px_0_8px] [&_h2]:text-[16px] [&_h2]:m-[32px_0_12px] [&_>_p]:[color:var(--muted-foreground)] [&_.preview]:flex [&_.preview]:justify-center [&_.preview]:items-center [&_.preview]:gap-3 [&_.preview]:min-h-40 [&_.preview]:[border:1px_solid_var(--border)] [&_.preview]:rounded-[12px]',
              ),
            ],
            [
              model.isDocEmbedded ? null : h.h1([], ['Tooltip']),
              section('Basic', [item('basic')]),
              section('Placement', ['top', 'right', 'bottom', 'left'].map(item)),
              section('Rich Content', [item('rich')]),
              section(
                'Follow cursor',
                [item('follow-x'), item('follow-y')],
                'flex flex-wrap items-center justify-center gap-6',
              ),
              section('Delay', [item('instant'), item('slow')]),
            ],
          )
        },
        renderDocument: (content, popups) => h.div([], [content, ...popups]),
        ...appearance,
      },
    }),
  )
})

export const layer = TooltipShowcaseBlock.makeLayer({ init, update, inMessageUpdate, view }).pipe(
  Layer.provide(Layer.merge(TooltipLayer, PreviewControlsLayer)),
)
