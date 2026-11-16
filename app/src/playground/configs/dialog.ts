import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('dialog', {
  appearance: Appearance,
  label: Schema.String,
  description: Schema.String,
  triggerLabel: Schema.String,
  modalSize: Schema.Literals(['sm', 'lg', 'xl']),
  position: Schema.Literals(['center', 'top']),
  showCloseButton: Schema.Boolean,
  modal: Schema.Boolean,
  showActions: Schema.Boolean,
  cancelLabel: Schema.String,
  confirmLabel: Schema.String,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'dialog',
  appearance: {},
  label: 'A little focus',
  description: 'Keep the important details close.',
  triggerLabel: 'Open dialog',
  modalSize: 'sm',
  position: 'center',
  showCloseButton: true,
  modal: true,
  showActions: true,
  cancelLabel: 'Cancel',
  confirmLabel: 'Continue',
})
export const controls = [
  {
    kind: 'text',
    prop: 'label',
    group: 'Content',
    initial: defaults.label,
    values: [defaults.label],
  },
  {
    kind: 'text',
    prop: 'description',
    group: 'Content',
    initial: defaults.description,
    values: [defaults.description],
  },
  {
    kind: 'text',
    prop: 'triggerLabel',
    group: 'Content',
    initial: defaults.triggerLabel,
    values: [defaults.triggerLabel],
  },
  {
    kind: 'choice',
    prop: 'modalSize',
    group: 'Properties',
    initial: defaults.modalSize,
    values: Configuration.fields.modalSize.literals,
  },
  {
    kind: 'choice',
    prop: 'position',
    group: 'Properties',
    initial: defaults.position,
    values: Configuration.fields.position.literals,
  },
  {
    kind: 'toggle',
    prop: 'showCloseButton',
    group: 'Appearance',
    initial: defaults.showCloseButton,
  },
  { kind: 'toggle', prop: 'modal', group: 'State', initial: defaults.modal },
  { kind: 'toggle', prop: 'showActions', group: 'Content', initial: defaults.showActions },
  {
    kind: 'text',
    prop: 'cancelLabel',
    group: 'Content',
    initial: defaults.cancelLabel,
    values: [defaults.cancelLabel],
  },
  {
    kind: 'text',
    prop: 'confirmLabel',
    group: 'Content',
    initial: defaults.confirmLabel,
    values: [defaults.confirmLabel],
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (configuration: Configuration): ReadonlyArray<Control> =>
  controls.map((control) => {
    if (control.prop === 'cancelLabel') return { ...control, enabled: configuration.showActions }
    if (control.prop === 'confirmLabel') return { ...control, enabled: configuration.showActions }
    return control
  })
