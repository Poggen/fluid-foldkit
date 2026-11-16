import type { HeatmapLevelColors, HeatmapLevelStyles } from './colors'
import { HEATMAP_DEFAULT_LEVEL_COLORS } from './colors'

export const heatmapCssVars: Readonly<
  Record<'empty' | 'level1' | 'level2' | 'level3' | 'level4', string>
> = {
  empty: HEATMAP_DEFAULT_LEVEL_COLORS[0],
  level1: HEATMAP_DEFAULT_LEVEL_COLORS[1],
  level2: HEATMAP_DEFAULT_LEVEL_COLORS[2],
  level3: HEATMAP_DEFAULT_LEVEL_COLORS[3],
  level4: HEATMAP_DEFAULT_LEVEL_COLORS[4],
}

export function levelColorsFromStyles(styles: HeatmapLevelStyles): HeatmapLevelColors {
  return [styles[0].color, styles[1].color, styles[2].color, styles[3].color, styles[4].color]
}
