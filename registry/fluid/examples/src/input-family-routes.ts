import { pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion } from 'foldkit/route'

const Page = defineRouteUnion({ Home: {}, InputFamily: {} })

export const homeRouter = pipe(Route.root, Route.mapTo(Page.Home))

export const inputFamilyRouter = pipe(
  Route.literal('input-family.html'),
  Route.mapTo(Page.InputFamily),
)
