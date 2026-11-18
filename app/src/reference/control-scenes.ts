/* @license Derived from Fluid Functionalism cc276ca0 docs. MIT, copyright 2026 Micka Touillaud. */
import type { SliderConfig } from '@foldkit-visuals/fluid/slider'
export const sliderScenes: ReadonlyArray<{
  readonly title: string
  readonly rows: ReadonlyArray<
    SliderConfig & {
      readonly label?: string
      readonly format?: 'ampere' | 'percent' | 'quality'
    }
  >
}> = [
  {
    title: 'Compact',
    rows: [{ id: 'compact', value: 25, size: 'compact', label: 'Compact slider value' }],
  },
  { title: 'Range', rows: [{ id: 'range', value: [25, 75] }] },
  {
    title: 'Steps',
    rows: [
      { id: 'steps25', value: 50, step: 25, showSteps: true, label: 'Steps of 25' },
      { id: 'steps10', value: 50, step: 10, showSteps: true, label: 'Steps of 10' },
    ],
  },
  {
    title: 'Non-uniform Steps',
    rows: [
      {
        id: 'nonuniform',
        value: 0.7,
        steps: [0.1, 0.5, 0.7, 1.1, 1.3],
        showSteps: true,
        label: 'Rating',
        format: 'ampere',
      },
    ],
  },
  {
    title: 'Value Display',
    rows: [
      { id: 'left', value: 40, valuePosition: 'left', label: 'Volume' },
      { id: 'right', value: 60, valuePosition: 'right', label: 'Volume' },
      { id: 'tooltip', value: 50, valuePosition: 'tooltip', label: 'Tooltip slider value' },
    ],
  },
  {
    title: 'Format',
    rows: [{ id: 'format', value: 75, size: 'compact', format: 'percent', label: 'Opacity' }],
  },
  {
    title: 'Disabled',
    rows: [
      {
        id: 'disabled',
        value: 50,
        size: 'compact',
        disabled: true,
        label: 'Disabled slider value',
      },
    ],
  },
  {
    title: 'Default',
    rows: [{ id: 'default', value: 2, min: 0, max: 4, size: 'default', label: 'Roundness' }],
  },
  {
    title: 'Default — Scrubber',
    rows: [
      {
        id: 'scrubber',
        value: 50,
        min: 0,
        max: 100,
        size: 'default',
        variant: 'scrubber',
        label: 'Volume',
        format: 'percent',
      },
    ],
  },
  {
    title: 'Default — Format',
    rows: [
      {
        id: 'quality',
        value: 2,
        min: 0,
        max: 4,
        size: 'default',
        label: 'Quality',
        format: 'quality',
      },
    ],
  },
  {
    title: 'Default — Disabled',
    rows: [
      {
        id: 'default-disabled',
        value: 2,
        min: 0,
        max: 4,
        size: 'default',
        label: 'Roundness',
        disabled: true,
      },
    ],
  },
]
export const tabsScenes = ['Basic', 'With Icons', 'Active Label'] as const
export const tabsLabels = ['Teamspaces', 'Recents', 'Favorites', 'Shared']
export const checkboxLabels = ['Apples', 'Bananas', 'Cherries', 'Dates']
export const radioLabels = ['Option A', 'Option B', 'Option C']
export const badgeSamples = [
  { color: 'violet', label: 'Fiction' },
  { color: 'amber', label: 'Science' },
  { color: 'green', label: 'Philosophy' },
  { color: 'blue', label: 'History' },
  { color: 'rose', label: 'Poetry' },
] as const
