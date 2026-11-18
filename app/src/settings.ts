import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { Match, Schema } from 'effect'
import { accentPresets } from './accents'
import { previewOptionsFromUrl } from './playground/options'
import { FontChoice, FontWeight } from './fonts/catalogue'
import { memoizeObject } from './view-inputs'

export const Settings = Schema.Struct({
  theme: Schema.Literals(['system', 'light', 'dark']),
  accent: Schema.Union([
    Schema.Literals(accentPresets.map((preset) => preset.value)),
    Schema.String.check(Schema.isPattern(/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu)),
  ]),
  font: Schema.Literals(['serif', 'sans', 'custom']),
  customFont: Schema.optionalKey(FontChoice),
  shape: Schema.Literals(['sharp', 'rounded', 'pill']),
  size: Schema.Literals(['default', 'compact']),
  hover: Schema.Literals(['fluid', 'standard']),
}).check(Schema.makeFilter((value) => value.font !== 'custom' || value.customFont !== undefined))
export type Settings = typeof Settings.Type
export const ResolvedTheme = Schema.Literals(['light', 'dark'])
export type ResolvedTheme = typeof ResolvedTheme.Type
export type ResolvedSettings = Omit<Settings, 'theme'> & { readonly theme: ResolvedTheme }
const lightSettings = memoizeObject(
  (settings: Settings) =>
    ({
      ...settings,
      theme: 'light',
    }) satisfies ResolvedSettings,
)
const darkSettings = memoizeObject(
  (settings: Settings) =>
    ({
      ...settings,
      theme: 'dark',
    }) satisfies ResolvedSettings,
)
export const resolveTheme: (settings: Settings, systemTheme: ResolvedTheme) => ResolvedTheme = (
  settings: Settings,
  systemTheme: ResolvedTheme,
) => (settings.theme === 'system' ? systemTheme : settings.theme)
export const resolveSettings: (
  settings: Settings,
  systemTheme?: ResolvedTheme,
) => ResolvedSettings = (settings: Settings, systemTheme: ResolvedTheme = 'light') =>
  (resolveTheme(settings, systemTheme) === 'dark'
    ? darkSettings(settings)
    : lightSettings(settings)) satisfies ResolvedSettings
export const ComponentPresentation = Schema.Struct({
  theme: ResolvedTheme,
  accent: Settings.fields.accent,
  shape: Settings.fields.shape,
  size: Settings.fields.size,
  hover: Settings.fields.hover,
})
export type ComponentPresentation = typeof ComponentPresentation.Type
export const componentPresentation: (
  settings: Settings,
  systemTheme?: ResolvedTheme,
) => ComponentPresentation = (settings: Settings, systemTheme: ResolvedTheme = 'light') =>
  ({
    theme: resolveTheme(settings, systemTheme),
    accent: settings.accent,
    shape: settings.shape,
    size: settings.size,
    hover: settings.hover,
  }) satisfies ComponentPresentation
export const SettingSelection = Schema.Union([
  Schema.TaggedStruct('Theme', { value: Settings.fields.theme }),
  Schema.TaggedStruct('Accent', { value: Settings.fields.accent }),
  Schema.TaggedStruct('Font', { value: Settings.fields.font }),
  Schema.TaggedStruct('CustomFont', { value: FontChoice }),
  Schema.TaggedStruct('FontWeight', { value: FontWeight }),
  Schema.TaggedStruct('Shape', { value: Settings.fields.shape }),
  Schema.TaggedStruct('Size', { value: Settings.fields.size }),
  Schema.TaggedStruct('Hover', { value: Settings.fields.hover }),
])
export type SettingSelection = typeof SettingSelection.Type
export const applySelection: (settings: Settings, selection: SettingSelection) => Settings = (
  settings: Settings,
  selection: SettingSelection,
) =>
  Match.value(selection).pipe(
    Match.withReturnType<Settings>(),
    Match.tag('Theme', ({ value }) => ({ ...settings, theme: value })),
    Match.tag('Accent', ({ value }) => ({ ...settings, accent: value })),
    Match.tag('Font', ({ value }) =>
      value === 'custom' && settings.customFont === undefined
        ? settings
        : { ...settings, font: value },
    ),
    Match.tag('CustomFont', ({ value }) => ({ ...settings, font: 'custom', customFont: value })),
    Match.tag('FontWeight', ({ value }) =>
      settings.customFont === undefined
        ? settings
        : { ...settings, customFont: { ...settings.customFont, weight: value } },
    ),
    Match.tag('Shape', ({ value }) => ({ ...settings, shape: value })),
    Match.tag('Size', ({ value }) => ({ ...settings, size: value })),
    Match.tag('Hover', ({ value }) => ({ ...settings, hover: value })),
    Match.exhaustive,
  )
