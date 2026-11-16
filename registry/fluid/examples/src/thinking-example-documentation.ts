import {
  hoverModeOf as controlsHoverModeOf,
  PreviewControlsBlock,
} from '../../../../components/docs/preview-controls'

import { Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { previewCodeTabId } from '../../../../components/docs/preview-code-tabs'
import { ThinkingDemoBlock } from './thinking-example-playback.js'

export const documentationTabsFor = (
  models: Readonly<Record<string, typeof PreviewControlsBlock.Model.Type>>,
  section: string,
) => {
  const child = models[section]
  if (child === undefined) throw new Error(`Missing documentation tabs ${section}`)
  return child
}
export const DocumentationTabs = ThinkingDemoBlock.makeRecordBinding(PreviewControlsBlock, {
  field: 'documentationTabs',
})
export const documentationTabsHover = (mode: 'fluid' | 'standard') =>
  ThinkingDemoBlock.makeStep((model) =>
    Update.combineSteps(
      Object.entries(model.documentationTabs).flatMap(([section, child]) =>
        controlsHoverModeOf(child) === mode
          ? []
          : [DocumentationTabs.requestHoverMode(section, { mode: mode })],
      ),
    ),
  )
export const initDocumentationTabs = ThinkingDemoBlock.makeStep((parent) =>
  Update.combineSteps(
    [parent.id].map((section) =>
      ThinkingDemoBlock.makeStep((model) =>
        initAndInsert(DocumentationTabs, model, {
          key: section,
          args: [
            {
              id: previewCodeTabId('thinking-steps', section),
              idPrefix: previewCodeTabId('thinking-steps', section),
              selectedIndex: 0,
            },
          ],
        }),
      ),
    ),
  ),
)
