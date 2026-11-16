import { createMotionEngine } from './motion-engine.js'
import type { TargetMotionOptions } from './motion-contract.js'

export { EXIT_COMPLETE_EVENT } from './motion-engine.js'

export type { TargetMotionOptions } from './motion-contract.js'

/** Target animation and retained presence, with no layout capability. */
export function createTargetMotionScope(id: string) {
  const { layer, node } = createMotionEngine<TargetMotionOptions>(id)

  return { layer, node }
}

export type TargetMotionScope = ReturnType<typeof createTargetMotionScope>
