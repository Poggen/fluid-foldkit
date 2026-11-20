import { LightboxBlock } from './block.js'
import { Observe } from './host.js'
export const LightboxComposition = LightboxBlock.makeComposition({ mounts: [Observe] })
