import type { Html } from 'foldkit/html'

export const chartChildren: (content: ChartContent) => ReadonlyArray<Html | string> = function (
  content: ChartContent,
) {
  if (isContentArray(content)) return content.flatMap(chartChildren)

  if (typeof content === 'number') return [String(content)]

  if (typeof content === 'boolean' || content === undefined) return []

  return [content]
}

/** Native view content replaces React nodes at public drawing boundaries. */
export type ChartContent =
  | Html
  | string
  | number
  | boolean
  | undefined
  | ReadonlyArray<ChartContent>

export type ChartStyle = Readonly<Record<string, string | number | undefined>>

const isContentArray = (value: ChartContent): value is ReadonlyArray<ChartContent> =>
  Array.isArray(value)
