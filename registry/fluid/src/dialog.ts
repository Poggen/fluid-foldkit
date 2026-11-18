/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Block } from 'foldkit'
import { FluidDialogNamespace, dialogContract } from './dialog-definition.js'
import { dialogPlans } from './dialog-plans.js'

export const DialogKey = Symbol('Dialog')

export const DialogBlock = Block.make(FluidDialogNamespace, { key: DialogKey, ...dialogContract })

export const DialogLayer = DialogBlock.makeLayer(dialogPlans<typeof DialogKey>(DialogBlock))

export const isDialogOpen = (model: typeof dialogContract.Model.Type) => model.isOpen

export {
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog-parts.js'

export {
  DialogResources,
  DialogResourcesLayer,
  DialogResourcesServerLayer,
} from './dialog-resources.js'

export type {
  DialogCallbacks,
  DialogResourceOptions,
  DialogLifecycleEvent,
} from './dialog-resources.js'

export type { DialogConfig } from './dialog-state.js'

export type { DialogContext, DialogProps } from './dialog-contracts.js'

export type {
  DialogPartProps,
  DialogNamedPartProps,
  DialogTriggerProps,
  DialogCloseProps,
  DialogContentProps,
} from './dialog-parts.js'

export { createDialogContentContext } from './dialog-presentation.js'
