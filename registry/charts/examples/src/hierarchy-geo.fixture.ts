import { Button } from '@foldkit/ui'
import { modifyFields } from 'foldkit/struct'
import { Layer, Schema } from 'effect'
import {
  hierarchyData,
  flowData,
  geographyData,
  exampleTransition,
  controlledNode,
  showLifecycleControls,
  showTooltipControls,
  showCallbackControls,
  renamedFlowData,
} from './hierarchy-geo-data'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  SunburstChart,
  buildArcs,
  SunburstSegment,
  SunburstCenter,
  SunburstLabels,
  SunburstHint,
  SunburstBreadcrumb,
  useSunburstBreadcrumbItems,
} from '@foldkit-visuals/charts/sunburst'
import type { SunburstChartProps } from '@foldkit-visuals/charts/sunburst'
import { SankeyChart, SankeyNode, SankeyLink, SankeyTooltip } from '@foldkit-visuals/charts/sankey'
import type { SankeyChartProps } from '@foldkit-visuals/charts/sankey'
import {
  ChoroplethChart,
  ChoroplethFeatureComponent,
  ChoroplethGraticule,
  ChoroplethTooltip,
} from '@foldkit-visuals/charts/choropleth'
import type { ChoroplethChartProps } from '@foldkit-visuals/charts/choropleth'
export const sunburst = SunburstChart({ name: 'hierarchy-geo-sunburst' })
export const sankey = SankeyChart({ name: 'hierarchy-geo-sankey' })
export const choropleth = ChoroplethChart({ name: 'hierarchy-geo-map' })
export const SunburstKey = Symbol('HierarchySunburst')
export const SankeyKey = Symbol('HierarchySankey')
export const ChoroplethKey = Symbol('HierarchyChoropleth')
export const SunburstBlock = Block.make(sunburst.namespace, {
  ...sunburst.contract,
  key: SunburstKey,
})
export const SankeyBlock = Block.make(sankey.namespace, { ...sankey.contract, key: SankeyKey })
export const ChoroplethBlock = Block.make(choropleth.namespace, {
  ...choropleth.contract,
  key: ChoroplethKey,
})
const chartLayers = Layer.mergeAll(
  SunburstBlock.makeLayer(sunburst.plans<typeof SunburstKey>(SunburstBlock)),
  SankeyBlock.makeLayer(sankey.plans<typeof SankeyKey>(SankeyBlock)),
  ChoroplethBlock.makeLayer(choropleth.plans<typeof ChoroplethKey>(ChoroplethBlock)),
)
export const sunburstProps: SunburstChartProps = {
  data: hierarchyData,
  ...(exampleTransition === undefined ? {} : { enterTransition: exampleTransition }),
  size: 440,
  children: [
    ...buildArcs(hierarchyData).arcs.map((arc) => SunburstSegment({ index: arc.arcIndex })),
    SunburstCenter(),
    SunburstLabels(),
    SunburstHint(),
  ],
}
export const sankeyProps: SankeyChartProps = {
  data: flowData,
  ...(controlledNode === undefined ? {} : { hoveredNodeIndex: controlledNode }),
  ...(exampleTransition === undefined ? {} : { enterTransition: exampleTransition }),
  margin: { left: 80, right: 80 },
  children: [SankeyNode(), SankeyLink(), SankeyTooltip()],
}
export const choroplethProps: ChoroplethChartProps = {
  data: geographyData,
  ...(exampleTransition === undefined ? {} : { enterTransition: exampleTransition }),
  scale: 230,
  center: [0, 0],
  zoomEnabled: true,
  children: [
    ChoroplethFeatureComponent(),
    ChoroplethGraticule({ stroke: 'var(--border)' }),
    ChoroplethTooltip({ getFeatureValue: (feature) => Number(feature.properties?.value) }),
  ],
}
const alternateSunburst: SunburstChartProps = {
  ...sunburstProps,
  children: [
    SunburstCenter(),
    SunburstLabels({ fontSize: 13, strokeWidth: 0 }),
    SunburstHint(),
    ...buildArcs(hierarchyData).arcs.map((arc) =>
      SunburstSegment({
        index: arc.arcIndex,
        ...(arc.arcIndex === 1 ? { fill: 'purple', fillOpacity: 0.6 } : {}),
      }),
    ),
  ],
}
const alternateSankey: SankeyChartProps = {
  ...sankeyProps,
  nodeWidth: 24,
  nodePadding: 12,
  children: [
    SankeyNode({ labelOrientation: 'vertical' }),
    SankeyLink({ useGradient: false, stroke: 'purple' }),
    SankeyTooltip({ formatValue: (value) => `$${value}` }),
  ],
}
const alternateChoropleth: ChoroplethChartProps = {
  ...choroplethProps,
  center: [20, 10],
  scale: 160,
  children: [
    ChoroplethFeatureComponent({ fill: 'purple', stroke: 'orange', strokeWidth: 2 }),
    ChoroplethGraticule({ step: [20, 20], stroke: 'var(--border)' }),
    ChoroplethTooltip({ getFeatureValue: () => 24 }),
  ],
}
const Model = Schema.Struct({
  sunburst: SunburstBlock.Model,
  sankey: SankeyBlock.Model,
  choropleth: ChoroplethBlock.Model,
  isAlternate: Schema.Boolean,
  isVisible: Schema.Boolean,
  isRenamed: Schema.Boolean,
  isFaster: Schema.Boolean,
  nodeRequests: Schema.Array(Schema.NullOr(Schema.Int)),
})
const Message = defineMessageUnion({
  ClickedChange: {},
  ClickedToggle: {},
  FocusedNode: { index: Schema.NullOr(Schema.Int) },
  FocusedLink: { index: Schema.NullOr(Schema.Int) },
  ClickedSelectNode: {},
  ClickedSelectLink: {},
  ZoomedSunburst: { id: Schema.NullOr(Schema.String) },
  HoveredSunburst: { index: Schema.NullOr(Schema.Int) },
  HoveredMap: { index: Schema.NullOr(Schema.Int) },
  TransformedMap: { scale: Schema.Finite, x: Schema.Finite, y: Schema.Finite },
  ClickedReplay: {},
  ClickedRename: {},
  ClickedDurationChanged: {},
  ClickedTooltipRequested: {
    kind: Schema.Literals(['node', 'link', 'none']),
    index: Schema.NullOr(Schema.Int),
    anchor: Schema.optional(Schema.NullOr(Schema.Struct({ x: Schema.Finite, y: Schema.Finite }))),
  },
  ClickedNodeRequestsCleared: {},
  ClickedNodeBatchRequested: {},
})
export const HierarchyGeoFixtureKey = Symbol('HierarchyGeoFixture')
export const HierarchyGeoFixtureBlock = Block.make('HierarchyGeoFixture', {
  key: HierarchyGeoFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
export const SunburstBinding = HierarchyGeoFixtureBlock.makeRequiredFieldBinding(SunburstBlock, {
  field: 'sunburst',
  init: { contextToArgs: () => ['sunburst'] },
}).withOutMessagePolicy({
  fold: HierarchyGeoFixtureBlock.makeOutMessageFold(SunburstBlock, {
    FocusChanged: HierarchyGeoFixtureBlock.makeNoopStep,
    HoverChanged: HierarchyGeoFixtureBlock.makeNoopStep,
  }),
})
export const SankeyBinding = HierarchyGeoFixtureBlock.makeRequiredFieldBinding(SankeyBlock, {
  field: 'sankey',
  init: { contextToArgs: () => ['sankey'] },
}).withOutMessagePolicy({
  fold: HierarchyGeoFixtureBlock.makeOutMessageFold(SankeyBlock, {
    NodeHoverChanged: HierarchyGeoFixtureBlock.makeNoopStep,
    NodeHoverRequested: ({ index }) =>
      HierarchyGeoFixtureBlock.makeFieldsStep(() => ({
        nodeRequests: (nodeRequests) => [...nodeRequests, index],
      })),
  }),
})
export const ChoroplethBinding = HierarchyGeoFixtureBlock.makeRequiredFieldBinding(
  ChoroplethBlock,
  {
    field: 'choropleth',
    init: { contextToArgs: () => ['choropleth', choropleth.configuration(choroplethProps)] },
  },
)
const HierarchyGeoFixtureComposition = HierarchyGeoFixtureBlock.makeComposition({
  bindings: [SunburstBinding, SankeyBinding, ChoroplethBinding],
})
export const hierarchyGeoLayer = HierarchyGeoFixtureBlock.makeLayer({
  init: HierarchyGeoFixtureComposition.makeInit(() => ({
    model: {
      isAlternate: false,
      isVisible: true,
      isRenamed: false,
      isFaster: false,
      nodeRequests: [],
    },
  })),
  update: HierarchyGeoFixtureComposition.makeUpdate({
    ClickedChange: (m) => ({ model: { ...m, isAlternate: !m.isAlternate } }),
    ClickedToggle: (m) => ({ model: { ...m, isVisible: !m.isVisible } }),
    ClickedRename: (m) => ({ model: { ...m, isRenamed: !m.isRenamed } }),
    ClickedDurationChanged: (m) => ({ model: { ...m, isFaster: !m.isFaster } }),
    ClickedNodeRequestsCleared: (model) => ({
      model: modifyFields(model, { nodeRequests: () => [] }),
    }),
    ClickedNodeBatchRequested: (model) =>
      Update.combineSteps(
        [0, 0, 1, null].map((index) => SankeyBinding.requestFocus({ kind: 'node', index })),
      )(model),
    ClickedTooltipRequested: (model, { kind, index, anchor }) =>
      SankeyBinding.requestTooltip({ kind, index, ...(anchor === undefined ? {} : { anchor }) })(
        model,
      ),
    FocusedNode: (model, { index }) => SankeyBinding.requestFocus({ kind: 'node', index })(model),
    FocusedLink: (model, { index }) => SankeyBinding.requestFocus({ kind: 'link', index })(model),
    ClickedSelectNode: (model) =>
      Update.combineSteps([
        SankeyBinding.requestFocus({ kind: 'link', index: null }),
        SankeyBinding.requestFocus({ kind: 'node', index: 1 }),
      ])(model),
    ClickedSelectLink: (model) =>
      Update.combineSteps([
        SankeyBinding.requestFocus({ kind: 'node', index: null }),
        SankeyBinding.requestFocus({ kind: 'link', index: 0 }),
      ])(model),
    ZoomedSunburst: (model, { id }) => SunburstBinding.requestFocus({ id })(model),
    HoveredSunburst: (model, { index }) => SunburstBinding.requestHover({ index })(model),
    HoveredMap: (model, { index }) => ChoroplethBinding.requestHover({ index })(model),
    TransformedMap: (model, { scale, x, y }) =>
      ChoroplethBinding.requestTransform({ scale, x, y })(model),
    ClickedReplay: (m) =>
      Update.combineSteps([
        SunburstBinding.requestRevision({ revision: m.sunburst.revision + 1 }),
        SankeyBinding.requestRevision({ revision: m.sankey.revision + 1 }),
        ChoroplethBinding.requestRevision({ revision: m.choropleth.revision + 1 }),
      ])(m),
  }),
  view: HierarchyGeoFixtureComposition.makeView((m, h) => {
    const sb = m.isAlternate ? alternateSunburst : sunburstProps,
      sk = m.isAlternate ? alternateSankey : sankeyProps,
      ch = m.isAlternate ? alternateChoropleth : choroplethProps
    const actions = {
      focus: (id: string | null) => Message.ZoomedSunburst({ id }),
      hover: (index: number | null) => Message.HoveredSunburst({ index }),
    }
    const stable = sunburst.context<typeof Message.Type>(sb, m.sunburst, actions).stable,
      crumbs = useSunburstBreadcrumbItems(stable)
    const props = {
      ...sb,
      playKey: m.sunburst.revision,
      children: [
        ...sb.children,
        SunburstBreadcrumb({
          children: h.div(
            [],
            crumbs.items.map((item) =>
              Button.view(
                {
                  onClick: crumbs.zoomTo(item.id),
                  toView: (attributes) =>
                    h.button([...attributes.button, h.Disabled(item.isCurrent)], [item.label]),
                },
                h,
              ),
            ),
          ),
        }),
      ],
    }
    return {
      title: 'Hierarchy, flow and geography',
      body: h.div(
        [
          h.Class(
            [
              '[width:630px] [margin:0_auto]',
              'hierarchy-example [&_button]:[appearance:auto] [&_button]:[background:#efefef] [&_button]:[border:1px_solid_#777] [&_button]:[border-radius:2px] [&_button]:[color:inherit] [&_button]:cursor-pointer [&_button]:[font:inherit] [&_button]:[line-height:20px] [&_button]:[padding:6px_10px] [&_button:disabled]:[color:#999] [&_button:disabled]:[border-color:#ccc] [&_button:disabled]:cursor-default [&_nav]:flex-wrap [&_nav]:flex [&_nav]:[gap:8px] [&_nav]:[margin-bottom:16px]',
            ]
              .filter(Boolean)
              .join(' '),
          ),
        ],
        [
          h.nav(
            [],
            [
              Button.view(
                {
                  onClick: Message.ClickedChange(),
                  toView: (attributes) => h.button([...attributes.button], ['Change options']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedToggle(),
                  toView: (attributes) => h.button([...attributes.button], ['Toggle mount']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedSelectNode(),
                  toView: (attributes) => h.button([...attributes.button], ['Focus node']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedSelectLink(),
                  toView: (attributes) => h.button([...attributes.button], ['Focus link']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedReplay(),
                  toView: (attributes) => h.button([...attributes.button], ['Replay']),
                },
                h,
              ),
              ...(showLifecycleControls
                ? [
                    Button.view(
                      {
                        onClick: Message.ClickedRename(),
                        toView: (attributes) => h.button([...attributes.button], ['Rename source']),
                      },
                      h,
                    ),
                    Button.view(
                      {
                        onClick: Message.ClickedDurationChanged(),
                        toView: (attributes) =>
                          h.button([...attributes.button], ['Change duration']),
                      },
                      h,
                    ),
                  ]
                : []),
              ...(showTooltipControls
                ? [
                    Button.view(
                      {
                        onClick: Message.ClickedTooltipRequested({
                          kind: 'node',
                          index: 0,
                          anchor: { x: 100, y: 80 },
                        }),
                        toView: (attributes) =>
                          h.button([...attributes.button], ['Custom node tooltip']),
                      },
                      h,
                    ),
                    Button.view(
                      {
                        onClick: Message.ClickedTooltipRequested({
                          kind: 'node',
                          index: 0,
                          anchor: { x: 220, y: 160 },
                        }),
                        toView: (attributes) => h.button([...attributes.button], ['Move tooltip']),
                      },
                      h,
                    ),
                    Button.view(
                      {
                        onClick: Message.ClickedTooltipRequested({
                          kind: 'link',
                          index: 0,
                          anchor: { x: 130, y: 100 },
                        }),
                        toView: (attributes) =>
                          h.button([...attributes.button], ['Custom link tooltip']),
                      },
                      h,
                    ),
                    Button.view(
                      {
                        onClick: Message.ClickedTooltipRequested({ kind: 'none', index: null }),
                        toView: (attributes) => h.button([...attributes.button], ['Clear tooltip']),
                      },
                      h,
                    ),
                  ]
                : []),
              ...(showCallbackControls
                ? [
                    Button.view(
                      {
                        onClick: Message.ClickedNodeRequestsCleared(),
                        toView: (attributes) =>
                          h.button([...attributes.button], ['Clear requests']),
                      },
                      h,
                    ),
                    Button.view(
                      {
                        onClick: Message.ClickedNodeBatchRequested(),
                        toView: (attributes) =>
                          h.button([...attributes.button], ['Request node batch']),
                      },
                      h,
                    ),
                    h.output([h.Id('node-requests')], [JSON.stringify(m.nodeRequests)]),
                  ]
                : []),
            ],
          ),
          ...(m.isVisible
            ? [
                h.section(
                  [h.Id('sunburst-fixture')],
                  [
                    h.block(
                      SunburstBinding.embedView({
                        slotId: 'sunburst',
                        model: m.sunburst,
                        viewInputs: sunburst.inputs('sunburst', props, actions),
                      }),
                    ),
                  ],
                ),
                h.section(
                  [h.Id('sankey-fixture')],
                  [
                    h.block(
                      SankeyBinding.embedView({
                        slotId: 'sankey',
                        model: m.sankey,
                        viewInputs: sankey.inputs<typeof Message.Type>(
                          'sankey',
                          {
                            ...sk,
                            data: m.isRenamed ? renamedFlowData : flowData,
                            animationDuration: m.isFaster ? 600 : 1100,
                            revealSignature: String(m.sankey.revision),
                            ...(showTooltipControls
                              ? {
                                  children: [
                                    SankeyNode(),
                                    SankeyLink(),
                                    SankeyTooltip({
                                      nodeContent: ({ node }) =>
                                        h.div(
                                          [],
                                          [
                                            `${node.name}: ${String(node.category)} / ${node.value} / ${node.sourceLinks?.length} outgoing`,
                                          ],
                                        ),
                                      linkContent: ({ link }) =>
                                        h.div([], [`Custom flow: ${link.value}`]),
                                    }),
                                  ],
                                }
                              : {}),
                          },
                          {
                            focusNode: (index) => Message.FocusedNode({ index }),
                            focusLink: (index) => Message.FocusedLink({ index }),
                            tooltip: Message.ClickedTooltipRequested,
                          },
                        ),
                      }),
                    ),
                  ],
                ),
                h.section(
                  [h.Id('choropleth-fixture')],
                  [
                    h.block(
                      ChoroplethBinding.embedView({
                        slotId: 'choropleth',
                        model: m.choropleth,
                        viewInputs: choropleth.inputs<typeof Message.Type>(
                          'choropleth',
                          { ...ch, revealSignature: String(m.choropleth.revision) },
                          {
                            hover: (index) => Message.HoveredMap({ index }),
                            transform: (scale, x, y) => Message.TransformedMap({ scale, x, y }),
                          },
                        ),
                      }),
                    ),
                  ],
                ),
              ]
            : []),
        ],
      ),
    }
  }),
}).pipe(Layer.provide(chartLayers))
