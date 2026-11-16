// Fluid Functionalism cc276ca0 command-menu docs and preset data. MIT.
export {
  sourceItems as items,
  sourceTabs as tabs,
  sourceSuggestions as suggestions,
} from '../../../registry/fluid/examples/src/command-menu-source-data'
export const types = [
  { value: 'all', label: 'All types' },
  ...['Actions', 'Go to', 'Help'].map((value) => ({ value, label: value })),
]
export const sorts = [
  { value: 'default', label: 'Default order' },
  { value: 'az', label: 'A to Z' },
]
export const sections = [
  {
    key: 'basic',
    title: 'Basic',
    description:
      'Type to filter, press ↓ ↑ to move, Enter to run. Rows come from items, grouped by group.',
  },
  {
    key: 'details',
    title: 'Descriptions, shortcuts, disabled rows',
    description:
      '3 more fields per row: description, shortcut caps, and disabled, which the arrows skip. Type clipboard: keywords match too.',
  },
  {
    key: 'suggestions',
    title: 'Suggestions',
    description: '3 suggested rows lead until you type 1 letter, then the groups take over.',
  },
  {
    key: 'tabs',
    title: 'Tabs',
    description:
      'Click a tab or press ← →, then derive items from the value. Children hug the row’s end: put CommandMenuFilters there to share the line.',
  },
  {
    key: 'filters',
    title: 'Filters',
    description:
      'A frameless compact row under the field: drop borderless Selects or ghost Buttons in.',
  },
  {
    key: 'dialog',
    title: 'Dialog and trigger shortcut',
    description: 'Press ⌘P or Ctrl+P anywhere on this page. A pick or Escape closes it.',
  },
  {
    key: 'footer',
    title: 'Footer hints',
    description:
      '4 hints at most, following the menu: ← → with tabs, Esc in a dialog, and ↵ named after the highlighted row (its action, or its label). Pass hints for your own.',
  },
  {
    key: 'custom',
    title: 'Custom rows',
    description:
      '1 CommandMenuItem per row from renderItem: children replace the label, the icon and caps stay.',
  },
]
