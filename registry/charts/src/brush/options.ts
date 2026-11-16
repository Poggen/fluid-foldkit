import type { ChildAttribute, Html } from 'foldkit/html'
import type { TimeSeriesProps } from '../cartesian/root-options'
import type { CartesianViewInputs } from '../cartesian/block'
import type { PatternPresetOptions } from '../kit/pattern/pattern-preset-helpers'
import type { BrushInteraction } from './state'

export interface ChartBrushSelection {
  readonly start: Date
  readonly end: Date
}

export type ChartBrushPatternPreset =
  | 'none'
  | 'diagonal'
  | 'horizontal'
  | 'vertical'
  | 'cross'
  | 'dots'
  | 'circles'
  | 'accent'

export interface ChartBrushSelectionPattern extends PatternPresetOptions {
  readonly preset: ChartBrushPatternPreset
  readonly color: string
  readonly opacity?: number
}

export interface ChartBrushTrackOverlayStyle {
  readonly blurPx?: number
  readonly fadeOuterEdges?: boolean
}

export interface ChartBrushProps extends ChartBrushTrackOverlayStyle {
  readonly brushDirection?: 'horizontal' | 'vertical' | 'both'
  readonly selection?: ChartBrushSelection | null
  readonly useWindowMoveEvents?: boolean
  /** SelectionObserved is a typed child output; no deferred callback is retained. */
  readonly initialSelection?: ChartBrushSelection | null
  readonly selectionPattern?: ChartBrushSelectionPattern
  readonly selectedBoxStyle?: object
}

export interface ChartBrushTrackOverlayProps extends ChartBrushTrackOverlayStyle {
  readonly innerWidth: number
  readonly innerHeight: number
  readonly selectionX0: number
  readonly selectionX1: number
}

export interface ChartBrushSelectionOverlayProps {
  readonly innerWidth: number
  readonly innerHeight: number
  readonly selectionX0: number
  readonly selectionX1: number
  readonly pattern?: ChartBrushSelectionPattern
}

export interface ChartBrushLayoutState {
  readonly xDomain: readonly [Date, Date] | undefined
  readonly xDomainSlotCount: number | undefined
  readonly brushSelection: ChartBrushSelection | null
  /** View-slot attributes only; programmatic requests use the registered Brush Binding. */
  readonly selectionAttributes: (
    selection: ChartBrushSelection | null,
  ) => ReadonlyArray<ChildAttribute>
}

/** Prepared strip drawing. It carries no separate Block or selection authority. */
export type BrushPlot<Row> = Omit<
  CartesianViewInputs<Row>,
  'createResource' | 'configureResource'
> & {
  readonly plot: TimeSeriesProps<Row>
  readonly brush: ChartBrushProps
  readonly renderBrush: (state: BrushInteraction, data: ReadonlyArray<Row>) => Html
}

export interface ChartBrushLayoutProps<Row extends Readonly<Record<string, unknown>>> {
  readonly data: ReadonlyArray<Row>
  readonly xDataKey?: string
  readonly xExtentMax?: Date
  readonly enabled: boolean
  readonly height: number
  readonly fitMainContent?: boolean
  readonly className?: string
  readonly children: (layout: ChartBrushLayoutState) => Html
  readonly brushStrip?: (layout: ChartBrushLayoutState) => BrushPlot<Row>
}

export interface BrushViewInputs<Row> {
  readonly height: number
  readonly fitMainContent: boolean
  readonly className?: string
  readonly renderMain?: (layout: ChartBrushLayoutState) => Html
  readonly renderStrip: (layout: ChartBrushLayoutState) => BrushPlot<Row> | undefined
}
