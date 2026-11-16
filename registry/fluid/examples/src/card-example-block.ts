import { fluidHoverEnabledOf } from '@foldkit-visuals/fluid/card'
import { hoverModeOf as tabsHoverModeOf } from '@foldkit-visuals/fluid/tabs'
import { Boolean } from 'effect'
import {
  TabsBlock as DocumentationTabsBlock,
  layer as DocumentationTabsLayer,
} from '@foldkit-visuals/fluid/tabs'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs'
import {
  documentationFields,
  documentationInMessages,
  documentationDefaults,
} from './documentation.js'
import { docSection } from './doc-section.js'
import source from './card-example-block.ts?raw'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { exampleHoverConfig } from './example-presentation.js'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { CardButton, CardGroupBlock, layer as CardLayer } from '@foldkit-visuals/fluid/card'
import type { CardGroupProps, CardGroupRefs } from '@foldkit-visuals/fluid/card'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import { cardRows, promoCard } from './card-example-content.js'

const documentationTabsFor = (
  models: Readonly<Record<string, typeof DocumentationTabsBlock.Model.Type>>,
  section: string,
) => {
  const child = models[section]
  if (child === undefined) throw new Error(`Missing documentation tabs ${section}`)
  return child
}
const Model = Schema.Struct({
  ...documentationFields,
  documentationTabs: Schema.Record(Schema.String, DocumentationTabsBlock.Model),
  basic: CardGroupBlock.Model,
  grid: CardGroupBlock.Model,
  outlined: CardGroupBlock.Model,
  separated: CardGroupBlock.Model,
  selection: CardGroupBlock.Model,
  selected: Schema.Natural,
  isDismissed: Schema.Boolean,
  isCompact: Schema.Boolean,
  isLastItemDisabled: Schema.Boolean,
  isFluidHoverEnabled: Schema.Boolean,
  lastAction: Schema.String,
})

const Message = defineMessageUnion({
  Selected: { index: Schema.Natural },
  ClickedAction: { label: Schema.String },
  ClickedDismiss: {},
  ClickedRestore: {},
  ClickedCompact: {},
  ClickedDisabled: {},
  ClickedFluidHover: {},
})

const FluidCardExampleKey = Symbol('FluidCardExample')

const effects = Block.makeEffectsContract<never, CardGroupRefs>()

export const FluidCardExampleBlock = Block.make('FluidCardExample', {
  key: FluidCardExampleKey,
  Model,
  Message,
  InMessage: defineInMessageUnion(documentationInMessages),
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Element' },
})

const Basic = FluidCardExampleBlock.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'basic',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'card-basic' }] },
})

const Grid = FluidCardExampleBlock.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'grid',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'card-grid' }] },
})

const Outlined = FluidCardExampleBlock.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'outlined',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'card-outlined' }] },
})

const Separated = FluidCardExampleBlock.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'separated',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'card-separated' }] },
})

const Selection = FluidCardExampleBlock.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'selection',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'card-selection' }] },
})

const RawDocumentationTabs = FluidCardExampleBlock.makeRecordBinding(DocumentationTabsBlock, {
  field: 'documentationTabs',
})
const DocumentationTabs = RawDocumentationTabs.withOutMessagePolicy({
  fold: (section) =>
    FluidCardExampleBlock.makeOutMessageFold(DocumentationTabsBlock, {
      Selected: ({ index }) =>
        RawDocumentationTabs.requestSelected(section, { selectedIndex: index }),
    }),
})
const documentationTabsHover = (mode: 'fluid' | 'standard') =>
  FluidCardExampleBlock.makeStep((model) =>
    Update.combineSteps(
      Object.entries(model.documentationTabs).flatMap(([section, child]) =>
        tabsHoverModeOf(child) === mode
          ? []
          : [DocumentationTabs.requestHoverMode(section, { mode: mode })],
      ),
    ),
  )
const initDocumentationTabs = FluidCardExampleBlock.makeStep(() =>
  Update.combineSteps(
    [
      'Basic',
      'Grid: 2-D fluid hover',
      'Outlined group',
      'Separated tiles',
      'Fully yours — compose anything',
      'Selection',
    ].map((section) =>
      FluidCardExampleBlock.makeStep((model) =>
        initAndInsert(DocumentationTabs, model, {
          key: section,
          args: [
            {
              id: previewCodeTabId('card', section),
              idPrefix: previewCodeTabId('card', section),
              selectedIndex: 0,
            },
          ],
        }),
      ),
    ),
  ),
)
const FluidCardExampleComposition = FluidCardExampleBlock.makeComposition({
  bindings: [DocumentationTabs, Basic, Grid, Outlined, Separated, Selection],
})

