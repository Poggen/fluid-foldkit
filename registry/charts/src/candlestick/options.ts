import type { TimeSeriesProps } from '../cartesian/root-options'

export interface CandlestickProps {
  /**
   * Animate the candles in on entrance.
   * @default true
   */
  readonly animate?: boolean
  /**
   * Fill color of candles that closed at or above their open.
   * @default "url(#candlestick-positive)"
   */
  readonly positiveFill?: string
  /**
   * Fill color of candles that closed below their open.
   * @default "url(#candlestick-negative)"
   */
  readonly negativeFill?: string
  /** Overlays the body pattern and uses Source solid paint for the body and wick. */
  readonly bodyPatternPositive?: string
  /** Overlays the body pattern and uses Source solid paint for the body and wick. */
  readonly bodyPatternNegative?: string
  /** Draws the inset body stroke after entrance; follows Source dimensions without clamping. */
  readonly insideStrokeWidth?: number
  /**
   * Opacity of the candles that are not hovered while another candle is hovered.
   * @default 0.3
   */
  readonly fadedOpacity?: number
  /**
   * Dim the candles that are not hovered.
   * @default true
   */
  readonly showHoverFade?: boolean
}

export interface CandlestickChartProps<Row> extends Omit<
  TimeSeriesProps<Row>,
  | 'x'
  | 'status'
  | 'loadingLabel'
  | 'onPhaseChange'
  | 'yDomainTween'
  | 'yDomain'
  | 'yDomainTweenDuration'
  | 'animationEasing'
  | 'tweenYDomainOnXDomainChange'
> {
  readonly candleGap?: number
  readonly candleWidth?: number
}

export interface OHLCDataPoint extends Readonly<Record<string, unknown>> {
  readonly date: Date
  readonly open: number
  readonly high: number
  readonly low: number
  readonly close: number
}
