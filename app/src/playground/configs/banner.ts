/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('banner', {
  appearance: Appearance,
  variant: Schema.Literals(['inline', 'fixed']),
  status: Schema.Literals(['default', 'info', 'success', 'warning', 'error']),
  contrast: Schema.Literals(['low', 'high']),
  description: Schema.Boolean,
  primary: Schema.Boolean,
  secondary: Schema.Boolean,
  ghost: Schema.Boolean,
  dismissible: Schema.Boolean,
  label: Schema.String,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'banner',
  appearance: {},
  variant: 'inline',
  status: 'success',
  contrast: 'low',
  description: true,
  primary: true,
  secondary: true,
  ghost: false,
  dismissible: true,
  label: '',
})
export const controls = [
  {
    kind: 'choice',
    prop: 'variant',
    label: 'Variant',
    group: 'Banner',
    initial: 'inline',
    values: ['inline', 'fixed'],
  },
  {
    kind: 'choice',
    prop: 'status',
    label: 'Status',
    group: 'Banner',
    initial: 'success',
    values: ['default', 'info', 'success', 'warning', 'error'],
  },
  {
    kind: 'choice',
    prop: 'contrast',
    label: 'Contrast',
    group: 'Banner',
    initial: 'low',
    values: ['low', 'high'],
  },
  { kind: 'toggle', prop: 'description', label: 'Description', group: 'Content', initial: true },
  { kind: 'toggle', prop: 'primary', label: 'Primary action', group: 'Content', initial: true },
  { kind: 'toggle', prop: 'secondary', label: 'Secondary action', group: 'Content', initial: true },
  { kind: 'toggle', prop: 'ghost', label: 'Ghost action', group: 'Content', initial: false },
  { kind: 'toggle', prop: 'dismissible', label: 'Dismissible', group: 'Content', initial: true },
  {
    kind: 'text',
    prop: 'label',
    label: 'Custom title',
    group: 'Content',
    initial: '',
    values: ['', 'Make it yours', 'Studio notes'],
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor: (_config: Configuration) => ReadonlyArray<Control> = (
  _config: Configuration,
) => controls

export const bannerCopy = {
  default: [
    'Banner is new in Fluid Functionalism',
    '5 statuses, 2 contrasts and a dismiss that collapses its height.',
    'Read the docs',
    'Changelog',
    'Not now',
  ],
  info: [
    'The registry has new components',
    'Run the install command again to pull the latest versions.',
    'Copy command',
    "What's new",
    'Later',
  ],
  success: [
    'Fluid Functionalism is installed',
    'Button, Card and Dialog were added to components/ui.',
    'Open the docs',
    'Add more',
    'Share',
  ],
  warning: [
    'Inter is missing its opsz axis',
    'Labels shift when their weight changes. Add the opsz axis to your font.',
    'Show the fix',
    'Read the guide',
    'Ignore',
  ],
  error: [
    'Couldn’t reach the registry',
    'The registry could not be reached. Try again in a moment.',
    'Retry',
    'Status page',
    'Report issue',
  ],
} as const
