/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Schema } from 'effect'
import type { SelectOption } from './select.js'
export const settingsChoices: (
  section: SettingsSection,
  index: number,
) => { readonly items: ReadonlyArray<SelectOption>; readonly value: string } =
  function settingsChoices(section: SettingsSection, index: number) {
    if (section === 'members') return { items: roles, value: members[index]?.role ?? 'member' }
    if (section === 'appearance')
      return index === 0 ? { items: themes, value: 'system' } : { items: density, value: 'default' }
    return index === 0 ? { items: languages, value: 'en' } : { items: timezones, value: 'utc+1' }
  }

export const SettingsSection = Schema.Literals([
  'general',
  'notifications',
  'appearance',
  'security',
  'members',
])
export type SettingsSection = typeof SettingsSection.Type
export const settingsSection: (value: string) => SettingsSection = (value: string) =>
  Schema.is(SettingsSection)(value) ? value : 'general'
export const settingsSections = [
  {
    id: 'general',
    label: 'General',
    icon: 'settings',
    description: 'Workspace name, language, and region.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'bell',
    description: 'What reaches your inbox and when.',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: 'palette',
    description: 'Theme and density for this device.',
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'shield',
    description: 'Sign-in protection and active sessions.',
  },
  { id: 'members', label: 'Members', icon: 'users', description: 'Who can access this workspace.' },
] as const
export const members = [
  { name: 'Jane Doe', email: 'jane@acme.com', role: 'owner' },
  { name: 'Sam Park', email: 'sam@acme.com', role: 'admin' },
  { name: 'Ravi Patel', email: 'ravi@acme.com', role: 'member' },
]
const options: (values: ReadonlyArray<readonly [string, string]>) => ReadonlyArray<SelectOption> = (
  values: ReadonlyArray<readonly [string, string]>,
) => values.map(([value, label]) => ({ value, label }))
const languages = options([
  ['en', 'English'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['ja', '日本語'],
])
const timezones = options([
  ['utc-8', '(UTC−8) Pacific'],
  ['utc-5', '(UTC−5) Eastern'],
  ['utc+0', '(UTC+0) London'],
  ['utc+1', '(UTC+1) Paris'],
  ['utc+9', '(UTC+9) Tokyo'],
])
const themes = options([
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
])
const density = options([
  ['default', 'Default'],
  ['compact', 'Compact'],
])
const roles = options([
  ['owner', 'Owner'],
  ['admin', 'Admin'],
  ['member', 'Member'],
])
export function settingsSwitchRows(section: SettingsSection) {
  return section === 'security'
    ? [
        {
          label: 'Two-factor authentication',
          description: 'A code from your authenticator app at sign-in.',
        },
        { label: 'New sign-in alerts', description: 'Email when a new device signs in.' },
      ]
    : [
        { label: 'Daily digest', description: 'One email each morning with what changed.' },
        { label: 'Mentions', description: 'When someone @-mentions you.' },
        { label: 'Product updates', description: 'New features, once a month at most.' },
      ]
}
