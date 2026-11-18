import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ChartStyle } from '../cartesian/content-types'
import { chartStyleText } from '../cartesian/style'

export const HeatmapInteractionProvider: <Message>(argument0: {
  readonly value: HeatmapInteractionValue<Message>
  readonly children: (value: HeatmapInteractionValue<Message>) => Html
}) => Html = function HeatmapInteractionProvider<Message>({
  value,
  children,
}: {
  readonly value: HeatmapInteractionValue<Message>
  readonly children: (value: HeatmapInteractionValue<Message>) => Html
}) {
  return children(value) satisfies Html
}

export const HeatmapInteractionBoundary: <Message>(
  props: {
    readonly children: ReadonlyArray<Html>
    readonly className?: string
    readonly style?: ChartStyle
  },
  h: HtmlBuilder<Message>,
  value: HeatmapInteractionValue<Message>,
) => Html = function HeatmapInteractionBoundary<Message>(
  props: {
    readonly children: ReadonlyArray<Html>
    readonly className?: string
    readonly style?: ChartStyle
  },
  h: HtmlBuilder<Message>,
  value: HeatmapInteractionValue<Message>,
) {
  return h.div(
    [
      h.Class(props.className ?? ''),
      h.Attribute('style', chartStyleText(props.style ?? {})),
      h.OnPointerLeave(() => Option.some(value.requestLegendLevel(null))),
    ],
    props.children,
  ) satisfies Html
}

export interface HeatmapInteractionValue<Message> {
  readonly hoveredLegendLevel: number | null
  readonly hoveredCell: {
    readonly column: number
    readonly row: number
    readonly count: number
  } | null
  readonly requestLegendLevel: (level: number | null) => Message
}
