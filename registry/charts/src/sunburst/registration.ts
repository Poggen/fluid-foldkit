import { Context } from 'effect'

export class SunburstRegistration extends Context.Service<SunburstRegistration, () => void>()(
  '@foldkit-visuals/charts/SunburstRegistration',
) {}
