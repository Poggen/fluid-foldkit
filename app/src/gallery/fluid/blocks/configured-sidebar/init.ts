import { SidebarTooltips } from './bindings'
import { ConfiguredSidebarComposition } from './composition'

export const init = ConfiguredSidebarComposition.makeInit(() => ({
  steps: [
    SidebarTooltips.requestAdd({
      key: 'preview-sidebar-inset-trigger',
      options: { side: 'bottom' },
    }),
  ],
  model: {
    sidebarSections: { primary: true, secondary: true },
    sidebarExpanded: {},
    sidebarDismissedCallouts: [],
    sidebarCalloutsHovered: false,
    sidebarCalloutHeight: 64,
    sidebarAction: '',
    threadSearch: '',
  },
}))
