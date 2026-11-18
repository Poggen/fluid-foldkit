import type { ChartRendererHostOptions, ChartValue } from '@tanstack/charts'

export const sameRendererOptions: <Row, X extends ChartValue, Y extends ChartValue>(
  previous: ChartRendererHostOptions<Row, X, Y> | undefined,
  next: ChartRendererHostOptions<Row, X, Y>,
) => boolean = function sameRendererOptions<Row, X extends ChartValue, Y extends ChartValue>(
  previous: ChartRendererHostOptions<Row, X, Y> | undefined,
  next: ChartRendererHostOptions<Row, X, Y>,
) {
  return (previous !== undefined &&
    previous.definition === next.definition &&
    previous.renderer === next.renderer &&
    previous.width === next.width &&
    previous.height === next.height &&
    previous.aspectRatio === next.aspectRatio &&
    previous.ariaLabel === next.ariaLabel &&
    previous.ariaDescription === next.ariaDescription &&
    previous.idPrefix === next.idPrefix &&
    previous.initialWidth === next.initialWidth &&
    previous.className === next.className &&
    previous.tabIndex === next.tabIndex &&
    previous.measureText === next.measureText &&
    previous.onRender === next.onRender &&
    previous.onFocusChange === next.onFocusChange &&
    previous.onFocusGroupChange === next.onFocusGroupChange &&
    previous.onSelect === next.onSelect &&
    previous.onTooltipBodyChange === next.onTooltipBodyChange) satisfies boolean
}
