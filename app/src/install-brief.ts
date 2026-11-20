import { families, namespaces, type Family } from '../../lib/registry-families'
import type { ComponentPage } from '../../lib/catalogue'
import { currentFontFamily, settingsQuery, type Settings } from './settings'
import { release } from '../../lib/registry-release'

export const buildInstallBrief: (
  origin: string,
  page: ComponentPage | undefined,
  settings: Settings,
) => string = (origin: string, page: ComponentPage | undefined, settings: Settings) => {
  const base = new URL(origin).origin
  const title = page === undefined ? 'Fluid Functionalism, Bklit and Ramka' : page.name
  const registry = (family: Family) => `${base}/r/${family}/${release}/{name}.json`
  const commands =
    page === undefined
      ? [
          'bunx shadcn@4.23.0 add @fluid-foldkit/button',
          'bunx shadcn@4.23.0 add @bklit-foldkit/all',
          'bunx shadcn@4.23.0 add @ramka-foldkit/lightbox',
        ]
      : [`bunx shadcn@4.23.0 add ${namespaces[page.family]}/${page.slug}`]
  const docs = `${base}${page?.href ?? '/installation'}${settingsQuery(settings)}`
  return [
    `Add ${title} to my native Foldkit application.`,
    page?.description ??
      'Use editable Fluid components, Bklit charts and the Ramka lightbox with native Foldkit Models, Messages, Bindings, and Effect Layers.',
    '',
    'Compatible toolchain:',
    '- foldkit and @foldkit/ui: 0.170.0-canary.54f8bcd443b4',
    '- effect and @effect/platform-browser: 4.1.2',
    page?.family === 'ramka'
      ? '- @foldkit/vite-plugin: 0.29.0-canary.54f8bcd443b4; TypeScript ES2023. Ramka structural CSS does not require Tailwind.'
      : '- @foldkit/vite-plugin: 0.29.0-canary.54f8bcd443b4; Tailwind CSS 4; TypeScript ES2023.',
    'Keep one compatible Effect/Foldkit runtime. These dependencies belong to the app and are not replaced by installing a component.',
    '',
    'In components.json, keep the existing project aliases and add these registries:',
    JSON.stringify(
      {
        registries: Object.fromEntries(
          families.map((family) => [namespaces[family], registry(family)]),
        ),
      },
      null,
      2,
    ),
    'Use rsc:false and tsx:true for TypeScript source output. The generated components are .ts files and do not require JSX.',
    '',
    'Install:',
    ...commands,
    ...(page === undefined || page.family === 'ramka'
      ? [
          'bun scripts/install-ramka-sdk.mjs',
          'Ramka requires this explicit verified Bun SDK patch setup before typechecking or starting the app. It preserves the exact SDK version and refuses conflicting custom patches.',
        ]
      : []),
    'The CLI installs the selected source and its dependency closure. Review existing same-named files before choosing --overwrite.',
    '',
    'Usage:',
    page?.family === 'ramka'
      ? 'Import the installed ramka/parts.css once, then add your own visual skin for the public data-ramka-* parts. Keep the installed notices.'
      : 'Import the selected family stylesheet once after @import "tailwindcss" in the app stylesheet. Keep the installed notices.',
    'For a stateful component, store its public Block.Model in the parent Model, declare a parent makeRequiredFieldBinding, register it in the parent Composition, and provide the component construction Layer.',
    'Render through h.block(Binding.embedView({slotId,model,viewInputs})). Handle child OutMessages in the binding policy and use its request/inform operations for controlled acknowledgments. Do not mutate a child Model.',
    ...(page?.family === 'ramka'
      ? [
          "Import { LightboxBlock, layer, defaultEnvironmentLayer } from '@/ui/ramka/index.js', adjusted to your configured ui alias.",
          'Provide Ramka defaultEnvironmentLayer at the Program boundary with Program.makeElement(...).provide(defaultEnvironmentLayer), or provide a custom environmentLayer for per-instance host/CSP options.',
        ]
      : []),
    'Stateless helpers such as Button render directly with the owner’s HtmlBuilder. For example: Button({children:["Continue"],context},h), with context created by createPresentationContext({shape,size,hoverMode}).',
    'Keep external work in Commands, Subscriptions, Mounts or ManagedResources. Let the Runtime own dispatch, rendering, interruption and cleanup.',
    '',
    `Requested preferences: theme=${settings.theme}; radius=${settings.shape}; size=${settings.size}; hover=${settings.hover}; accent=${settings.accent}; heading family=${currentFontFamily(settings)}${settings.customFont?.weight == null ? '' : `; heading weight=${settings.customFont.weight}`}.`,
    'Apply heading fonts to site headings, preserve component body typography, and honor prefers-reduced-motion. Use the documented browser resource Layers for dialogs, menus and other components that need them.',
    '',
    `Reference and API: ${docs}`,
    `Composition and setup: ${base}/blocks and ${base}/installation`,
    'Use the native Foldkit contract and current installed declarations; this port does not use React, React context, Radix or Base UI runtime components.',
  ].join('\n')
}
