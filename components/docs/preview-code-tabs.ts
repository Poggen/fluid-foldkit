import { TabsItem } from '@foldkit-visuals/fluid/tabs'
import type { TabsViewInputs } from '@foldkit-visuals/fluid/tabs'
import type { Presentation } from '@foldkit-visuals/fluid/presentation'
import type { HtmlBuilder } from 'foldkit/html'

export type DocumentationPane = 'preview' | 'code'

export const previewCodeItems = [{ value: 'preview' }, { value: 'code' }] as const

export const paneForTabIndex = (index: number): DocumentationPane =>
  index === 1 ? 'code' : 'preview'

export const previewCodeTabId = (scope: string, section: string): string =>
  `docs-${scope}-${encodeURIComponent(section)}`

export const previewCodeTabsViewInputs = <M>(
  h: HtmlBuilder<M>,
  options: Presentation & {
    readonly animate: TabsViewInputs['animate']
    readonly ariaLabel: string
  },
): TabsViewInputs => ({
  ...options,
  items: previewCodeItems,
  content: (tabs) => [
    TabsItem({ index: 0, label: 'Preview' }, tabs, h),
    TabsItem({ index: 1, label: 'Code' }, tabs, h),
  ],
})
