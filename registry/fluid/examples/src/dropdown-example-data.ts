export const views = ['Teamspaces', 'Recents', 'Favorites', 'Shared', 'Private']

export const viewIcons = ['square-library', 'clock', 'star', 'users', 'lock'] as const

export const folders = ['Inbox', 'Design', 'Engineering', 'Marketing', 'Archive']

export const statuses = ['Open', 'In progress', 'In review', 'Blocked', 'Done', 'Archived']

export const labels = [
  'Bug',
  'Feature',
  'Docs',
  'Design',
  'Performance',
  'Accessibility',
  'Refactor',
  'Testing',
  'Infrastructure',
  'Security',
  'Good first issue',
  'Help wanted',
]

export const components = [
  'Accordion',
  'Badge',
  'Button',
  'Card',
  'CheckboxGroup',
  'ColorPicker',
  'Combobox',
  'Dialog',
  'Dropdown',
  'InputGroup',
  'RadioGroup',
  'Select',
  'Sidebar',
  'Slider',
  'Switch',
  'Table',
  'Tabs',
]

export const languages = [
  'Auto detect',
  'Albanian (Albania)',
  'Arabic',
  'Bengali',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Czech',
  'Danish',
  'Dutch',
  'English (UK)',
  'English (US)',
  'Finnish',
  'French',
  'German',
  'Greek',
  'Hebrew',
  'Hindi',
  'Hungarian',
  'Indonesian',
  'Italian',
  'Japanese',
  'Korean',
  'Norwegian',
  'Polish',
  'Portuguese (Brazil)',
  'Portuguese (Portugal)',
  'Romanian',
  'Russian',
  'Spanish',
  'Swedish',
  'Thai',
  'Turkish',
  'Ukrainian',
  'Vietnamese',
]

export const matches = (values: ReadonlyArray<string>, query: string) =>
  values.filter((value) => value.toLowerCase().includes(query.toLowerCase()))

export const toggle = <Value>(values: ReadonlyArray<Value>, value: Value) =>
  values.includes(value) ? values.filter((current) => current !== value) : [...values, value]
