import { pipe, Schema } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion } from 'foldkit/route'

const Query = Schema.Struct({
  preset: Schema.optionalKey(Schema.Literals(['source', 'select'])),
  component: Schema.optionalKey(Schema.Literals(['select', 'combobox'])),
})

const Page = defineRouteUnion({ Home: {}, SelectionFamily: Query.fields })

export const homeRouter = pipe(Route.root, Route.mapTo(Page.Home))

export const selectionFamilyRouter = pipe(
  Route.literal('selection-family.html'),
  Route.query(Query),
  Route.mapTo(Page.SelectionFamily),
)
