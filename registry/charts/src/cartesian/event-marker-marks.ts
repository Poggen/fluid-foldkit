import { Predicate } from 'effect'
import { createMark } from '@tanstack/charts'
import type { ChartBounds, SceneNode } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import type { CartesianLayer } from './layers'
import type { ChartMarker, ChartMarkersProps, MarkerGroupProps } from './overlay-options'

export const groupMarkerItems: <Item extends { readonly date: Date | number }>(
  items: ReadonlyArray<Item>,
) => ReadonlyArray<ReadonlyArray<Item>> = function groupMarkerItems<
  Item extends { readonly date: Date | number },
>(items: ReadonlyArray<Item>) {
  const byDate = new Map<number, Array<Item>>()

  for (const item of items) {
    const date = Predicate.isNumber(item.date) ? item.date : item.date.getTime()
    const group = byDate.get(date) ?? []

    group.push(item)
    byDate.set(date, group)
  }

  return [...byDate.values()] satisfies ReadonlyArray<ReadonlyArray<Item>>
}

export const markerSets: <Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
) => ReadonlyArray<MarkerSetProps> = function markerSets<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
) {
  return [
    ...children.flatMap((child) => (child.kind === 'markers' ? [child.props] : [])),
    ...children.flatMap((child) =>
      child.kind === 'markerGroup' ? [markerGroupProps(child.props)] : [],
    ),
  ] satisfies ReadonlyArray<MarkerSetProps>
}

const markerGroupProps: (props: MarkerGroupProps) => MarkerSetProps = function markerGroupProps(
  props: MarkerGroupProps,
) {
  const set: MarkerSetProps = { items: props.markers }

  if (props.size !== undefined) {
    Object.assign(set, { size: props.size })
  }

  if (props.showLine !== undefined) {
    Object.assign(set, { showLines: props.showLine })
  }

  if (props.maxFanned !== undefined) {
    Object.assign(set, { maxFanned: props.maxFanned })
  }

  if (props.forceOpen !== undefined) {
    Object.assign(set, { forceOpen: props.forceOpen })
  }

  if (props.marginLeft !== undefined) {
    Object.assign(set, { marginLeft: props.marginLeft })
  }

  if (props.marginTop !== undefined) {
    Object.assign(set, { marginTop: props.marginTop })
  }

  if (props.borderColor !== undefined) {
    Object.assign(set, { borderColor: props.borderColor })
  }

  if (props.borderWidth !== undefined) {
    Object.assign(set, { borderWidth: props.borderWidth })
  }

  if (props.isMuted !== undefined) {
    Object.assign(set, { isMuted: props.isMuted })
  }

  return set
}

interface EventMarkerGroup {
  readonly date: Date
  readonly items: ReadonlyArray<Readonly<ChartMarker>>
}

const SHADOW_FILL = 'black'

const MARKER_BORDER = 'var(--chart-marker-border)'

const FAN_RADIUS = 50

const FAN_ANGLE = 160

const ICON_DY = 1
/** ChartMarkers props plus the MarkerGroup styling props bklit's ChartMarkers does not forward (marker-group.tsx:140-143). */

type MarkerSetProps = ChartMarkersProps &
  Pick<
    MarkerGroupProps,
    'borderColor' | 'borderWidth' | 'isMuted' | 'forceOpen' | 'marginLeft' | 'marginTop'
  >

interface EventMarkerOptions {
  readonly id: string
  readonly mi: number
  readonly groups: ReadonlyArray<EventMarkerGroup>
  readonly set: MarkerSetProps
}

interface OverlayScene {
  readonly nodes: Array<SceneNode>
  readonly points: []
}

