import { createMotionEngine } from './motion-engine.js'
import { createLayoutAdapter } from './motion-projection.js'
import { createMotionRoot } from './motion-root.js'
import type { MotionOptions } from './motion-contract.js'

export { EXIT_COMPLETE_EVENT } from './motion-engine.js'

export type { MotionOptions } from './motion-contract.js'

/** Full layout capability remains separate from target-only scopes. */
export function createMotionScope(id: string) {
  const { flushLayout, ...engine } = createMotionEngine<MotionOptions>(id, createLayoutAdapter(id))

  return { ...engine, root: createMotionRoot(engine.captureLayout, flushLayout) }
}

export type MotionScope = ReturnType<typeof createMotionScope>
