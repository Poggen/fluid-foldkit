import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion } from 'foldkit/route'
import { componentPages, knownPath } from '../../lib/catalogue'
import { systemPages } from '../../lib/system'

export const ramkaExampleFromUrl = (href: string) => {
  const url = new URL(href)
  return url.pathname === '/ramka/lightbox' && url.searchParams.get('example') === 'photos-app'
    ? 'photos-app'
    : null
}

export const SiteRoute = defineRouteUnion({
  Showcase: {},
  Introduction: {},
  Installation: {},
  Blocks: {},
  Motion: {},
  FluidHover: {},
  Reveal: {},
  Scrollbars: {},
  Sizes: {},
  Skill: {},
  Surfaces: {},
  Typography: {},

  LegacyDoc: { slug: Schema.String },
  FluidComponent: { slug: Schema.String },
  ChartComponent: { slug: Schema.String },
  NotFound: { path: Schema.String },
})
export const showcaseRouter = pipe(Route.root, Route.mapTo(SiteRoute.Showcase))
export const introductionRouter = pipe(
  Route.literal('introduction'),
  Route.mapTo(SiteRoute.Introduction),
)
export const installationRouter = pipe(
  Route.literal('installation'),
  Route.mapTo(SiteRoute.Installation),
)
export const blocksRouter = pipe(Route.literal('blocks'), Route.mapTo(SiteRoute.Blocks))
export const motionRouter = pipe(Route.literal('motion'), Route.mapTo(SiteRoute.Motion))
export const fluidhoverRouter = pipe(
  Route.literal('fluid-hover'),
  Route.mapTo(SiteRoute.FluidHover),
)
export const revealRouter = pipe(Route.literal('reveal'), Route.mapTo(SiteRoute.Reveal))
export const scrollbarsRouter = pipe(Route.literal('scrollbars'), Route.mapTo(SiteRoute.Scrollbars))
export const sizesRouter = pipe(Route.literal('sizes'), Route.mapTo(SiteRoute.Sizes))
export const skillRouter = pipe(Route.literal('skill'), Route.mapTo(SiteRoute.Skill))
export const surfacesRouter = pipe(Route.literal('surfaces'), Route.mapTo(SiteRoute.Surfaces))
export const typographyRouter = pipe(Route.literal('typography'), Route.mapTo(SiteRoute.Typography))
const docsIndexRouter = pipe(Route.literal('docs'), Route.mapTo(SiteRoute.Introduction))
const legacyDocRouter = pipe(
  Route.literal('docs'),
  Route.slash(Route.string('slug')),
  Route.mapTo(SiteRoute.LegacyDoc),
)
export const fluidComponentRouter = pipe(
  Route.literal('components'),
  Route.slash(Route.string('slug')),
  Route.mapTo(SiteRoute.FluidComponent),
)
export const chartComponentRouter = pipe(
  Route.literal('charts'),
  Route.slash(Route.string('slug')),
  Route.mapTo(SiteRoute.ChartComponent),
)
export const urlToSiteRoute = Route.parseUrlWithFallback(
  Route.oneOf(
    showcaseRouter,
    docsIndexRouter,
    legacyDocRouter,
    introductionRouter,
    installationRouter,
    blocksRouter,
    motionRouter,
    fluidhoverRouter,
    revealRouter,
    scrollbarsRouter,
    sizesRouter,
    skillRouter,
    surfacesRouter,
    typographyRouter,

    fluidComponentRouter,
    chartComponentRouter,
  ),
  SiteRoute.NotFound,
)
export const pathFromUrl: (url: Parameters<typeof urlToSiteRoute>[0]) => string = (
  url: Parameters<typeof urlToSiteRoute>[0],
) =>
  SiteRoute.match(urlToSiteRoute(url), {
    Showcase: () => showcaseRouter(),
    Introduction: () => introductionRouter(),
    Installation: () => installationRouter(),
    Blocks: () => blocksRouter(),
    Motion: () => motionRouter(),
    FluidHover: () => fluidhoverRouter(),
    Reveal: () => revealRouter(),
    Scrollbars: () => scrollbarsRouter(),
    Sizes: () => sizesRouter(),
    Skill: () => skillRouter(),
    Surfaces: () => surfacesRouter(),
    Typography: () => typographyRouter(),

    LegacyDoc: ({ slug }) =>
      [...systemPages, ...componentPages].find((page) => page.slug === slug)?.href ??
      (knownPath(`/${slug}`) ? `/${slug}` : `/docs/${slug}`),
    FluidComponent: (fields) => fluidComponentRouter(fields),
    ChartComponent: (fields) => chartComponentRouter(fields),
    NotFound: ({ path }) => path,
  })
