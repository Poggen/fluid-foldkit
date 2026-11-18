import type { AreaXCurve } from '@tanstack/charts/area-x'

const lerp: (a: number, b: number, t: number) => number = (a: number, b: number, t: number) =>
  a + (b - a) * t

const at: (ax: number, ay: number, bx: number, by: number, t: number) => string = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  t: number,
) => `${lerp(ax, bx, t)} ${lerp(ay, by, t)}`

/** `sideDepth`: the corner clamp depth is the side length (arc, parallel sides); otherwise the vertical extent (linear, tapered). */
export const notchPolygonCurve: (cornerRadius: number, sideDepth: boolean) => AreaXCurve = (
  cornerRadius: number,
  sideDepth: boolean,
) => ({
  areaX: (right) => {
    if (right.length < 4) {
      return ''
    }

    const [a, b, c, d] = right

    if (a === undefined || b === undefined || c === undefined || d === undefined) return ''
    const [x1, y1] = a
    const [x2, y2] = b
    const [x3, y3] = c
    const [x4, y4] = d

    if (cornerRadius <= 0) {
      return `M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}L${x4} ${y4}Z`
    }

    const d12 = Math.hypot(x2 - x1, y2 - y1)
    const d23 = Math.hypot(x3 - x2, y3 - y2)
    const d34 = Math.hypot(x4 - x3, y4 - y3)
    const d41 = Math.hypot(x1 - x4, y1 - y4)
    const depth = sideDepth ? d23 : Math.abs(y3 - y2)

    const cr = Math.min(
      cornerRadius,
      depth * 0.48,
      d12 * 0.49,
      d23 * 0.49,
      d34 * 0.49,
      d41 * 0.49,
      Math.min(d12, d23, d34, d41) * 0.49,
    )

    const r1 = Math.min(cr / d12, 0.49)
    const r2 = Math.min(cr / d23, 0.49)
    const r3 = Math.min(cr / d34, 0.49)
    const r4 = Math.min(cr / d41, 0.49)

    return (
      `M${at(x1, y1, x4, y4, r4)}Q${x1} ${y1} ${at(x1, y1, x2, y2, r1)}L${at(x2, y2, x1, y1, r1)}Q${x2} ${y2} ${at(x2, y2, x3, y3, r2)}` +
      `L${at(x3, y3, x2, y2, r2)}Q${x3} ${y3} ${at(x3, y3, x4, y4, r3)}L${at(x4, y4, x3, y3, r3)}Q${x4} ${y4} ${at(x4, y4, x1, y1, r4)}Z`
    )
  },
})
