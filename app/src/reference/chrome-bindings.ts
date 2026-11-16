import { HoverBlock } from '@foldkit-visuals/fluid/hover'
import { HoverHighlightBlock } from '@foldkit-visuals/fluid/hover-highlight'
import { TabsBlock } from '@foldkit-visuals/fluid/tabs'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { ComponentReferenceBlock } from './block'
export const ControlsHighlight = ComponentReferenceBlock.makeRequiredFieldBinding(
  HoverHighlightBlock,
  {
    field: 'controlsHighlight',
    init: { contextToArgs: () => [{ id: 'docs-controls-highlight' }] },
  },
)
export const ControlsHover = ComponentReferenceBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'controlsHover',
  init: { contextToArgs: () => [{ id: 'docs-controls-rows' }] },
}).withOutMessagePolicy({
  fold: ComponentReferenceBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      ComponentReferenceBlock.makeStep((model) =>
        ControlsHighlight.informOfSource({
          snapshot,
          hidden: false,
          mode: model.controlsHover.mode,
        }),
      ),
  }),
})
const PlaygroundTabsRequests = ComponentReferenceBlock.makeRequiredFieldBinding(TabsBlock, {
  field: 'previewTabs',
  init: {
    contextToArgs: () => [
      { id: 'docs-playground-view', idPrefix: 'docs-playground-view', selectedIndex: 0 },
    ],
  },
})
export const PlaygroundTabs = PlaygroundTabsRequests.withOutMessagePolicy({
  fold: ComponentReferenceBlock.makeOutMessageFold(TabsBlock, {
    Selected: ({ index }) => PlaygroundTabsRequests.requestSelected({ selectedIndex: index }),
  }),
})
export const ShuffleTooltip = ComponentReferenceBlock.makeRequiredFieldBinding(
  DocumentTooltipBlock,
  {
    field: 'shuffleTooltip',
  },
).withOutMessagePolicy({
  fold: ComponentReferenceBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: ComponentReferenceBlock.makeNoopStep,
  }),
})
