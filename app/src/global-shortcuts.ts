import { Schema } from 'effect'
import { currentFontFamily, type Settings, type SettingSelection } from './settings'
export const SettingsShortcut = Schema.Literals(['t', 'f', 'r', 's', 'h'])
export type SettingsShortcut = typeof SettingsShortcut.Type
export const shortcutSelection: (settings: Settings, key: SettingsShortcut) => SettingSelection = (
  settings: Settings,
  key: SettingsShortcut,
) => {
  switch (key) {
    case 't':
      return {
        _tag: 'Theme',
        value:
          settings.theme === 'system' ? 'light' : settings.theme === 'light' ? 'dark' : 'system',
      }
    case 'f':
      return {
        _tag: 'Font',
        value:
          settings.font === 'sans'
            ? 'serif'
            : settings.font === 'serif' && settings.customFont !== undefined
              ? 'custom'
              : 'sans',
      }
    case 'r':
      return {
        _tag: 'Shape',
        value:
          settings.shape === 'sharp' ? 'rounded' : settings.shape === 'rounded' ? 'pill' : 'sharp',
      }
    case 's':
      return { _tag: 'Size', value: settings.size === 'default' ? 'compact' : 'default' }
    case 'h':
      return { _tag: 'Hover', value: settings.hover === 'fluid' ? 'standard' : 'fluid' }
  }
}
export const shortcutAnnouncement = (settings: Settings, key: SettingsShortcut) => {
  switch (key) {
    case 't':
      return `Theme set to ${settings.theme}`
    case 'f':
      return `Heading font set to ${currentFontFamily(settings)}`
    case 'r':
      return `Radius set to ${settings.shape}`
    case 's':
      return `Size set to ${settings.size}`
    case 'h':
      return `Hover set to ${settings.hover}`
  }
}
