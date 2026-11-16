import { mountHtmlMotion } from '../kit/html-motion'
import type { BarSnapshot } from './definition'
import type { BarChartProps } from './options'

const labelColor = 'var(--chart-label, var(--color-zinc-500))'

const focusedColor = 'var(--foreground)'

const visualProps = (active: boolean) => ({
  initial: { opacity: 0.7, color: labelColor },
  animate: { opacity: active ? 1 : 0.7, color: active ? focusedColor : labelColor },
  transition: { duration: 0.15 },
})

/** BarYAxis is categorical even when a caller places it in a vertical chart. */
export function mountBarCategoryYAxis(host: HTMLElement) {
  const root = document.createElement('div')
  root.dataset.bkmBarCategoryYAxis = ''
  root.className =
    'absolute pointer-events-none top-0 bottom-0 left-0 w-[var(--bkm-category-y-width)]'

  const labels = new Map<
    string,
    {
      row: HTMLDivElement
      index: number
      motion: ReturnType<typeof mountHtmlMotion>
    }
  >()

  let focused: number | null = null

  const focus = (next: number | null) => {
    if (focused === next) {
      return
    }

    focused = next

    for (const label of labels.values()) {
      label.motion.update(visualProps(label.index === next))
    }
  }

  return {
    draw<Row>(snapshot: BarSnapshot<Row>, props: BarChartProps<Row>) {
      const configured = props.children.find((child) => child.kind === 'barYAxis')?.props
      const axis = snapshot.bandWidth ? configured : undefined

      if (axis && root.parentElement !== host) {
        host.append(root)
      } else if (!axis) {
        root.remove()
      }

      const wanted = new Set<string>()
      root.style.setProperty('--bkm-category-y-width', `${snapshot.margin.left}px`)

      const step =
        axis?.showAllLabels !== false || snapshot.categories.length <= (axis.maxLabels ?? 20)
          ? 1
          : Math.ceil(snapshot.categories.length / (axis.maxLabels ?? 20))

      if (axis) {
        for (const [index, text] of snapshot.categories.entries()) {
          if (index % step !== 0) {
            continue
          }

          const y = (snapshot.categoryStarts[index] ?? 0) + snapshot.margin.top
          const key = `${text}-${y}`
          wanted.add(key)
          let label = labels.get(key)

          if (!label) {
            const row = document.createElement('div')
            const span = document.createElement('span')
            span.textContent = text
            row.className =
              'absolute right-0 flex items-center justify-end pr-[8px] text-right top-[var(--bkm-category-y)] h-[var(--bkm-category-height)]'
            span.className =
              'max-w-[70px] overflow-hidden text-ellipsis whitespace-nowrap text-[12px] leading-[16px]'
            row.append(span)
            root.append(row)
            label = {
              row,
              index,
              motion: mountHtmlMotion(
                span,
                { opacity: 0.7, color: labelColor },
                visualProps(index === focused),
                'never',
              ),
            }
            labels.set(key, label)
          }

          label.index = index
          label.row.style.setProperty('--bkm-category-y', `${y}px`)
          label.row.style.setProperty('--bkm-category-height', `${snapshot.bandWidth}px`)
        }
      }

      for (const [key, label] of labels) {
        if (!wanted.has(key)) {
          label.motion.destroy()
          label.row.remove()
          labels.delete(key)
        }
      }
    },
    focus,
    destroy() {
      for (const label of labels.values()) {
        label.motion.destroy()
      }

      labels.clear()
      root.remove()
    },
  }
}
