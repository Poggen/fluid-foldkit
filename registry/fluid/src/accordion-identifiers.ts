import { buttonId } from '@foldkit/ui/disclosure'

const token = (value: string) =>
  Array.from({ length: value.length }, (_value, index) =>
    value.charCodeAt(index).toString(16),
  ).join('-')

export const accordionDisclosureId = (root: string, value: string) =>
  `accordion-${token(root)}-item-${token(value)}`

export const accordionTriggerId = (root: string, value: string) =>
  buttonId(accordionDisclosureId(root, value))
