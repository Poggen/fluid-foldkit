import { Effect, Layer, Stream } from 'effect'
import { TooltipDom } from '../src/tooltip-native/resources.js'

// Stories exercise serializable transitions without mounting a browser occurrence.
// Unexpected DOM execution fails instead of passing with inert production resources.
export const TooltipStoryLayer = Layer.succeed(
  TooltipDom,
  TooltipDom.of({
    hasOpenChild: () => Effect.die(new Error('Headless Tooltip Story cannot inspect DOM children')),
    wait: Effect.sleep,
    portal: () => Stream.die(new Error('Headless Tooltip Story cannot mount a portal')),
    observeTrigger: () => Stream.die(new Error('Headless Tooltip Story cannot mount a trigger')),
    observePopup: () => Stream.die(new Error('Headless Tooltip Story cannot mount a popup')),
  }),
)
