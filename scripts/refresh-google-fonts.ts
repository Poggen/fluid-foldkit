import { writeFile } from 'node:fs/promises'
import { FontCatalogue } from '../app/src/fonts/catalogue'
import { Schema } from 'effect'
const source = 'https://fonts.google.com/metadata/fonts'
const Metadata = Schema.Struct({
  familyMetadataList: Schema.Array(
    Schema.Struct({
      family: Schema.String,
      category: Schema.String,
      fonts: Schema.Record(Schema.String, Schema.Unknown),
      axes: Schema.Array(
        Schema.Struct({ tag: Schema.String, min: Schema.Number, max: Schema.Number }),
      ),
    }),
  ),
})
const response = await fetch(source)
if (!response.ok) throw new Error(`Google Fonts metadata returned ${response.status}`)
const raw: unknown = JSON.parse((await response.text()).replace(/^\)\]\}'\s*/u, ''))
const metadata = Schema.decodeUnknownSync(Metadata)(raw)
const category: (value: string) => (typeof FontCatalogue.Type.fonts)[number]['category'] = (
  value: string,
) => {
  switch (value) {
    case 'Serif':
      return 'serif'
    case 'Sans Serif':
      return 'sans-serif'
    case 'Display':
      return 'display'
    case 'Handwriting':
      return 'handwriting'
    case 'Monospace':
      return 'monospace'
    default:
      return 'other'
  }
}
const fonts = metadata.familyMetadataList
  .map((font) => {
    const normal = Object.keys(font.fonts).filter((key) => /^\d+$/u.test(key))
    const axis: (tag: string) => readonly [number, number] | null = (tag: string) => {
      const found = font.axes.find((axis) => axis.tag === tag)
      return found === undefined ? null : [found.min, found.max]
    }
    return {
      name: font.family,
      category: category(font.category),
      weights: (normal.length ? normal : Object.keys(font.fonts))
        .map((key) => Number.parseInt(key, 10))
        .filter(Number.isFinite)
        .sort((a, b) => a - b),
      italicOnly: normal.length === 0,
      weightAxis: axis('wght'),
      opticalAxis: axis('opsz'),
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))
const catalogue = Schema.decodeUnknownSync(FontCatalogue)({
  source,
  retrieved: new Date().toISOString().slice(0, 10),
  fonts,
})
if (new Set(fonts.map((font) => font.name)).size !== fonts.length || fonts.length < 1800)
  throw new Error('Google Fonts catalogue is incomplete or has duplicate families')
await writeFile(
  new URL('../app/src/fonts/catalogue.json', import.meta.url),
  `${JSON.stringify(catalogue)}\n`,
)
console.log(`Wrote ${fonts.length} Google Fonts families`)