export const settingsEqual = Schema.toEquivalence(Settings)
export const componentPresentationEqual = Schema.toEquivalence(ComponentPresentation)
export const defaults: Settings = {
  theme: 'system',
  accent: 'blue',
  font: 'sans',
  shape: 'sharp',
  size: 'default',
  hover: 'fluid',
}
export const accentColor = (accent: Settings['accent'], theme: Settings['theme'] = 'light') => {
  const preset = accentPresets.find((preset) => preset.value === accent)
  return preset === undefined ? accent : theme === 'dark' ? preset.dark : preset.light
}
export const accentName = (color: string, theme: Settings['theme']) =>
  accentPresets.find(
    (preset) => accentColor(preset.value, theme).toLowerCase() === color.toLowerCase(),
  )?.value ?? color
export const settingsFromUrl: (url: string) => Settings = (url: string) => {
  const query = new URL(url).searchParams
  const read: <A>(key: string, schema: Schema.Schema<A>, fallback: A) => A = <A>(
    key: string,
    schema: Schema.Schema<A>,
    fallback: A,
  ) => {
    const value = query.get(key)
    return (Schema.is(schema)(value) ? value : fallback) satisfies A
  }
  const family = query.get('family')
  const weight = Number(query.get('weight'))
  const customFont =
    family !== null && Schema.is(FontChoice.fields.family)(family)
      ? { family, weight: query.has('weight') && Schema.is(FontWeight)(weight) ? weight : null }
      : undefined
  const font = read('font', Settings.fields.font, defaults.font)
  return {
    theme: read('theme', Settings.fields.theme, defaults.theme),
    accent: read('accent', Settings.fields.accent, defaults.accent),
    font: font === 'custom' && customFont === undefined ? 'sans' : font,
    ...(customFont === undefined ? {} : { customFont }),
    shape: read('shape', Settings.fields.shape, defaults.shape),
    size: read('size', Settings.fields.size, defaults.size),
    hover: read('hover', Settings.fields.hover, defaults.hover),
  }
}
export const settingsFromLocation: (url: string) => Settings = (url: string) => {
  const settings = settingsFromUrl(url)
  const preview = previewOptionsFromUrl(url)
  return {
    ...settings,
    shape: preview.shape ?? settings.shape,
    hover: preview.hover ?? settings.hover,
    size: preview.size === 'default' || preview.size === 'compact' ? preview.size : settings.size,
  }
}
export const settingsQuery = (settings: Settings) => {
  const query = new URLSearchParams()
  for (const key of ['theme', 'accent', 'font', 'shape', 'size', 'hover'] as const)
    if (settings[key] !== defaults[key]) query.set(key, settings[key])
  if (settings.customFont !== undefined) {
    query.set('family', settings.customFont.family)
    if (settings.customFont.weight !== null) query.set('weight', String(settings.customFont.weight))
  }
  return query.size === 0 ? '' : `?${query}`
}
export const presentation = (settings: Pick<Settings, 'shape' | 'size' | 'hover'>) =>
  createPresentationContext({
    shape: settings.shape,
    size: settings.size,
    hoverMode: settings.hover,
    hasShapeProvider: true,
    hasSizeProvider: true,
    reducedMotion: 'user',
  })

export const currentFontFamily: (settings: Settings) => string = (settings: Settings) =>
  settings.font === 'custom' && settings.customFont !== undefined
    ? settings.customFont.family
    : settings.font === 'serif'
      ? 'Geist Serif'
      : 'Inter Variable'
export const headingFontPresentation = (settings: Settings) => ({
  mode: settings.font,
  family:
    settings.font === 'serif'
      ? '"Geist Serif", serif'
      : `"${currentFontFamily(settings)}", var(--font-sans)`,
  weight:
    settings.font === 'serif'
      ? 400
      : settings.font === 'custom'
        ? (settings.customFont?.weight ?? 550)
        : 550,
  displayWeight:
    settings.font === 'serif'
      ? 400
      : settings.font === 'custom'
        ? (settings.customFont?.weight ?? 700)
        : 700,
  fontVariationSettings: settings.font === 'sans' ? '"opsz" 25, "wght" 550' : 'normal',
})
