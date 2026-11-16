import { NavMenuBlock } from '@foldkit-visuals/fluid/nav-menu'
import { defaults } from '../../../../playground/configs/sidebar'
import { makeRequiredFieldBinding, makeOutMessageFold, makeFieldsStep } from './block'
import { sidebarActionRows } from '../../sidebar-action-data'

export const SidebarHeaderActions = makeRequiredFieldBinding(NavMenuBlock, {
  field: 'sidebarHeaderActions',
  init: {
    contextToArgs: () => [
      {
        id: 'playground-sidebar-header-actions',
        ariaLabel: 'Header actions',
        items: sidebarActionRows('header', defaults.headerActions),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(NavMenuBlock, {
    Selected: ({ value }) => makeFieldsStep(() => ({ sidebarAction: () => value })),
  }),
})

export const SidebarFooterActions = makeRequiredFieldBinding(NavMenuBlock, {
  field: 'sidebarFooterActions',
  init: {
    contextToArgs: () => [
      {
        id: 'playground-sidebar-footer-actions',
        ariaLabel: 'Footer actions',
        items: sidebarActionRows('footer', defaults.footerActions),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(NavMenuBlock, {
    Selected: ({ value }) => makeFieldsStep(() => ({ sidebarAction: () => value })),
  }),
})
