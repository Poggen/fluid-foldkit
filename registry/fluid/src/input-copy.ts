/** Ordinary control: owns clipboard feedback, Tooltip composition and target motion. */
export {
  InputCopyControlBlock,
  InputCopyControlKey,
  controlLayer,
  createInputCopyControlLayer,
} from './input-copy-control.js'
export type { InputCopyControlViewInputs } from './input-copy-control.js'

/** Lower-level composition seam for shared document Tooltip and animation providers. */
export {
  InputCopyBlock,
  InputCopyKey,
  layer,
  InputCopyResources,
  createInputCopyLayer,
  InputCopyConfigSchema,
  InMessage,
  InputCopyEvent,
} from './input-copy-core.js'
export type {
  InputCopyConfig,
  InputCopyViewInputs,
  InputCopyViewBuilder,
} from './input-copy-core.js'
