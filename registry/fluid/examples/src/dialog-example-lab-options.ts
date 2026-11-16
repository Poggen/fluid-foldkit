import { Schema } from 'effect'

export const hookPolicies = [
  'none',
  'open-focus',
  'close-focus',
  'escape',
  'pointer',
  'focus',
  'interact',
  'ref',
] as const
export const slotForms = ['plain', 'render', 'as-child'] as const
export const labToggles = [
  ['labShowClose', 'Show X'],
  ['labDescription', 'Description association'],
  ['labTop', 'Top position'],
  ['labPill', 'Pill shape'],
  ['labSurface', 'Surface 3'],
  ['labDisabled', 'Disabled trigger'],
  ['labCompact', 'Compact'],
  ['labAcceptClose', 'Accept close'],
] as const
const Toggle = Schema.Literals([
  'labShowClose',
  'labDescription',
  'labTop',
  'labPill',
  'labSurface',
  'labDisabled',
  'labCompact',
  'labAcceptClose',
])
export const labModelFields = {
  isLabShowClose: Schema.Boolean,
  isLabDescription: Schema.Boolean,
  isLabTop: Schema.Boolean,
  isLabPill: Schema.Boolean,
  isLabSurface: Schema.Boolean,
  isLabDisabled: Schema.Boolean,
  isLabCompact: Schema.Boolean,
  isLabAcceptClose: Schema.Boolean,
  isLabControlled: Schema.Boolean,
  isLabOwnerOpen: Schema.Boolean,
  isLabModal: Schema.Boolean,
  isLabDark: Schema.Boolean,
  labSlot: Schema.Literals(slotForms),
  labHook: Schema.Literals(hookPolicies),
  labSize: Schema.Literals(['sm', 'lg', 'xl']),
  labKey: Schema.String,
  labChanges: Schema.Array(Schema.Boolean),
}
type BooleanLabField = {
  [Key in keyof typeof labModelFields]: (typeof labModelFields)[Key]['Type'] extends boolean
    ? Key
    : never
}[keyof typeof labModelFields]

export const labToggleFields = {
  labShowClose: 'isLabShowClose',
  labDescription: 'isLabDescription',
  labTop: 'isLabTop',
  labPill: 'isLabPill',
  labSurface: 'isLabSurface',
  labDisabled: 'isLabDisabled',
  labCompact: 'isLabCompact',
  labAcceptClose: 'isLabAcceptClose',
} satisfies Record<(typeof labToggles)[number][0], BooleanLabField>

export const labMessageFields = {
  ClickedLabToggle: { field: Toggle },
  ClickedLabSlot: { slot: Schema.Literals(slotForms) },
  ClickedLabHook: { policy: Schema.Literals(hookPolicies) },
  ClickedLabSize: { size: Schema.Literals(['sm', 'lg', 'xl']) },
  PressedLabKey: { key: Schema.String },
  ClickedLabOwnership: {},
  ClickedLabOwnerOpen: { open: Schema.Boolean },
  ClickedLabModal: {},
  ClickedLabTheme: {},
  CompletedSetTheme: {},
}
export const labDefaults = {
  isLabShowClose: true,
  isLabDescription: true,
  isLabTop: false,
  isLabPill: false,
  isLabSurface: false,
  isLabDisabled: false,
  isLabCompact: false,
  isLabAcceptClose: true,
  isLabControlled: false,
  isLabOwnerOpen: false,
  isLabModal: true,
  isLabDark: false,
  labSlot: 'render',
  labHook: 'none',
  labSize: 'sm',
  labKey: '',
  labChanges: [],
} satisfies { readonly [Key in keyof typeof labModelFields]: (typeof labModelFields)[Key]['Type'] }
