import type { RadarChild } from './options'
import type { RadarGridProps } from './grid'
import type { RadarAxisProps } from './axis'
import type { RadarLabelsProps } from './labels'
import type { RadarAreaProps } from './area'

export function extract(children: ReadonlyArray<RadarChild>) {
  let grid: RadarGridProps | undefined,
    axis: RadarAxisProps | undefined,
    labels: RadarLabelsProps | undefined

  const areas: Array<RadarAreaProps> = []

  for (const child of children) {
    switch (child.kind) {
      case 'grid':
        grid = child.props
        break
      case 'axis':
        axis = child.props
        break
      case 'labels':
        labels = child.props
        break
      case 'area':
        areas.push(child.props)
        break
    }
  }

  return { grid, axis, labels, areas }
}