function eventMarker({ id, mi, groups, set }: EventMarkerOptions) {
  const size = set.size ?? 28
  const showLines = set.showLines !== false
  const { maxFanned } = set

  const r = size / 2

  const icon: (x: number, y: number, v: ChartMarker['icon']) => SceneNode = (
    x: number,
    y: number,
    v: ChartMarker['icon'],
  ) => ({
    kind: 'label',
    key: `${id}:icon`,
    x,
    y,
    text: Predicate.isString(v) || Predicate.isNumber(v) ? String(v) : '',
    anchor: 'middle',
    baseline: 'middle',
    fontSize: size * 0.5,
    style: { fill: 'var(--chart-marker-foreground)' },
  })

  const disc: (x: number, y: number, color?: string) => SceneNode = (
    x: number,
    y: number,
    color?: string,
  ) => ({
    kind: 'dot',
    key: `${id}:disc`,
    x,
    y,
    radius: r,
    style: {
      fill: color ?? 'var(--chart-marker-background)',
      stroke: set.borderColor ?? MARKER_BORDER,
      strokeWidth: set.borderWidth ?? 1.5,
    },
  })

  const shadows: (key: string) => Array<SceneNode> = (key: string) =>
    [1, 2].map((layer) => ({
      kind: 'dot',
      key: `${key}:sh${layer}`,
      className: `bkm-evt-sh bkm-evt-sh${layer}`,
      x: 0,
      y: 0,
      radius: r - (layer === 1 ? 3 : 4),
      style: { fill: SHADOW_FILL },
    }))

  const fanItem: (
    key: string,
    k: number,
    a: number,
    it: Readonly<ChartMarker>,
    gi: number,
  ) => SceneNode = (key: string, k: number, a: number, it: Readonly<ChartMarker>, gi: number) => {
    const itemKey = `${key}:item${k}`

    const discNodes = [
      ...shadows(itemKey),
      { ...disc(0, 0, it.color), key: `${itemKey}:disc`, className: 'bkm-evt-item-disc' },
      { ...icon(0, ICON_DY, it.icon), key: `${itemKey}:icon` },
    ]

    const hasAction = it.onClick !== undefined || (it.href !== undefined && it.href !== '')

    const press: SceneNode = {
      kind: 'group',
      key: `${itemKey}:press`,
      className: `bkm-evt-act bkm-evt-act-${mi}-${gi}-${k}`,
      children: discNodes,
    }

    return {
      kind: 'group',
      key: itemKey,
      className: 'bkm-evt-item',
      children: [
        {
          kind: 'group',
          key: `${itemKey}:at`,
          translateX: Math.cos(a) * FAN_RADIUS,
          translateY: Math.sin(a) * FAN_RADIUS,
          children: hasAction ? [press] : discNodes,
        },
      ],
    }
  }

  const badge: (key: string, n: number) => SceneNode = (key: string, n: number) => {
    const bx = r + 2

    return {
      kind: 'group',
      key: `${key}:badge`,
      className: 'bkm-evt-badge',
      children: [
        {
          kind: 'dot',
          key: `${key}:badge-disc`,
          x: bx,
          y: -bx,
          radius: 9,
          style: { fill: 'var(--chart-marker-badge-background)' },
        },
        {
          kind: 'label',
          key: `${key}:badge-count`,
          x: bx,
          y: -bx,
          text: String(n),
          anchor: 'middle',
          baseline: 'middle',
          fontSize: 11,
          fontWeight: 600,
          style: { fill: 'var(--chart-marker-badge-foreground)' },
        },
      ],
    }
  }

  const groupScene: (
    g: EventMarkerGroup,
    gi: number,
    x: number,
    chart: ChartBounds,
  ) => SceneNode = (g: EventMarkerGroup, gi: number, x: number, chart: ChartBounds) => {
    const key = `${id}:g${gi}`
    const n = g.items.length
    const first = g.items.at(0)
    const children: Array<SceneNode> = []

    if (showLines) {
      children.push({
        kind: 'rule',
        key: `${key}:rule`,
        className: 'bkm-evt-rule',
        x1: 0,
        x2: 0,
        y1: r + 4,
        y2: chart.height + 8,
        style: {
          stroke: MARKER_BORDER,
          strokeOpacity: 0.6,
          strokeWidth: 1,
          strokeDasharray: '4 4',
          lineCap: 'round',
        },
      })
    }

    const body: Array<SceneNode> = [
      {
        kind: 'dot',
        key: `${key}:shadow`,
        x: 0,
        y: 2,
        radius: r,
        style: { fill: SHADOW_FILL, fillOpacity: 0.15 },
      },
      { ...disc(0, 0, first?.color), key: `${key}:disc` },
      { ...icon(0, ICON_DY, first?.icon), key: `${key}:icon` },
    ]

    if (n > 1) {
      body.push(badge(key, n))
    }

    const bodyGroup: SceneNode = {
      kind: 'group',
      key: `${key}:body`,
      className: 'bkm-evt-body',
      children: body,
    }

    const restBody: SceneNode =
      set.isMuted === true
        ? { kind: 'group', key: `${key}:muted`, style: { opacity: 0.4 }, children: [bodyGroup] }
        : bodyGroup

    children.push(restBody, {
      kind: 'rect',
      key: `${key}:hit`,
      className: 'bkm-evt-hit',
      x: -size * 0.75,
      y: -size,
      width: size * 1.5,
      height: size * 1.5,
      style: { fill: 'transparent' },
    })

    if (n > 1) {
      const fanned = maxFanned === undefined ? g.items : g.items.slice(0, maxFanned)

      const angleAt: (k: number) => number = (k: number) =>
        ((-90 - FAN_ANGLE / 2 + (fanned.length > 1 ? (k * FAN_ANGLE) / (fanned.length - 1) : 0)) *
          Math.PI) /
        180

      const fan: Array<SceneNode> = [
        {
          kind: 'dot',
          key: `${key}:core`,
          className: 'bkm-evt-core',
          x: 0,
          y: 0,
          radius: r / 2,
          style: { fill: MARKER_BORDER },
        },
        ...fanned.map((it, k) => fanItem(key, k, angleAt(k), it, gi)),
      ]

      children.push({
        kind: 'group',
        key: `${key}:fan`,
        translateX: (set.marginLeft ?? chart.x) - chart.x,
        translateY: (set.marginTop ?? chart.y) - chart.y,
        children: fan,
      })
    }

    const openSuffix = set.forceOpen === true ? ' bkm-evt-open' : ''

    return {
      kind: 'group',
      key,
      className: n > 1 ? `bkm-evt bkm-evt-cluster${openSuffix}` : 'bkm-evt',
      ariaHidden: true,
      translateX: x,
      translateY: chart.y - 8,
      children,
    }
  }

  return decorative(
    createMark<never, Date, number>(() => ({
      id,
      channels: {},
      render: ({ scales, chart }) => {
        const nodes = groups.flatMap((g, gi) => {
          const x = scales.x?.map(g.date) ?? Number.NaN

          return Number.isFinite(x) ? [groupScene(g, gi, x, chart)] : []
        })

        return {
          nodes: [{ kind: 'group', key: id, ariaHidden: true, children: nodes }],
          points: [],
        } satisfies OverlayScene
      },
    })),
  )
}

export function eventMarkerMarks<Row>(children: ReadonlyArray<CartesianLayer<Row>>) {
  return markerSets(children).map((set, mi) => {
    const groups = groupMarkerItems(set.items).flatMap((items) => {
      const first = items.at(0)

      return first === undefined ? [] : [{ date: first.date, items }]
    })

    return eventMarker({ id: `evtmarker:${mi}`, mi, groups, set })
  })
}
