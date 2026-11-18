/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
export const accentPresets = [
  { value: 'red', label: 'Red', light: '#E7000B', dark: '#FF6467' },
  { value: 'orange', label: 'Orange', light: '#F54900', dark: '#FF8904' },
  { value: 'amber', label: 'Amber', light: '#E17100', dark: '#FFB900' },
  { value: 'yellow', label: 'Yellow', light: '#D08700', dark: '#FDC700' },
  { value: 'lime', label: 'Lime', light: '#5EA500', dark: '#9AE600' },
  { value: 'green', label: 'Green', light: '#00A63E', dark: '#05DF72' },
  { value: 'emerald', label: 'Emerald', light: '#009966', dark: '#00D492' },
  { value: 'teal', label: 'Teal', light: '#009689', dark: '#00D5BE' },
  { value: 'cyan', label: 'Cyan', light: '#0092B8', dark: '#00D3F2' },
  { value: 'sky', label: 'Sky', light: '#0084D1', dark: '#00BCFF' },
  { value: 'blue', label: 'Blue', light: '#6B97FF', dark: '#6B97FF' },
  { value: 'indigo', label: 'Indigo', light: '#4F39F6', dark: '#7C86FF' },
  { value: 'violet', label: 'Violet', light: '#7F22FE', dark: '#A684FF' },
  { value: 'purple', label: 'Purple', light: '#9810FA', dark: '#C27AFF' },
  { value: 'fuchsia', label: 'Fuchsia', light: '#C800DE', dark: '#ED6AFF' },
  { value: 'pink', label: 'Pink', light: '#E60076', dark: '#FB64B6' },
  { value: 'rose', label: 'Rose', light: '#EC003F', dark: '#FF637E' },
] as const
export const accentSwatches = (dark: boolean) =>
  accentPresets.map((preset) => ({ color: dark ? preset.dark : preset.light, label: preset.label }))