const init = FluidCardExampleComposition.makeInit(() => ({
  model: {
    ...documentationDefaults,
    documentationTabs: {},
    selected: 1,
    isDismissed: false,
    isCompact: false,
    isLastItemDisabled: false,
    isFluidHoverEnabled: true,
    lastAction: 'Choose a card or action',
  },
  steps: [initDocumentationTabs],
}))

const update = FluidCardExampleComposition.makeUpdate({
  Selected: FluidCardExampleBlock.makeFieldsStep((_, { index }: typeof Message.Selected.Type) => ({
    selected: () => index,
  })),
  ClickedAction: FluidCardExampleBlock.makeFieldsStep(
    (_, { label }: typeof Message.ClickedAction.Type) => ({
      lastAction: () => label,
    }),
  ),
  ClickedDismiss: FluidCardExampleBlock.makeFieldsStep(() => ({ isDismissed: () => true })),
  ClickedRestore: FluidCardExampleBlock.makeFieldsStep(() => ({ isDismissed: () => false })),
  ClickedCompact: FluidCardExampleBlock.makeFieldsStep(() => ({ isCompact: Boolean.not })),
  ClickedDisabled: FluidCardExampleBlock.makeFieldsStep(() => ({
    isLastItemDisabled: Boolean.not,
  })),
  ClickedFluidHover: FluidCardExampleBlock.makeStep((model) => {
    const enabled = !model.isFluidHoverEnabled

    return Update.combineSteps([
      FluidCardExampleBlock.makeFieldsStep(() => ({ isFluidHoverEnabled: () => enabled })),
      Basic.requestFluidHover({ enabled }),
      Grid.requestFluidHover({ enabled }),
      Outlined.requestFluidHover({ enabled }),
      Separated.requestFluidHover({ enabled }),
      Selection.requestFluidHover({ enabled }),
    ])
  }),
})

export const motion = createTargetMotionScope('fluid-card-example')

const view = FluidCardExampleComposition.makeView((model, h) => {
  const size = model.isDocEmbedded ? model.docSize : model.isCompact ? 'compact' : 'default'
  const appearance = { shape: model.docShape, size, hoverMode: model.docHover }
  const section = (title: string, content: ReturnType<typeof h.div>) =>
    docSection(h, {
      title: title === 'Selection' ? 'Selected' : title,
      children: [content],
      source,
      presentation: appearance,
      previewPadding: 'compact',
      className: 'w-full flex justify-center',
      pane: model.documentationTabs[title]?.selectedIndex === 1 ? 'code' : 'preview',
      tabsId: previewCodeTabId('card', title),
      tabs: h.block(
        DocumentationTabs.embedView({
          key: title,
          slotId: previewCodeTabId('card', title),
          model: documentationTabsFor(model.documentationTabs, title),
          viewInputs: previewCodeTabsViewInputs(h, {
            ...appearance,
            animate: motion.node,
            ariaLabel: `${title} example view`,
          }),
        }),
      ),
    })
  const animateHighlight = hoverHighlightAnimation(motion)
  const action = (label: string) => Message.ClickedAction({ label })

  const common: Pick<CardGroupProps, 'size' | 'count' | 'animateHighlight'> = {
    size,
    count: 4,
    animateHighlight,
  }

  const open = (index: number) => action(`Open card ${index + 1}`)

  return (model.isDocEmbedded ? h.div : h.main)(
    [
      h.Class(
        model.isDocEmbedded
          ? ''
          : "max-w-190 p-[32px_24px_64px] m-[0_auto] [&_h1]:text-[28px] [&_h1]:leading-[34px] [&_h1]:[font-variation-settings:'wght'_550,'opsz'_18] [&_h2]:m-[32px_0_12px] [&_h2]:text-[16px] [&_h2]:leading-[22px] [&_h2]:[font-variation-settings:'wght'_550,'opsz'_18] [&_output]:block [&_output]:min-h-5 [&_output]:m-[8px_0] [&_output]:text-[13px] [&_output]:leading-[20px]",
      ),
    ],
    [
      model.isDocEmbedded ? null : h.h1([], ['Card']),
      section(
        'Basic',
        h.div(
          [h.Class('w-full max-w-[520px]')],
          [
            h.block(
              Basic.embedView({
                slotId: model.basic.id,
                model: model.basic,
                viewInputs: {
                  ...common,
                  orientation: 'inline',
                  children: (group) =>
                    cardRows(
                      {
                        group,
                        media: 'icon',
                        actions: 'ghost',
                        selectedIndex: -1,
                        disabledLast: model.isLastItemDisabled,
                        selected: open,
                        action,
                      },
                      h,
                    ),
                  ...appearance,
                },
              }),
            ),
          ],
        ),
      ),
      section(
        'Grid: 2-D fluid hover',
        h.div(
          [h.Class('w-full max-w-[560px]')],
          [
            h.block(
              Grid.embedView({
                slotId: model.grid.id,
                model: model.grid,
                viewInputs: {
                  ...common,
                  columns: 2,
                  border: 'outlined',
                  separated: true,
                  children: (group) =>
                    cardRows(
                      {
                        group,
                        media: 'image',
                        actions: 'pair',
                        selectedIndex: -1,
                        disabledLast: model.isLastItemDisabled,
                        selected: open,
                        action,
                      },
                      h,
                    ),
                  ...appearance,
                },
              }),
            ),
          ],
        ),
      ),
      section(
        'Outlined group',
        h.div(
          [h.Class('w-full max-w-[520px]')],
          [
            h.block(
              Outlined.embedView({
                slotId: model.outlined.id,
                model: model.outlined,
                viewInputs: {
                  ...common,
                  orientation: 'inline',
                  border: 'outlined',
                  children: (group) =>
                    cardRows(
                      {
                        group,
                        media: 'logo',
                        actions: 'primary',
                        selectedIndex: -1,
                        disabledLast: model.isLastItemDisabled,
                        selected: open,
                        action,
                      },
                      h,
                    ),
                  ...appearance,
                },
              }),
            ),
          ],
        ),
      ),
      section(
        'Separated tiles',
        h.div(
          [h.Class('w-full max-w-[560px]')],
          [
            h.block(
              Separated.embedView({
                slotId: model.separated.id,
                model: model.separated,
                viewInputs: {
                  ...common,
                  orientation: 'inline',
                  separated: true,
                  children: (group) =>
                    cardRows(
                      {
                        group,
                        media: 'image',
                        actions: 'all',
                        selectedIndex: -1,
                        disabledLast: model.isLastItemDisabled,
                        selected: open,
                        action,
                      },
                      h,
                    ),
                  ...appearance,
                },
              }),
            ),
          ],
        ),
      ),
      section(
        'Fully yours — compose anything',
        h.div(
          [h.Class('w-full max-w-[300px]')],
          [
            model.isDismissed
              ? CardButton(
                  { ...appearance, onClick: Message.ClickedRestore(), children: ['Restore card'] },
                  h,
                )
              : promoCard({ ...appearance, dismiss: Message.ClickedDismiss(), action }, h),
          ],
        ),
      ),
      section(
        'Selection',
        h.div(
          [h.Class('w-full max-w-[520px]')],
          [
            h.block(
              Selection.embedView({
                slotId: model.selection.id,
                model: model.selection,
                viewInputs: {
                  ...common,
                  orientation: 'inline',
                  selectedIndex: model.selected,
                  children: (group) =>
                    cardRows(
                      {
                        group,
                        media: 'icon',
                        actions: 'none',
                        selectedIndex: model.selected,
                        disabledLast: model.isLastItemDisabled,
                        selected: (index) => Message.Selected({ index }),
                        action,
                      },
                      h,
                    ),
                  ...appearance,
                },
              }),
            ),
          ],
        ),
      ),
    ],
  )
})

