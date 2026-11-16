import type { showcasePages } from './showcase-pages.js'

export type ShowcaseFile = (typeof showcasePages)[number]['file']

export interface CatalogueExample {
  readonly file: ShowcaseFile
  readonly label: string
  readonly query?: string
}

export interface CatalogueFamily {
  readonly slug: string
  readonly name: string
  readonly entryPoints: ReadonlyArray<string>
  readonly examples: ReadonlyArray<CatalogueExample>
  readonly exampleKind: 'focused' | 'composed' | 'missing'
  readonly states: string
  readonly testOwners: ReadonlyArray<string>
  readonly note: string
}
