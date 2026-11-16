import { Predicate } from 'effect'
import { createMark } from '@tanstack/charts'
import type { ChartBounds, SceneNode } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import type { CartesianLayer } from './layers'
import type { ChartMarker, ChartMarkersProps, MarkerGroupProps } from './overlay-options'

interface EventMarkerGroup {
  readonly date: Date
  readonly items: ReadonlyArray<Readonly<ChartMarker>>
}

export function groupMarkerItems<Item extends { readonly date: Date | number }>(
  items: ReadonlyArray<Item>,
): ReadonlyArray<ReadonlyArray<Item>> {
  const byDate = new Map<number, Array<Item>>()

  for (const item of items) {
    const date = Predicate.isNumber(item.date) ? item.date : item.date.getTime()
    const group = byDate.get(date) ?? []

    group.push(item)
    byDate.set(date, group)
  }

  return [...byDate.values()]
}

const SHADOW_FILL = 'black'

const MARKER_BORDER = 'var(--chart-marker-border)'

const FAN_RADIUS = 50

const FAN_ANGLE = 160
// bklit draws marker icons as HTML flex-centred in a 28px disc box; its glyph lands 1px below the SVG middle-baseline text (measured, /charts/markers and /charts/line at 390: 423 -> 22 diff px).

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

// bklit MarkerGroup as one custom mark: a scene group per same-date marker group (`evtmarker:<mi>:g<gi>`), translated to the marker centre (8px above the plot top); the 1.0 scene has no per-node number hooks, so CSS derives group and fan item index from sibling-index() (Chromium-only, 138+: styles.css keeps the indices at 0 outside `@supports`).
// styles.css has the generic rules (entrance, hover rule lift, cluster fan-out), all :hover on the group.
interface OverlayScene {
  readonly nodes: Array<SceneNode>
  readonly points: []
}

function eventMarker({ id, mi, groups, set }: EventMarkerOptions) {
  const size = set.size ?? 28
  const showLines = set.showLines !== false
  const { maxFanned } = set
  // bklit MarkerGroup `portalX = x + marginLeft`, `portalY = y + marginTop` (marker-group.tsx:185-186): the fan anchors off the marker by the gap to the chart margin (zero when unset, as ChartMarkers passes it).
  const r = size / 2

  const icon = (x: number, y: number, v: ChartMarker['icon']): SceneNode => ({
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

  const disc = (x: number, y: number, color?: string): SceneNode => ({
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
  // bklit's fan disc is `rounded-full shadow-lg` (box-shadow 0 10px 15px -3px / 0 4px 6px -4px, rgb 0 0 0 / .1); a CSS drop-shadow has no negative spread, so each layer is a blurred, shrunk circle behind the disc (radius attribute = rest radius, disc radius minus the spread, so any `size` works).
  // Offset and blur come from styles.css `.bkm-evt-sh*`; kit/motion/marker-springs.ts springs them to bklit's hover shadow (hot radius = the disc radius, the `.bkm-evt-act:hover` rule in styles.css).

  const shadows = (key: string): Array<SceneNode> =>
    [1, 2].map((layer) => ({
      kind: 'dot',
      key: `${key}:sh${layer}`,
      className: `bkm-evt-sh bkm-evt-sh${layer}`,
      x: 0,
      y: 0,
      radius: r - (layer === 1 ? 3 : 4),
      style: { fill: SHADOW_FILL },
    }))

  const fanItem = (
    key: string,
    k: number,
    a: number,
    it: Readonly<ChartMarker>,
    gi: number,
  ): SceneNode => {
    const itemKey = `${key}:item${k}`

    const discNodes = [
      ...shadows(itemKey),
      { ...disc(0, 0, it.color), key: `${itemKey}:disc`, className: 'bkm-evt-item-disc' },
      { ...icon(0, ICON_DY, it.icon), key: `${itemKey}:icon` },
    ]
    // bklit MarkerCircleHTML `hasAction` (marker-group.tsx:473): hover 1.15 / press 0.95 springs (marker-springs.ts), pointer cursor, click.

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

  const badge = (key: string, n: number): SceneNode => {
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

  const groupScene = (
    g: EventMarkerGroup,
    gi: number,
    x: number,
    chart: ChartBounds,
  ): SceneNode => {
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
    // bklit MarkerGroup `isMuted` (marker-group.tsx:153, 114-118): the resting body sits at opacity 0.4; the fan hides it, so only the resting state shows it.

    const restBody: SceneNode =
      set.isMuted === true
        ? { kind: 'group', key: `${key}:muted`, style: { opacity: 0.4 }, children: [bodyGroup] }
        : bodyGroup
    // bklit's transparent hover rect (covers the disc with room for the badge); a cluster's grows to the fan area. It sits under the fan so an actionable fan disc takes the pointer first.

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
      // bklit MarkerGroup `maxFanned` (marker-group.tsx:148-149): only the first N fan out; the badge keeps the full count.
      const fanned = maxFanned === undefined ? g.items : g.items.slice(0, maxFanned)

      const angleAt = (k: number): number =>
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
      render: ({ scales, chart }): OverlayScene => {
        const nodes = groups.flatMap((g, gi) => {
          const x = scales.x?.map(g.date) ?? Number.NaN

          return Number.isFinite(x) ? [groupScene(g, gi, x, chart)] : []
        })

        return {
          nodes: [{ kind: 'group', key: id, ariaHidden: true, children: nodes }],
          points: [],
        }
      },
    })),
  )
}

function markerGroupProps(props: MarkerGroupProps): MarkerSetProps {
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

export function markerSets<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
): ReadonlyArray<MarkerSetProps> {
  return [
    ...children.flatMap((child) => (child.kind === 'markers' ? [child.props] : [])),
    ...children.flatMap((child) =>
      child.kind === 'markerGroup' ? [markerGroupProps(child.props)] : [],
    ),
  ]
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
