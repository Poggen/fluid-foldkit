import { Schema } from 'effect'

export const FontFamily = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(150),
  Schema.makeFilter(
    (value: string) =>
      !Array.from(value).some(
        (character) => character === '"' || character === '\\' || character.charCodeAt(0) < 32,
      ),
  ),
)
export const GoogleFont = Schema.Struct({
  name: FontFamily,
  category: Schema.Literals([
    'serif',
    'sans-serif',
    'display',
    'handwriting',
    'monospace',
    'other',
  ]),
  weights: Schema.Array(Schema.Int),
  italicOnly: Schema.Boolean,
  weightAxis: Schema.NullOr(Schema.Tuple([Schema.Number, Schema.Number])),
  opticalAxis: Schema.NullOr(Schema.Tuple([Schema.Number, Schema.Number])),
})
export type GoogleFont = typeof GoogleFont.Type
export const FontCatalogue = Schema.Struct({
  source: Schema.String,
  retrieved: Schema.String,
  fonts: Schema.Array(GoogleFont),
})
export type FontCatalogue = typeof FontCatalogue.Type
export const FontWeight = Schema.NullOr(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1000 })),
)
export const FontChoice = Schema.Struct({ family: FontFamily, weight: FontWeight })
export type FontChoice = typeof FontChoice.Type
export const categories = [
  { value: 'all', label: 'All' },
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans serif' },
  { value: 'handwriting', label: 'Handwriting' },
  { value: 'monospace', label: 'Mono' },
  { value: 'other', label: 'Other' },
]
const popular = [
  'Playfair Display',
  'Fraunces',
  'Instrument Serif',
  'DM Serif Display',
  'Newsreader',
  'Literata',
  'Lora',
  'EB Garamond',
  'Cormorant Garamond',
  'Libre Baskerville',
  'Young Serif',
  'Bricolage Grotesque',
  'Space Grotesk',
  'Manrope',
  'DM Sans',
  'Syne',
  'Montserrat',
  'Poppins',
]
export const matchingFonts = (
  fonts: readonly GoogleFont[],
  query: string,
  category: string,
  current: string | null,
) => {
  const available = fonts.filter(
    (font) =>
      category === 'all' ||
      (category === 'other'
        ? font.category === 'display' || font.category === 'other'
        : font.category === category),
  )
  const q = query.trim().toLocaleLowerCase('en-US')
  if (q)
    return [
      ...available.filter((font) => font.name.toLocaleLowerCase('en-US').startsWith(q)),
      ...available.filter(
        (font) =>
          !font.name.toLocaleLowerCase('en-US').startsWith(q) &&
          font.name.toLocaleLowerCase('en-US').includes(q),
      ),
    ].slice(0, 50)
  const preferred = [current, ...popular]
    .flatMap((name) => available.find((font) => font.name === name) ?? [])
    .filter((font, index, all) => all.indexOf(font) === index)
  return (
    category === 'all'
      ? preferred
      : [...preferred, ...available.filter((font) => !preferred.includes(font))]
  ).slice(0, 50)
}
export const fontWeights = (font: GoogleFont): readonly number[] => {
  if (font.weightAxis === null) return font.weights
  const [min, max] = font.weightAxis
  const weights: number[] = []
  for (let weight = Math.ceil(min / 100) * 100; weight <= max; weight += 100) weights.push(weight)
  return weights.length ? weights : [min]
}
export const nearestWeight = (font: GoogleFont, weight: number): number =>
  fontWeights(font).reduce(
    (best, candidate) =>
      Math.abs(candidate - weight) < Math.abs(best - weight) ? candidate : best,
    fontWeights(font)[0] ?? 400,
  )
const familyParameter = (family: string) => encodeURIComponent(family).replaceAll('%20', '+')
const fullSpec = (font: GoogleFont) => {
  if (font.weightAxis !== null) {
    const tags = [
      ...(font.italicOnly ? ['ital'] : []),
      ...(font.opticalAxis ? ['opsz'] : []),
      'wght',
    ]
    const values = [
      ...(font.italicOnly ? ['1'] : []),
      ...(font.opticalAxis ? [`${font.opticalAxis[0]}..${font.opticalAxis[1]}`] : []),
      `${font.weightAxis[0]}..${font.weightAxis[1]}`,
    ]
    return `:${tags.join(',')}@${values.join(',')}`
  }
  const weights = font.weights.length ? font.weights : [400]
  return font.italicOnly
    ? `:ital,wght@${weights.map((weight) => `1,${weight}`).join(';')}`
    : `:wght@${weights.join(';')}`
}
export const fontStylesheet = (font: GoogleFont) =>
  `https://fonts.googleapis.com/css2?family=${familyParameter(font.name)}${fullSpec(font)}&display=swap`
export const previewStylesheet = (fonts: readonly GoogleFont[]) => {
  const families = fonts
    .map((font) => {
      const weight = font.weightAxis
        ? Math.min(Math.max(400, font.weightAxis[0]), font.weightAxis[1])
        : font.weights.includes(400)
          ? 400
          : (font.weights[0] ?? 400)
      return `family=${familyParameter(font.name)}${font.italicOnly ? `:ital,wght@1,${weight}` : `:wght@${weight}`}`
    })
    .join('&')
  const text = [...new Set(fonts.flatMap((font) => Array.from(font.name)))].sort().join('')
  return `https://fonts.googleapis.com/css2?${families}&text=${encodeURIComponent(text)}&display=swap`
}
