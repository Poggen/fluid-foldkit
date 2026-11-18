import { ControlsHighlight, ControlsHover, PlaygroundTabs, ShuffleTooltip } from './chrome-bindings'
export { ControlsHighlight, ControlsHover, PlaygroundTabs, ShuffleTooltip } from './chrome-bindings'
import { Effect } from 'effect'
import { createLazy } from 'foldkit/html'
import type { ComponentPresentation } from '../settings'
import { ScrollAreaBlock } from '@foldkit-visuals/fluid/scroll-area'
import { AuthoredExamplesBlock } from './authored'
import { pageAt } from '../../../lib/catalogue'
import { Controls } from './control-bindings'
export { Controls, changeProp } from './control-bindings'
import { ComponentReferenceBlock } from './block'
import type { ReferenceInputs } from './block'
import { ShuffleShortcut } from './commands'
import { InspectorBlock } from '../../../components/docs/inspector'
import { documentationRuntime } from '../documentation-runtime'
export const Authored = ComponentReferenceBlock.makeRequiredFieldBinding(AuthoredExamplesBlock, {
  field: 'authored',
  init: { contextToArgs: ({ path, presentation }) => [pageAt(path)?.slug ?? '', presentation] },
})
export const ApiScrolls = ComponentReferenceBlock.makeKeyedArrayBinding(ScrollAreaBlock, {
  field: 'apiScrolls',
  key: 'key',
  childField: 'model',
}).withOutMessagePolicy({
  fold: (_key: string, out: typeof ScrollAreaBlock.OutMessage.Type) =>
    ComponentReferenceBlock.makeOutMessageFold(ScrollAreaBlock, {
      Scrolled: ComponentReferenceBlock.makeNoopStep,
    })(out),
})
export const apiScrollKey = (path: string, index: number) => `${path}:${index}`
export const Inspector = ComponentReferenceBlock.makeRequiredFieldBinding(InspectorBlock, {
  field: 'inspector',
  init: { contextToArgs: () => ['playground-inspect'] },
})
export const ComponentReferenceComposition = ComponentReferenceBlock.makeComposition({
  bindings: [
    Inspector,
    Controls,
    Authored,
    PlaygroundTabs,
    ControlsHover,
    ControlsHighlight,
    ApiScrolls,
    ShuffleTooltip,
  ],
  mounts: [ShuffleShortcut],
})
export type H = Parameters<
  Parameters<typeof ComponentReferenceComposition.makeView.withInputs>[0]
>[2]
export type ReferenceViewRenderer = Parameters<
  typeof ComponentReferenceComposition.makeView.withInputs<ReferenceInputs>
>[0]

const viewControls: typeof import('./controls-view').controlsView = (...args) =>
  documentationRuntime().controlsView(...args)
const viewToolbar: typeof import('./controls-view').playgroundToolbar = (...args) =>
  documentationRuntime().playgroundToolbar(...args)

type Model = typeof ComponentReferenceBlock.Model.Type
const viewAuthored = (
  model: Model['authored'],
  theme: ComponentPresentation['theme'],
  accent: ComponentPresentation['accent'],
  shape: ComponentPresentation['shape'],
  size: ComponentPresentation['size'],
  hover: ComponentPresentation['hover'],
  slug: string,
  ready: boolean,
  h: H,
) =>
  h.block(
    Authored.embedView({
      slotId: 'authored-examples',
      model,
      viewInputs: { settings: { theme, accent, shape, size, hover }, slug, ready },
    }),
  )

export interface ReferenceViewParts {
  readonly renderAuthored: typeof viewAuthored
  readonly renderSidebarControls: typeof viewControls
  readonly renderInlineControls: typeof viewControls
  readonly renderToolbar: typeof viewToolbar
}

export const view = Effect.sync(() => {
  const lazyAuthored = createLazy()
  const lazySidebarControls = createLazy()
  const lazyInlineControls = createLazy()
  const lazyToolbar = createLazy()
  const parts: ReferenceViewParts = {
    renderAuthored: (...args) => lazyAuthored(viewAuthored, args),
    renderSidebarControls: (...args) => lazySidebarControls(viewControls, args),
    renderInlineControls: (...args) => lazyInlineControls(viewControls, args),
    renderToolbar: (...args) => lazyToolbar(viewToolbar, args),
  }
  return ComponentReferenceComposition.makeView.withInputs<ReferenceInputs>((model, inputs, h) =>
    documentationRuntime().renderReferenceView(model, inputs, h, parts),
  )
})
