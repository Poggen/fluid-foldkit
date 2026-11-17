import { codeBlock } from '../../components/docs/code-block'
import { Button } from '@foldkit-visuals/fluid/button'
import { Reveal } from '@foldkit-visuals/fluid/reveal'
import type { HtmlBuilder } from 'foldkit/html'
import { showcaseRouter } from './route'
import type { ResolvedSettings } from './settings'
import { systemAt } from '../../lib/system'
import { narrative } from './system/narrative'
import { headingId } from './system/view'
import { presentation } from './settings'

const articles: Readonly<
  Record<
    string,
    {
      readonly title: string
      readonly lead: string
      readonly sections: ReadonlyArray<{
        readonly heading: string
        readonly body: string
        readonly code?: string
      }>
    }
  >
> = {
  '/introduction': {
    title: 'Introduction',
    lead: 'Why these components feel different.',
    sections: [
      {
        heading: 'Motion that communicates',
        body: "Every animation here points at something. When two list items merge their backgrounds, the component tells you they belong together. The hover highlight follows your cursor before you click, so the row you're about to land on confirms itself first. Motion has a job to create meaning.",
      },
      {
        heading: 'Hover as preview',
        body: "The interaction starts before you click. The closest interactive thing to your cursor gets a faint highlight; buttons gain a little weight as you approach. By the time your finger lands, you've had a moment to reconsider, which is mostly the point.",
      },
      {
        heading: 'Springs that can be interrupted',
        body: 'Toggle a switch and immediately toggle it back: its animation picks up from its current position and reverses. Three spring presets, named fast, moderate, and slow, cover most of the library. The native port keeps those shared presets and interruption behavior through its motion primitives.',
      },
      {
        heading: 'Native foundations',
        body: 'The original Fluid Functionalism components are built on shadcn/ui with Radix and Base UI variants. This port expresses their behavior through native Foldkit Blocks and Effect Layers. The two registries install editable Fluid components or Bklit charts with their dependencies; your theme, radius, and font tokens remain yours.',
      },
      {
        heading: 'Customize using the right panel',
        body: 'Change theme, accent, heading font, shape, size, and hover behavior while trying the components. Presentation choices remain in the URL so you can return to the same example or share it. The original icon switcher is a website preview tool; native components expose named icon slots with Lucide defaults.',
      },
      {
        heading: 'Installation',
        body: 'Add either native registry and install the components you need. Shared utilities and dependencies are resolved automatically. Font-weight animations require a variable font. The Installation guide gives the pinned toolchain and registry commands.',
      },
      {
        heading: 'Icons',
        body: 'Components render icons through named slots with Lucide defaults. Pass replacements to the native IconProvider and forward its presentation context to your component tree. Slots you leave out retain their Lucide default.',
        code: 'import { IconProvider } from "@foldkit-visuals/fluid/presentation/context";\nimport { phosphorIcons } from "@foldkit-visuals/fluid/icons/phosphor";\n\nIconProvider({\n  context,\n  icons: { search: phosphorIcons.search },\n  children: next => renderApplication(next),\n});',
      },
    ],
  },
  '/installation': {
    title: 'Make yourself at home.',
    lead: 'Two registries. One native component stack.',
    sections: [
      {
        heading: 'Start with Foldkit',
        body: 'Use the matching Blocks + Effect Layers preview: Foldkit and @foldkit/ui 0.170.0-canary.54f8bcd443b4 with Effect 4.1.2. The source needs Tailwind CSS v4 and its Fluid foundation stylesheet.',
      },
      {
        heading: 'Configure the registries',
        body: 'Add these two namespaces to the registries field of components.json.',
        code: '"registries": {\n  "@fluid-foldkit": "https://fluid-foldkit.vercel.app/r/fluid/0.1.0-preview.1/{name}.json",\n  "@bklit-foldkit": "https://fluid-foldkit.vercel.app/r/charts/0.1.0-preview.1/{name}.json"\n}',
      },
      {
        heading: 'Install a component',
        body: 'The CLI installs editable source and its dependency closure. You can install either family independently.',
        code: 'bunx shadcn@4.23.0 add @fluid-foldkit/button\nbunx shadcn@4.23.0 add @bklit-foldkit/gauge',
      },
    ],
  },
  '/blocks': {
    title: 'Compose with boundaries.',
    lead: 'Public contracts. Checked connections. Effect-native implementations.',
    sections: [
      {
        heading: 'A Block owns behavior',
        body: 'A meaningful feature owns its Model, local Messages, parent-facing InMessages and update. Pure presentation such as Card, Button and Reveal remains a small function.',
      },
      {
        heading: 'Parents use Bindings',
        body: 'Connect the child once through a checked Binding. Embed its view and invoke its generated public request/inform operations; do not mutate the child Model or route its local messages by hand.',
      },
      {
        heading: 'Layers supply implementations',
        body: 'The same Block contract can be supplied by a production or test Layer. Browser resources belong to entry composition, while server rendering uses the same graph without running commands. This site follows the pinned Foldkit Domains SSR example.',
      },
      {
        heading: 'A preview with clear limits',
        body: 'The current preview has a nested OnUnmount server-rendering limitation. Live previews start in the browser while navigation, card frames and documentation render on the server. The local showcase carries one pinned runtime patch. Registry installs use the original public SDK.',
      },
    ],
  },
}
export const articleAt = (path: string) => {
  const system = systemAt(path)
  return system === undefined ? articles[path] : narrative[system.slug]
}
export const articleView = <M>(path: string, settings: ResolvedSettings, h: HtmlBuilder<M>) => {
  const article = articles[path]
  if (article === undefined) return h.p([], ['This page could not be found.'])
  const context = presentation(settings)
  return Reveal(
    {
      preset: 'reveal-landing-subtle',
      children: [
        h.div(
          [h.Class('py-20 sm:py-28 w-full max-w-[680px] mx-auto mt-12 lg:mt-0')],
          [
            h.div(
              [h.Class('flex flex-col gap-8 px-6')],
              [
                h.header(
                  [],
                  [
                    h.h1(
                      [h.Class('text-site-display text-foreground leading-none')],
                      [article.title],
                    ),
                    h.p([h.Class('mt-2 text-site-body text-muted-foreground')], [article.lead]),
                  ],
                ),
                h.div(
                  [h.Class('contents typeset')],
                  article.sections.map((section) =>
                    h.section(
                      [h.Id(headingId(section.heading)), h.Class('flex flex-col gap-4 pt-6')],
                      [
                        h.h2(
                          [h.Class('-mb-2 text-site-title text-foreground leading-none')],
                          [section.heading],
                        ),
                        h.p([h.Class('text-site-body text-muted-foreground')], [section.body]),
                        ...(section.code === undefined
                          ? []
                          : [
                              codeBlock(
                                {
                                  code: section.code,
                                  filename: section.code.startsWith('{')
                                    ? 'components.json'
                                    : 'terminal.sh',
                                  context,
                                },
                                h,
                              ),
                            ]),
                      ],
                    ),
                  ),
                ),
                ...(path === '/introduction'
                  ? [
                      h.p(
                        [
                          h.Class(
                            '[.system-docs_&]:[margin-block-start:4rem] [.system-docs_&]:py-6 [.system-docs_&]:[border-block-start:1px_solid_var(--border)] [.system-docs_&]:text-muted-foreground ',
                          ),
                        ],
                        [
                          'Adapted from ',
                          h.a(
                            [h.Href('https://www.fluidfunctionalism.com/docs')],
                            ['Fluid Functionalism'],
                          ),
                          ' by Micka Touillaud, MIT license.',
                        ],
                      ),
                    ]
                  : []),
                Button(
                  {
                    context,
                    variant: 'secondary',
                    children: ['Explore the showcase'],
                    render: (attrs, children) =>
                      h.a([...attrs, h.Href(showcaseRouter())], children),
                  },
                  h,
                ),
              ],
            ),
          ],
        ),
      ],
    },
    h,
  )
}
