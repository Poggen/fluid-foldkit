/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { settingsSections } from './sidebar-settings-data.js'

export const settingsNavItems = settingsSections.map(({ id, label }) => ({
  value: id,
  label,
  href: id,
  disabled: false,
  status: null,
  badge: null,
  level: 0,
}))

export const settingsChoices = settingsSections.map(({ id, label }) => ({ value: id, label }))
