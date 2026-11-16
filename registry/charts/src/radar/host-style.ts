import { radarEntranceVars } from './entrance'
import type { RadarChartProps } from './options'

export function radarEntranceProperties(p: RadarChartProps) {
  const df = (p.enterDurationMs ?? 1100) / 1100

  return radarEntranceVars({
    enterDurationMs: p.enterDurationMs ?? 1100,
    enterTransition: p.enterTransition,
    levels: p.levels ?? 5,
    seriesBaseMs: ((p.levels ?? 5) * 80 * (p.staggerScale ?? 1) * df + 200) * df,
    seriesStepMs: 150 * (p.staggerScale ?? 1) * df,
    staggerScale: p.staggerScale ?? 1,
  })
}