const inMessageUpdate = FluidCardExampleComposition.makeInMessageUpdate({
  InformedOfDocumentation: FluidCardExampleBlock.makeStep(
    (model, { embedded, shape, size, hoverMode }) =>
      Update.combineSteps([
        documentationTabsHover(hoverMode),
        FluidCardExampleBlock.makeFieldsStep(() => ({
          isDocEmbedded: () => embedded,
          docShape: () => shape,
          docSize: () => size,
          docHover: () => hoverMode,
        })),

        FluidCardExampleBlock.makeStep((current) =>
          fluidHoverEnabledOf(current.basic) === (hoverMode === 'fluid')
            ? { model: current }
            : Basic.requestFluidHover({ enabled: hoverMode === 'fluid' }),
        ),
        FluidCardExampleBlock.makeStep((current) =>
          fluidHoverEnabledOf(current.grid) === (hoverMode === 'fluid')
            ? { model: current }
            : Grid.requestFluidHover({ enabled: hoverMode === 'fluid' }),
        ),
        FluidCardExampleBlock.makeStep((current) =>
          fluidHoverEnabledOf(current.outlined) === (hoverMode === 'fluid')
            ? { model: current }
            : Outlined.requestFluidHover({ enabled: hoverMode === 'fluid' }),
        ),
        FluidCardExampleBlock.makeStep((current) =>
          fluidHoverEnabledOf(current.separated) === (hoverMode === 'fluid')
            ? { model: current }
            : Separated.requestFluidHover({ enabled: hoverMode === 'fluid' }),
        ),
        FluidCardExampleBlock.makeStep((current) =>
          fluidHoverEnabledOf(current.selection) === (hoverMode === 'fluid')
            ? { model: current }
            : Selection.requestFluidHover({ enabled: hoverMode === 'fluid' }),
        ),
      ]),
  ),
})
export const layer = FluidCardExampleBlock.makeLayer({ init, update, inMessageUpdate, view }).pipe(
  Layer.provide(Layer.merge(CardLayer, DocumentationTabsLayer)),
)
