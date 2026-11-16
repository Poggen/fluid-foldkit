import type { ChartTooltipExtension } from '@tanstack/charts/tooltip'
import { Block } from 'foldkit'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ChartStyle } from './content-types'
import type { ChartPoint, ChartValue, DomChartDefinition } from '@tanstack/charts'
import type { TimeSeriesProps } from './root-options'
import type { ChartContextCapabilities } from './chart-context'
import type { CartesianSnapshot } from './definition'
import type { CartesianMotionOptions } from './motion-renderer'
import type { CartesianResource, CartesianResourceInputs } from './native-resource'
import { chartRows } from './data-boundary'
import type { ChartRowSchema } from './data-boundary'
import { ChartViewport } from './viewport'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { Configuration, InteractionFields, BrushRange, Selection, Domains } from './state'
import type { Interaction } from './state'
import {
  FocusObservation,
  KeyboardObservation,
  DragObservation,
  SweepObservation,
  PhaseTimingObservation,
} from './observations'

export type CartesianViewInputs<
  Row,
  SceneDatum = Row,
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
  Snapshot = CartesianSnapshot<Row>,
  ResourceOptions = TimeSeriesProps<Row>,
> = {
  readonly tooltip?: { readonly id: string; readonly horizontalBars: boolean }
  readonly familyRoot?: {
    readonly className: string
    readonly style: ChartStyle
  }
  readonly fontMetricsCoverage?: 'complete' | 'unknown'
  readonly definitionRevision: symbol
  readonly sourceOf: (datum: SceneDatum) => Row
  readonly pointerIndexAt?: (point: { readonly x: number; readonly y: number }) => number | null
  readonly pointIndexOf?: (point: ChartPoint<SceneDatum, XValue, YValue>) => number | undefined
  readonly seriesIndexOf?: (datum: SceneDatum) => number
  readonly motion?: CartesianMotionOptions
  readonly rebuildOnClock?: boolean
  readonly renderContent?: (
    data: ReadonlyArray<Row>,
    index: number | null,
    state: Interaction,
  ) => Html
  readonly serverContent?: (
    data: ReadonlyArray<Row>,
    state: Interaction,
    focusedIndex?: number | null,
  ) => Html
  readonly definition: (
    data: ReadonlyArray<Row>,
    tooltipExtension?: ChartTooltipExtension,
  ) => DomChartDefinition<SceneDatum, XValue, YValue>
  readonly resourceDefinition?: CartesianResourceInputs<
    Row,
    SceneDatum,
    XValue,
    YValue,
    Snapshot,
    ResourceOptions
  >['definition']
  readonly resources?: Html
  readonly observeContainer?: (element: HTMLDivElement | null) => undefined
  readonly renderContext?: <Message, Mounts>(
    h: HtmlBuilder<Message, Mounts>,
    data: ReadonlyArray<Row>,
    index: number | null,
    state: Interaction,
    capabilities: ChartContextCapabilities<Row, Message>,
    isClient: boolean,
  ) => Html
  readonly ariaLabel: string
  readonly ariaDescription?: string
  readonly className?: string
  readonly width?: number
  readonly fillHeight?: boolean
  readonly height?: number
  readonly aspectRatio?: number
} & (
  | { readonly createResource?: never; readonly configureResource?: never }
  | {
      readonly createResource: CartesianResourceInputs<
        Row,
        SceneDatum,
        XValue,
        YValue,
        Snapshot,
        ResourceOptions
      >['create']
      readonly configureResource: (
        resource: CartesianResource<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>,
      ) => boolean
    }
)

export function cartesianContracts<
  RowSchema extends ChartRowSchema,
  SceneDatum = RowSchema['Type'],
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
  Snapshot = CartesianSnapshot<RowSchema['Type']>,
  ResourceOptions = TimeSeriesProps<RowSchema['Type']>,
>(Row: RowSchema) {
  type Datum = RowSchema['Type']

  const Rows = chartRows(Row)

  const Model = Schema.Struct({
    id: Schema.String,
    isMounted: Schema.Boolean,
    ...InteractionFields,
    data: Rows,
    focusedIndex: Schema.Option(Schema.Int),
    focusedSeriesIndex: Schema.Option(Schema.Int),
    focusSource: Schema.Literals(['pointer', 'keyboard', 'programmatic']),
  })

  const Message = defineMessageUnion({
    ObservedDrag: DragObservation.fields,
    ObservedSweepCycle: SweepObservation.fields,
    ObservedPhaseTiming: PhaseTimingObservation.fields,
    ObservedPhaseDeadline: { generation: Schema.Int },
    CompletedReveal: { generation: Schema.Int },
    ObservedCandidates: { indices: Schema.Array(Schema.Int) },
    ObservedDomains: {
      current: Domains,
      target: Domains,
      viewport: Schema.optionalKey(ChartViewport),
    },
    ObservedFocus: FocusObservation.fields,
    ObservedBlur: {},
    ObservedPointerLeave: {},
    ObservedKey: KeyboardObservation.fields,
    ChangedFocus: FocusObservation.fields,
    ChangedSelection: { selection: Schema.Option(Selection) },
    CompletedMount: {},
    CompletedPrepare: {},
    Unmounted: {},
  })

  const InMessage = defineInMessageUnion({
    RequestedData: { data: Rows },
    RequestedConfigure: { configuration: Configuration },
    RequestedBrush: { range: Schema.Option(BrushRange) },
    RequestedSelection: { selection: Schema.Option(Selection) },
    RequestedLegendHover: { index: Schema.Option(Schema.Int) },
    RequestedProfitLossLegendHover: { index: Schema.Option(Schema.Int) },
    RequestedFocus: FocusObservation.fields,
  })

  return {
    Model,
    Message,
    InMessage,
    InitArgs: Schema.Tuple([Schema.String, Rows, Schema.optional(Configuration)]),
    view: {
      kind: 'Element' as const,
      Inputs:
        Block.makeInputContract<
          CartesianViewInputs<Datum, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
        >(),
    },
    effects: Block.makeEffectsContract(),
  }
}
