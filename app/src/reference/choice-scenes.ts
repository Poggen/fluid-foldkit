import type { SelectOption } from '@foldkit-visuals/fluid/select'
import {
  FRAMEWORKS,
  TIMEZONES,
  COMBOBOX_COMPONENTS,
  fruits,
  themeRows,
  settingRows,
  selectTimezones,
  viewRows,
} from './choice-data'
export interface ChoiceScene {
  readonly title: string
  readonly rows: ReadonlyArray<{
    readonly key: string
    readonly items: ReadonlyArray<SelectOption>
    readonly placeholder: string
    readonly initial?: string | ReadonlyArray<string>
    readonly multiple?: boolean
    readonly disabled?: boolean
    readonly hideSelected?: boolean
    readonly allowCreate?: boolean
    readonly variant?: 'bordered' | 'borderless'
    readonly error?: string
    readonly icons?: 'theme' | 'settings' | 'view' | 'globe'
    readonly width?: string
  }>
  readonly description?: string
}
export const selectScenes: ReadonlyArray<ChoiceScene> = [
  { title: 'Basic', rows: [{ key: 'basic', items: fruits, placeholder: 'Select a fruit…' }] },
  {
    title: 'Variants',
    rows: [
      { key: 'bordered', items: fruits.slice(0, 3), placeholder: 'Bordered' },
      {
        key: 'borderless',
        items: fruits.slice(0, 3),
        placeholder: 'Borderless',
        variant: 'borderless',
      },
    ],
  },
  {
    title: 'With Icons',
    rows: [
      { key: 'icons', items: themeRows, initial: 'system', placeholder: 'Theme', icons: 'theme' },
    ],
  },
  {
    title: 'Groups',
    rows: [{ key: 'groups', items: settingRows, placeholder: 'Settings…', icons: 'settings' }],
  },
  {
    title: 'Scrollable List',
    rows: [
      { key: 'timezones', items: selectTimezones, placeholder: 'Select timezone…', icons: 'globe' },
    ],
  },
  {
    title: 'Error State',
    rows: [
      {
        key: 'error',
        items: ['Admin', 'Editor', 'Viewer'].map((label) => ({
          label,
          value: label.toLowerCase(),
        })),
        placeholder: 'Select a role…',
        error: 'Please select a role to continue.',
      },
    ],
  },
  {
    title: 'Disabled',
    rows: [
      {
        key: 'disabled',
        items: [{ value: 'a', label: 'Option A' }],
        placeholder: 'Disabled',
        disabled: true,
      },
      {
        key: 'disabled-row',
        items: [
          { value: 'a', label: 'Available' },
          { value: 'b', label: 'Unavailable', disabled: true },
          { value: 'c', label: 'Available' },
        ],
        placeholder: 'Some disabled…',
      },
    ],
  },
]
export const comboScenes: ReadonlyArray<ChoiceScene> = [
  {
    title: 'Basic',
    description:
      'Items are data on the root, ComboboxList renders a row per match. Type, then press Enter to pick the highlighted row.',
    rows: [{ key: 'basic', items: FRAMEWORKS, placeholder: 'Select a framework…' }],
  },
  {
    title: 'With icons',
    rows: [
      {
        key: 'icons',
        items: viewRows,
        placeholder: 'Jump to view…',
        icons: 'view',
        width: 'w-[224px]',
      },
    ],
  },
  {
    title: 'Multiple selection',
    description:
      'multiple plus ComboboxChips: 1 chip per pick, touching picks share one background. Press Backspace in an empty field to drop the last chip.',
    rows: [
      {
        key: 'multiple',
        items: FRAMEWORKS,
        initial: ['next', 'astro'],
        multiple: true,
        placeholder: 'Add frameworks…',
        width: 'w-[360px] max-w-full',
      },
    ],
  },
  {
    title: 'Create from the query',
    description:
      'onCreate adds a last row whenever the query matches no label exactly. Type a component that is not there, then press Enter.',
    rows: [
      {
        key: 'create',
        items: COMBOBOX_COMPONENTS,
        initial: ['button', 'combobox'],
        multiple: true,
        allowCreate: true,
        placeholder: 'Add components…',
        width: 'w-[360px] max-w-full',
      },
    ],
  },
  {
    title: 'Hide picked rows',
    description: 'Picked items leave the list. Remove a chip to make its row available again.',
    rows: [
      {
        key: 'hide',
        items: COMBOBOX_COMPONENTS,
        initial: ['button', 'combobox'],
        multiple: true,
        hideSelected: true,
        placeholder: 'Add components…',
        width: 'w-[360px] max-w-full',
      },
    ],
  },
  {
    title: 'Variants',
    rows: [
      { key: 'bordered', items: FRAMEWORKS, placeholder: 'Bordered' },
      { key: 'borderless', items: FRAMEWORKS, placeholder: 'Borderless', variant: 'borderless' },
    ],
  },
  {
    title: 'Long list',
    description: 'String items are their own value and label. The list scrolls past 300px.',
    rows: [
      {
        key: 'long',
        items: TIMEZONES.map((label) => ({ value: label, label })),
        placeholder: 'Search timezones…',
        icons: 'globe',
        width: 'w-[280px]',
      },
    ],
  },
  {
    title: 'Error & disabled',
    rows: [
      {
        key: 'error',
        items: FRAMEWORKS,
        placeholder: 'Select a framework…',
        error: 'Pick a framework to continue.',
      },
      { key: 'disabled', items: FRAMEWORKS, placeholder: 'Disabled', disabled: true },
    ],
  },
]
