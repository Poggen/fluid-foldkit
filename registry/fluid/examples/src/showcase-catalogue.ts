import { Match } from 'effect'
import { inertHtml as h } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import { componentCatalogue } from './showcase-components.js'
import { systemCatalogue } from './showcase-systems.js'
import { baseSourceFamilies, FLUID_SOURCE_COMMIT } from './showcase-upstream.js'
import type { CatalogueFamily, ShowcaseFile } from './showcase-catalogue-types.js'

export const catalogueExampleFiles = new Set(
  [...systemCatalogue, ...componentCatalogue].flatMap((family) =>
    family.examples.map((example) => example.file),
  ),
)

const sourceUrl = (slug: string) =>
  `https://github.com/mickadesign/fluid-functionalism/blob/${FLUID_SOURCE_COMMIT}/app/docs/${slug}/page.tsx`

const familyCard: (family: CatalogueFamily, route: (file: ShowcaseFile) => string) => Html = (
  family: CatalogueFamily,
  route: (file: ShowcaseFile) => string,
) => {
  const status = Match.value(family.exampleKind).pipe(
    Match.when('missing', () => 'Example unfinished'),
    Match.when('composed', () => 'Composed example; standalone unfinished'),
    Match.when('focused', () => 'Example available'),
    Match.exhaustive,
  )

  return h.article(
    [
      h.Class(
        'min-w-0 p-4.5 border border-example-border rounded-[12px] bg-white [&_h3]:m-[0_0_8px] [&_h3]:text-[16px] [&_p]:m-[8px_0] [&_code]:wrap-anywhere [&_code]:text-[11px] [&_ul]:ps-[18px] [&_details]:mt-4 [&_summary]:cursor-pointer [&_a]:text-example-catalogue-link [&_a]:underline-offset-[3px] [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-solid [&_a:focus-visible]:outline-example-catalogue-link [&_a:focus-visible]:outline-offset-[3px] [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-solid [&_summary:focus-visible]:outline-example-catalogue-link [&_summary:focus-visible]:outline-offset-[3px]',
      ),
      h.Id(`family-${family.slug}`),
    ],
    [
      h.h3([], [family.name]),
      h.p([h.Class('text-example-quiet text-[12px]')], [`Code present · ${status}`]),
      h.p([], [family.states]),
      h.p(
        [h.Class('text-example-muted text-[12px]')],
        [
          baseSourceFamilies.has(family.slug)
            ? 'Fidelity authority: frozen Base UI original.'
            : 'Fidelity authority: shared original with supported Base dependencies.',
        ],
      ),
      h.div(
        [h.Class('flex flex-wrap gap-[8px_16px] m-[12px_0]')],
        family.examples.map((example) =>
          h.a(
            [
              h.Href(
                `${route(example.file)}${example.query === undefined ? '' : `?${example.query}`}`,
              ),
            ],
            [example.label],
          ),
        ),
      ),
      family.note === '' ? null : h.p([h.Class('text-example-catalogue-note')], [family.note]),
      h.details(
        [],
        [
          h.summary([], ['API and verification']),
          h.ul(
            [],
            family.entryPoints.map((entry) =>
              h.li([], [h.code([], [`@foldkit-visuals/fluid/${entry}`])]),
            ),
          ),
          family.testOwners.length === 0
            ? null
            : h.div(
                [],
                [
                  h.p(
                    [],
                    ['Existing test owners. Their presence does not establish complete coverage.'],
                  ),
                  h.ul(
                    [],
                    family.testOwners.map((test) =>
                      h.li([], [h.code([], [`registry/fluid/test/${test}`])]),
                    ),
                  ),
                ],
              ),
          h.p(
            [],
            [
              'Latest source delta: integrated checks passed; see the port handoff for the recorded cases, limits and approved parity exceptions.',
            ],
          ),
          h.a(
            [
              h.Href(
                baseSourceFamilies.has(family.slug)
                  ? `https://github.com/mickadesign/fluid-functionalism/blob/${FLUID_SOURCE_COMMIT}/registry/base/${family.slug}.tsx`
                  : sourceUrl(family.slug),
              ),
            ],
            [
              baseSourceFamilies.has(family.slug)
                ? 'Pinned Base implementation'
                : 'Pinned shared examples',
            ],
          ),
        ],
      ),
    ],
  )
}

export const showcaseCatalogue: (route: (file: ShowcaseFile) => string) => ReadonlyArray<Html> = (
  route: (file: ShowcaseFile) => string,
) => [
  h.p(
    [h.Class('max-w-[78ch] m-[20px_0_32px] text-example-quiet')],
    [
      'The catalogue follows Fluid cc276ca0: 34 component families and seven systems. The previously reviewed port is accepted after its reported repairs. Latest additions and changes pass integrated type, test, build and browser checks.',
    ],
  ),
  h.section(
    [h.AriaLabel('System')],
    [
      h.h2([h.Class('text-[16px] font-[550] m-0')], ['System']),
      h.div(
        [h.Class('grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3 m-[16px_0_32px]')],
        systemCatalogue.map((family) => familyCard(family, route)),
      ),
      h.p(
        [],
        [
          'The upstream ',
          h.a([h.Href('https://www.fluidfunctionalism.com/docs/skill')], ['Skill guide']),
          ' is documentation, not a native runtime component.',
        ],
      ),
    ],
  ),
  h.section(
    [h.AriaLabel('Components')],
    [
      h.h2(
        [h.Class('text-[16px] font-[550] m-0')],
        [`Components · ${componentCatalogue.length} pinned families`],
      ),
      h.div(
        [h.Class('grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3 m-[16px_0_32px]')],
        componentCatalogue.map((family) => familyCard(family, route)),
      ),
    ],
  ),
]
