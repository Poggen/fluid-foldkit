import { Effect, Option, Schema } from 'effect'
import { AsyncData } from 'foldkit'
import { Query } from 'foldkit/experimental'
import { pageAt } from '../../../lib/catalogue'
import { ReferenceClient, ReferenceData } from './data'

export const ReferenceQuery = Query.define({
  name: 'ComponentReferenceQuery',
  args: { family: Schema.Literals(['fluid', 'charts']), slug: Schema.String },
  data: ReferenceData,
  error: Schema.String,
  maxSettledEntries: 8,
  notifyOnCompletion: true,
  handler: function* () {
    const client = yield* ReferenceClient
    return ({ family, slug }) =>
      client.load(family, slug).pipe(Effect.mapError((error) => error.message))
  },
})

export const referenceArgs = (path: string) => {
  const page = pageAt(path)
  return page === undefined ? Option.none() : Option.some({ family: page.family, slug: page.slug })
}
export const readReference = (query: typeof ReferenceQuery.Model.Type, path: string) =>
  Option.match(referenceArgs(path), {
    onNone: () => AsyncData.Idle(),
    onSome: (args) => ReferenceQuery.read(query, args),
  })
export const referenceContractIndexes = (query: typeof ReferenceQuery.Model.Type, path: string) =>
  Option.match(AsyncData.getData(readReference(query, path)), {
    onNone: () => [],
    onSome: (data) =>
      data.contracts.flatMap((contract, index) => (contract.props.length ? [index] : [])),
  })
