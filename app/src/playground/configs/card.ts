/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('card', {
  appearance: Appearance,
  cardOrientation: Schema.Literals(['card', 'inline']),
  columns: Schema.Literals([1, 2, 3]),
  border: Schema.Literals(['none', 'outlined']),
  separated: Schema.Boolean,
  fluidHover: Schema.Boolean,
  selected: Schema.Boolean,
  media: Schema.Literals(['icon', 'logo', 'image', 'none']),
  description: Schema.Boolean,
  primaryBtn: Schema.Boolean,
  secondaryBtn: Schema.Boolean,
  ghostBtn: Schema.Boolean,
  disabled: Schema.Boolean,
  dismissible: Schema.Boolean,
  dismissOnHover: Schema.Boolean,
  label: Schema.String,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'card',
  appearance: {},
  cardOrientation: 'card',
  columns: 2,
  border: 'none',
  separated: false,
  fluidHover: true,
  selected: false,
  media: 'icon',
  description: true,
  primaryBtn: false,
  secondaryBtn: false,
  ghostBtn: false,
  disabled: false,
  dismissible: false,
  dismissOnHover: true,
  label: 'Fluid motion',
})
export const controls = [
  {
    kind: 'choice',
    prop: 'cardOrientation',
    label: 'Orientation',
    group: 'Card group',
    initial: 'card',
    values: ['card', 'inline'],
  },
  {
    kind: 'choice',
    prop: 'columns',
    label: 'Columns',
    group: 'Card group',
    initial: 2,
    values: [1, 2, 3],
  },
  {
    kind: 'choice',
    prop: 'border',
    label: 'Border',
    group: 'Card group',
    initial: 'none',
    values: ['none', 'outlined'],
  },
  { kind: 'toggle', prop: 'separated', label: 'Separated', group: 'Card group', initial: false },
  { kind: 'toggle', prop: 'fluidHover', label: 'Fluid hover', group: 'Card group', initial: true },
  { kind: 'toggle', prop: 'selected', label: 'Selected', group: 'Card group', initial: false },
  {
    kind: 'choice',
    prop: 'media',
    label: 'Media',
    group: 'Card',
    initial: 'icon',
    values: ['icon', 'logo', 'image', 'none'],
  },
  { kind: 'toggle', prop: 'description', label: 'Description', group: 'Card', initial: true },
  { kind: 'toggle', prop: 'primaryBtn', label: 'Primary button', group: 'Card', initial: false },
  {
    kind: 'toggle',
    prop: 'secondaryBtn',
    label: 'Secondary button',
    group: 'Card',
    initial: false,
  },
  { kind: 'toggle', prop: 'ghostBtn', label: 'Ghost button', group: 'Card', initial: false },
  { kind: 'toggle', prop: 'disabled', label: 'Disabled', group: 'Card', initial: false },
  { kind: 'toggle', prop: 'dismissible', label: 'Dismissible', group: 'Card', initial: false },
  {
    kind: 'toggle',
    prop: 'dismissOnHover',
    label: 'Dismiss on hover',
    group: 'Card',
    initial: true,
  },
  {
    kind: 'text',
    prop: 'label',
    label: 'Title',
    group: 'Card',
    initial: 'Fluid motion',
    values: ['Fluid motion', 'Make it yours', 'Studio notes'],
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const columnsOf = (config: Configuration) =>
  config.cardOrientation === 'inline' ? 1 : config.columns
export const separatedOf = (config: Configuration) => config.media === 'image' || config.separated
export const controlsFor: (config: Configuration) => ReadonlyArray<Control> = (
  config: Configuration,
) =>
  controls.map((control) => ({
    ...control,
    enabled:
      control.prop === 'columns'
        ? config.cardOrientation !== 'inline'
        : control.prop === 'separated'
          ? config.media !== 'image'
          : control.prop === 'dismissOnHover'
            ? config.dismissible
            : true,
  }))

export const cardItems = [
  {
    icon: 'circle',
    title: 'Fluid motion',
    description: 'Spring-tuned transitions calibrated across three tiers',
  },
  {
    icon: 'shield',
    title: 'Accessible by default',
    description: 'Focus-visible rings and ARIA roles in every part',
  },
  {
    icon: 'palette',
    title: 'Yours to theme',
    description: 'Swap radius, icons, and primitive at runtime',
  },
  {
    icon: 'moon',
    title: 'Dark mode ready',
    description: 'Tokens adapt to light and dark automatically',
  },
  {
    icon: 'search',
    title: 'Fluid hover',
    description: 'A magnetic highlight previews where a click lands',
  },
  {
    icon: 'lightbulb',
    title: 'Drop-in registry',
    description: 'Install any component with one shadcn command',
  },
] as const
export const cardBanner =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Cdefs%3E%3CradialGradient id='a' cx='12%25' cy='16%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.9'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='90%25' cy='12%25' r='65%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.45'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='82%25' cy='94%25' r='75%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='24%25' cy='90%25' r='68%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.55'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='320' height='180' fill='%23ffffff'/%3E%3Crect width='320' height='180' fill='%236B97FF' fill-opacity='0.2'/%3E%3Crect width='320' height='180' fill='url(%23a)'/%3E%3Crect width='320' height='180' fill='url(%23b)'/%3E%3Crect width='320' height='180' fill='url(%23c)'/%3E%3Crect width='320' height='180' fill='url(%23d)'/%3E%3C/svg%3E"
export const tintCardBanner = (accent: string) =>
  cardBanner.replaceAll('%236B97FF', `%23${accent.replace(/^#/u, '')}`)
