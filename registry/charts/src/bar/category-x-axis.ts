import type { MotionNodeOptions } from 'motion-dom'
import { inertHtml as h } from 'foldkit/html'
import { mountHtmlMotion } from '../kit/html-motion'
import type { BarSnapshot } from './definition'
import type { BarChartProps, BarXAxisProps } from './options'

const rowClasses = 'absolute left-[var(--bkm-category-x)] bottom-[12px] w-0 flex justify-center'
const labelClasses =
  'whitespace-nowrap text-[color:var(--chart-label)] text-[length:var(--text-xs,.75rem)] [line-height:var(--tw-leading,var(--text-xs--line-height,calc(1_/_.75)))]'
const rootClasses = 'pointer-events-none absolute inset-0'
type CategorySnapshot = Pick<BarSnapshot<never>, 'categories' | 'bandWidth' | 'labelXs' | 'focusXs'>

const visualProps = (opacity: number): MotionNodeOptions => ({
  initial: { opacity: 1 },
  animate: { opacity },
  transition: { duration: 0.4, ease: 'easeInOut' },
})

function labelsFor(
  snapshot: CategorySnapshot,
  axis: BarXAxisProps | undefined,
  focused: number | null,
) {
  if (axis === undefined || axis.type === 'number' || !snapshot.bandWidth) return []
  const count = snapshot.categories.length
  const spacing = Math.abs((snapshot.labelXs[1] ?? 0) - (snapshot.labelXs[0] ?? 0))
  const labelWidth = snapshot.categories.reduce(
    (width, label) => Math.max(width, label.length * 7.2),
    0,
  )
  const step =
    axis.showAllLabels === true
      ? 1
      : Math.max(
          1,
          Math.ceil(count / (axis.maxLabels ?? 12)),
          spacing > 0 ? Math.ceil((labelWidth + 8) / spacing) : 1,
        )
  const crosshair = focused === null ? undefined : snapshot.focusXs[focused]
  const half = axis.tickerHalfWidth ?? 50
  return snapshot.categories.flatMap((text, index) => {
    const x = snapshot.labelXs[index]
    if (index % step !== 0 || x === undefined) return []
    const distance = crosshair === undefined ? Number.POSITIVE_INFINITY : Math.abs(x - crosshair)
    const opacity = distance < half ? 0 : distance < half + 20 ? (distance - half) / 20 : 1
    return [{ text, x, opacity, key: `${text}-${x}` }]
  })
}

export function barCategoryXAxisView<Row>(
  snapshot: BarSnapshot<Row> | undefined,
  props: BarChartProps<Row>,
  focused: number | null,
) {
  if (snapshot === undefined) return h.empty
  const labels = labelsFor(
    snapshot,
    props.children.find((child) => child.kind === 'barXAxis')?.props,
    focused,
  )
  return labels.length === 0
    ? h.empty
    : h.div(
        [h.DataAttribute('bkm-bar-category-x-axis', ''), h.Class(rootClasses)],
        labels.map((label) =>
          h.div(
            [h.Class(rowClasses), h.Style({ '--bkm-category-x': `${label.x}px` })],
            [
              h.span(
                [
                  h.Class(`${labelClasses} opacity-[var(--bkm-category-opacity)]`),
                  h.Style({ '--bkm-category-opacity': String(label.opacity) }),
                ],
                [label.text],
              ),
            ],
          ),
        ),
      )
}

/** Presentation handles share the Bar Layer; focus remains in its checked parent Model. */
export function mountBarCategoryXAxis(host: HTMLElement) {
  const root = document.createElement('div')
  root.dataset.bkmBarCategoryXAxis = ''
  root.className = rootClasses
  const nodes = new Map<
    string,
    { row: HTMLDivElement; motion: ReturnType<typeof mountHtmlMotion> }
  >()
  let snapshot: CategorySnapshot | undefined
  let axis: BarXAxisProps | undefined
  let focused: number | null = null
  const render = () => {
    const labels = snapshot === undefined ? [] : labelsFor(snapshot, axis, focused)
    if (labels.length > 0 && root.parentElement !== host) host.append(root)
    else if (labels.length === 0) root.remove()
    const wanted = new Set(labels.map((label) => label.key))
    for (const [key, node] of nodes)
      if (!wanted.has(key)) {
        node.motion.destroy()
        node.row.remove()
        nodes.delete(key)
      }
    for (const label of labels) {
      let node = nodes.get(label.key)
      if (node === undefined) {
        const row = document.createElement('div')
        const span = document.createElement('span')
        row.className = rowClasses
        row.style.setProperty('--bkm-category-x', `${label.x}px`)
        span.className = labelClasses
        span.textContent = label.text
        row.append(span)
        root.append(row)
        node = {
          row,
          motion: mountHtmlMotion(span, { opacity: 1 }, visualProps(label.opacity), 'never'),
        }
        nodes.set(label.key, node)
      } else node.motion.update(visualProps(label.opacity))
    }
  }
  return {
    draw<Row>(next: BarSnapshot<Row>, options: Pick<BarChartProps<Row>, 'children'>) {
      snapshot = next
      axis = options.children.find((child) => child.kind === 'barXAxis')?.props
      render()
    },
    focus(next: number | null) {
      if (focused !== next) {
        focused = next
        render()
      }
    },
    destroy() {
      for (const node of nodes.values()) node.motion.destroy()
      nodes.clear()
      root.remove()
      snapshot = undefined
      axis = undefined
    },
  }
}
