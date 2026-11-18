import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import { hoverModeOf as tableHoverModeOf } from '@foldkit-visuals/fluid/table'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
/* @license Table examples derived from Fluid Functionalism cc276ca0. MIT. */
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion } from 'foldkit/message'
import { Button } from '@foldkit-visuals/fluid/button'
import { TableBlock, layer as TableLayer } from '@foldkit-visuals/fluid/table'
import {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@foldkit-visuals/fluid/table-parts'
import {
  FluidCardExampleBlock,
  layer as CardLayer,
} from '../../../registry/fluid/examples/src/card-example-block'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { AuthoredCarouselBlock, layer as CarouselLayer } from './authored-carousel'
import { highlight, target } from '../motion'
import { ComponentPresentation, presentation } from '../settings'
import source from './authored-surfaces.ts?raw'
const documentationTabsFor = (
  models: Readonly<Record<string, typeof PreviewControlsBlock.Model.Type>>,
  section: string,
) => {
  const child = models[section]
  if (child === undefined) throw new Error(`Missing documentation tabs ${section}`)
  return child
}
const key = Symbol('AuthoredSurfaces')
export const AuthoredSurfacesBlock = Block.make('AuthoredSurfaces', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    card: FluidCardExampleBlock.Model,
    carousel: AuthoredCarouselBlock.Model,
    table: TableBlock.Model,
    empty: TableBlock.Model,
    documentationTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof FluidCardExampleBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredCarouselBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly slug: string
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredSurfacesBlock
const Card = Root.makeRequiredFieldBinding(FluidCardExampleBlock, { field: 'card' })
const Carousel = Root.makeRequiredFieldBinding(AuthoredCarouselBlock, { field: 'carousel' })
const Table = Root.makeRequiredFieldBinding(TableBlock, {
  field: 'table',
  init: { contextToArgs: () => [{ id: 'docs-table-basic' }] },
})
const Empty = Root.makeRequiredFieldBinding(TableBlock, {
  field: 'empty',
  init: { contextToArgs: () => [{ id: 'docs-table-empty' }] },
})
const DocumentationTabs = Root.makeRecordBinding(PreviewControlsBlock, {
  field: 'documentationTabs',
})
const documentationTabsHover = (mode: 'fluid' | 'standard') =>
  Root.makeStep((model) =>
    Update.combineSteps(
      Object.entries(model.documentationTabs).flatMap(([section, child]) =>
        tabsHoverModeOf(child) === mode
          ? []
          : [DocumentationTabs.requestHoverMode(section, { mode: mode })],
      ),
    ),
  )
const initDocumentationTabs = Root.makeStep(() =>
  Update.combineSteps(
    ['Basic', 'Empty'].map((section) =>
      Root.makeStep((model) =>
        initAndInsert(DocumentationTabs, model, {
          key: section,
          args: [
            {
              id: previewCodeTabId('table', section),
              idPrefix: previewCodeTabId('table', section),
              selectedIndex: 0,
            },
          ],
        }),
      ),
    ),
  ),
)
const Composition = Root.makeComposition({
  bindings: [DocumentationTabs, Card, Carousel, Table, Empty],
})
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { documentationTabs: {} },
    steps: [initDocumentationTabs],
  })),
  update: Composition.makeUpdate({}),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        documentationTabsHover(settings.hover),
        Card.informOfDocumentation({
          embedded: true,
          shape: settings.shape,
          size: settings.size,
          hoverMode: settings.hover,
        }),
        Carousel.informOfPresentation({ presentation: settings }),
        ...(tableHoverModeOf(model.table) === settings.hover
          ? []
          : [Table.requestHoverMode({ mode: settings.hover })]),
        ...(tableHoverModeOf(model.empty) === settings.hover
          ? []
          : [Empty.requestHoverMode({ mode: settings.hover })]),
      ]),
    ),
  }),
  view: Composition.makeView.withInputs((model, inputs, h) => {
    if (!inputs.ready) return h.empty
    if (inputs.slug === 'card')
      return h.block(Card.embedView({ slotId: 'authored-cards', model: model.card }))
    if (inputs.slug === 'carousel-dots')
      return h.block(
        Carousel.embedView({
          slotId: 'authored-carousel',
          model: model.carousel,
          viewInputs: inputs,
        }),
      )
    if (inputs.slug !== 'table') return h.empty
    const context = presentation(inputs.settings)
    const header = () =>
      TableHeader(
        {
          children: [
            TableRow(
              {
                children: ['Name', 'Role', 'Status'].map((label) =>
                  TableHead({ context, children: [label] }, h),
                ),
              },
              h,
            ),
          ],
        },
        h,
      )
    return h.div(
      [],
      ['Basic', 'Empty'].map((title) =>
        docSection(h, {
          title,
          source,
          presentation: { context },
          className: 'w-full',
          pane: model.documentationTabs[title]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
          tabsId: previewCodeTabId('table', title),
          tabs: h.block(
            DocumentationTabs.embedView({
              key: title,
              slotId: previewCodeTabId('table', title),
              model: documentationTabsFor(model.documentationTabs, title),
              viewInputs: previewCodeTabsViewInputs(h, {
                context,
                animate: target.node,
                ariaLabel: `${title} example view`,
              }),
            }),
          ),
          children: [
            title === 'Basic'
              ? h.block(
                  Table.embedView({
                    slotId: model.table.id,
                    model: model.table,
                    viewInputs: {
                      context,
                      animateHighlight: highlight,
                      content: (table) => [
                        header(),
                        TableBody(
                          {
                            children: [
                              ['Alice', 'Engineer', 'Active'],
                              ['Bob', 'Designer', 'Away'],
                              ['Carol', 'Manager', 'Active'],
                            ].map((row, index) =>
                              TableRow(
                                {
                                  context: table,
                                  index,
                                  children: row.map((value) =>
                                    TableCell({ context, children: [value] }, h),
                                  ),
                                },
                                h,
                              ),
                            ),
                          },
                          h,
                        ),
                      ],
                    },
                  }),
                )
              : h.block(
                  Empty.embedView({
                    slotId: model.empty.id,
                    model: model.empty,
                    viewInputs: {
                      context,
                      animateHighlight: highlight,
                      content: () => [
                        header(),
                        TableBody(
                          {
                            children: [
                              TableEmpty(
                                {
                                  columns: 3,
                                  title: 'No members yet',
                                  description: 'People you invite show up here.',
                                  action: Button(
                                    {
                                      context,
                                      variant: 'secondary',
                                      buttonSize: 'compact',
                                      children: ['Invite people'],
                                    },
                                    h,
                                  ),
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
                ),
          ],
        }),
      ),
    )
  }),
}).pipe(Layer.provide(Layer.mergeAll(CardLayer, CarouselLayer, TableLayer, PreviewControlsLayer)))
