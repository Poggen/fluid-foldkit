import type { SvgResource } from './resources'
export interface SankeyPaintFeed {
  gradients: Array<SvgResource>
  readonly linkKeys: Map<string, string>
  hit?: (markId: string, datumIndex: number, x: number, y: number) => boolean | null
}
export const createPaintFeed: () => SankeyPaintFeed = () => ({ gradients: [], linkKeys: new Map() })
