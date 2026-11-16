import { Context } from 'effect'

export class HeatmapRegistration extends Context.Service<HeatmapRegistration, () => void>()(
  '@foldkit-visuals/charts/HeatmapRegistration',
) {}
