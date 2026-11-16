import type { Frame } from './live-frame'

/** The pulse ring's slices of its 1.5 s cycle (see LivePulse). */
const SLICES = 12

/** bklit's ring: r from dotSize to dotSize * 3.5 and opacity 0.5 -> 0 over 1.5 s, linear, stroke 1.5 (live-line.tsx:250-275). */
const REACH = 3.5

const STROKE = 1.5

const OPACITY_FROM = 0.5

/** A hard edge between slices, as a share of the cycle. */
const EDGE = 0.0005

/** The ring's keyframes and slice boxes for a dot size. Slice k covers progress k/SLICES..(k+1)/SLICES of the cycle: a box laid out at the slice's end radius, border STROKE, scaled from the slice's start radius
 * to 1 while its opacity follows the cycle's linear fade, hidden for the rest of the cycle. */
function pulseCss(dotSize: number): string {
  const rules: Array<string> = []

  for (let k = 0; k < SLICES; k += 1) {
    const p0 = k / SLICES
    const p1 = (k + 1) / SLICES
    const r1 = dotSize * (1 + (REACH - 1) * p1)
    const s0 = (1 + (REACH - 1) * p0) / (1 + (REACH - 1) * p1)
    const a0 = OPACITY_FROM * (1 - p0)
    const a1 = OPACITY_FROM * (1 - p1)
    const pct = (p: number): string => `${Math.round(p * 1e5) / 1e3}%`
    const hidden = `opacity:0;scale:${s0}`
    rules.push(
      `@keyframes bkm-pr${k}{0%{${hidden}}${k > 0 ? `${pct(p0 - EDGE)}{${hidden}}` : ''}${pct(p0)}{opacity:${a0};scale:${s0}}${pct(p1)}{opacity:${a1};scale:1}${k < SLICES - 1 ? `${pct(p1 + EDGE)}{opacity:0;scale:1}` : ''}100%{opacity:0;scale:1}}`,
      // The border-box reaches half a stroke past the ring's radius, so the border's centre line sits on it as an svg stroke does.
      `.bkm-pr${k}{--bkm-pr-size:${2 * r1 + STROKE}px;--bkm-pr-margin:${-(r1 + STROKE / 2)}px 0 0 ${-(r1 + STROKE / 2)}px;--bkm-pr-animation:bkm-pr${k}}`,
    )
  }

  return rules.join('\n')
}

export function createLivePulse(parent: HTMLElement) {
  const root = document.createElement('div')
  root.className = 'bkm-pr-mask inset-0 overflow-hidden pointer-events-none'
  root.setAttribute('aria-hidden', 'true')
  root.dataset.bkmLivePulse = ''

  const css = document.createElement('style'),
    tip = document.createElement('div'),
    mask = document.createElement('div')

  mask.className =
    'bkm-pr-mask [width:var(--bkm-pulse-mask-size)] [height:var(--bkm-pulse-mask-size)] [margin:var(--bkm-pulse-mask-margin)] [mask-image:var(--bkm-pulse-mask)] [color:var(--bkm-pulse-color)]'
  tip.append(mask)
  root.append(css, tip)
  parent.append(root)
  let size = -1

  return {
    update(
      frame: Frame,
      color: string,
      dotSize: number,
      width: number,
      innerHeight: number,
      margin: { readonly top: number; readonly right: number; readonly left: number },
      enabled: boolean,
    ) {
      const point = frame.tip
      root.hidden = !enabled || point === undefined || frame.seed || frame.intro

      if (root.hidden || point === undefined) return

      const [x0, x1] = frame.xDomain,
        [y0, y1] = frame.yDomain

      const x =
        margin.left + ((point.t - x0) / (x1 - x0 || 1)) * (width - margin.left - margin.right)

      const y = margin.top + ((y1 - point.v) / (y1 - y0 || 1)) * innerHeight

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        root.hidden = true

        return
      }

      if (dotSize !== size) {
        size = dotSize
        css.textContent = pulseCss(size)
        mask.replaceChildren(
          ...Array.from({ length: SLICES }, (_, index) => {
            const slice = document.createElement('div')
            slice.className = `bkm-pr bkm-pr [width:var(--bkm-pr-size)] [height:var(--bkm-pr-size)] [margin:var(--bkm-pr-margin)] [animation:var(--bkm-pr-animation)_1500ms_linear_infinite]${index}`

            return slice
          }),
        )
      }

      tip.className = `bkm-live-pulse-ov bkm-dp [left:var(--bkm-pulse-left)] [top:var(--bkm-pulse-top)]${frame.parity}`
      tip.style.setProperty('--bkm-pulse-left', `${x}px`)
      tip.style.setProperty('--bkm-pulse-top', `${y}px`)

      const hole = dotSize + 1,
        box = 2 * REACH * dotSize + 4

      mask.style.setProperty('--bkm-pulse-mask-size', `${box}px`)
      mask.style.setProperty('--bkm-pulse-mask-margin', `${-box / 2}px`)
      mask.style.setProperty(
        '--bkm-pulse-mask',
        `radial-gradient(circle at center, transparent ${hole - 0.25}px, #000 ${hole + 0.25}px)`,
      )
      mask.style.setProperty('--bkm-pulse-color', color)
    },
    hide() {
      root.hidden = true
    },
    destroy() {
      root.remove()
    },
  }
}

export function createLivePillFilter(parent: HTMLElement) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.classList.add('absolute')

  const add = (tag: string, attrs: Readonly<Record<string, string>>, container: SVGElement) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag)

    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value)
    container.append(element)

    return element
  }

  const filter = add(
    'filter',
    {
      id: 'bkm-live-pill',
      x: '-60%',
      y: '-400%',
      width: '220%',
      height: '900%',
      'color-interpolation-filters': 'sRGB',
    },
    svg,
  )

  add(
    'feMorphology',
    { operator: 'dilate', radius: '14 0', in: 'SourceGraphic', result: 'd' },
    filter,
  )
  add('feMorphology', { operator: 'erode', radius: '8 0', in: 'd', result: 'c' }, filter)
  add('feGaussianBlur', { stdDeviation: '8', in: 'c', result: 'b' }, filter)
  const transfer = add('feComponentTransfer', { in: 'b', result: 't' }, filter)
  add('feFuncA', { type: 'linear', slope: '16', intercept: '-7.2' }, transfer)
  add('feFlood', { class: '[flood-color:var(--chart-date-pill-background)]', result: 'f' }, filter)
  add('feComposite', { in: 'f', in2: 't', operator: 'in' }, filter)
  parent.append(svg)

  return () => svg.remove()
}
