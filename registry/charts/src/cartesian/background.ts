import { createMark } from '@tanstack/charts'
import type { BackgroundConfig } from './axis-options'
import type { CartesianLayer } from './layers'
import { scopedPatternId } from '../kit/pattern/resources'
import { renderPatternPreset } from '../kit/pattern/presets'
import type { PatternResource } from '../kit/pattern/types'

export const activeBackground: <Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
) => Readonly<BackgroundConfig> | undefined = function activeBackground<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
) {
  const props = children.find((child) => child.kind === 'background')?.props

  return (props?.showFill !== false && props?.pattern !== 'none' ? props : undefined) satisfies
    | Readonly<BackgroundConfig>
    | undefined
}

export const backgroundResources: <Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
) => ReadonlyArray<PatternResource> = function backgroundResources<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
) {
  const props = activeBackground(children)

  if (props === undefined) {
    return [] satisfies ReadonlyArray<PatternResource>
  }

  const pattern = renderPatternPreset(props.pattern ?? 'diagonal', BACKGROUND_PATTERN_ID, {
    ...props,
    color: props.color ?? 'var(--chart-grid)',
    scale: props.scale ?? 1,
  })

  return (pattern === undefined ? [] : [pattern.props]) satisfies ReadonlyArray<PatternResource>
}

export const backgroundCss: <Row>(
  scope: string,
  children: ReadonlyArray<CartesianLayer<Row>>,
) => string = function backgroundCss<Row>(
  scope: string,
  children: ReadonlyArray<CartesianLayer<Row>>,
) {
  const props = activeBackground(children)

  if (props === undefined) {
    return '' satisfies string
  }

  const horizontal = fadeEdge(props.fadeHorizontal, props.fadeHorizontalLength)
  const vertical = fadeEdge(props.fadeVertical, props.fadeVerticalLength)

  return `${scope} .bkm-bg{--bkm-bg-h:${horizontal}%;--bkm-bg-v:${vertical}%}` satisfies string
}

export const BACKGROUND_PATTERN_ID = 'chart-background'

const fadeEdge: (on?: boolean, length?: number) => number = (on = true, length = 10) =>
  (on ? Math.min(45, Math.max(0, length)) : 0) satisfies number

export function backgroundMarks<Row>(children: ReadonlyArray<CartesianLayer<Row>>, uid: string) {
  const props = activeBackground(children)

  if (props === undefined) {
    return []
  }

  const fill = `url(#${scopedPatternId(uid, BACKGROUND_PATTERN_ID)})`

  return [
    createMark<Row, Date, number>(() => ({
      id: 'background-fill',
      channels: {},
      render: ({ chart }) => ({
        nodes: [
          {
            kind: 'group',
            key: 'background:fill',
            className: 'bkm-bg',
            ariaHidden: true,
            translateX: chart.x,
            translateY: chart.y,
            children: [
              {
                kind: 'rect',
                key: 'background:rect',
                x: 0,
                y: 0,
                width: chart.width,
                height: chart.height,
                style: { fill, opacity: props.opacity ?? 1 },
              },
            ],
          },
        ],
        points: [],
      }),
    })),
  ]
}
