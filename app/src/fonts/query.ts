import { Effect, Schema } from 'effect'
import { Query } from 'foldkit/experimental'
import { FontCatalogue } from './catalogue'

export const loadFontCatalogue = Effect.tryPromise(() => import('./catalogue.json')).pipe(
  Effect.flatMap((module) => Schema.decodeUnknownEffect(FontCatalogue)(module.default)),
  Effect.mapError(() => 'The font list did not load. Try again.'),
)

export const FontCatalogueQuery = Query.define({
  name: 'GoogleFontCatalogue',
  data: FontCatalogue,
  error: Schema.String,
  notifyOnCompletion: true,
  handler: function* () {
    return () => loadFontCatalogue
  },
})
