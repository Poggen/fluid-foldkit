import { createKeyedLazy } from 'foldkit/html'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { DropdownItemContext } from '@foldkit-visuals/fluid/dropdown-item'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { DropdownSubTrigger } from '@foldkit-visuals/fluid/dropdown-sub'
import {
  DropdownSearch,
  DropdownLabel,
  DropdownSeparator,
  DropdownEmpty,
} from '@foldkit-visuals/fluid/dropdown-parts'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import {
  visibleRows,
  canCreate,
  themes,
  type Configuration,
} from '../../playground/configs/dropdown'
import type { ResolvedSettings } from '../../settings'
import { target } from '../../motion'
import type { FluidGalleryBlock, FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Dropdown } from './interactive-bindings'
import { DropdownPopup, DropdownTheme } from './playground-bindings'
type Events = Pick<typeof FluidGalleryBlock.Message, 'ChangedDropdownQuery'>
const render = (
  events: Events,
  inline: FluidGalleryModel['dropdown'],
  popup: FluidGalleryModel['dropdownPopup'],
  theme: FluidGalleryModel['dropdownThemeMenu'],
  selected: ReadonlyArray<string>,
  selectedTheme: string,
  query: string,
  created: FluidGalleryModel['dropdownCreatedItems'],
  config: Configuration,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = createPresentationContext({
    shape,
    size,
    hoverMode: hover,
    hasShapeProvider: true,
    hasSizeProvider: true,
  })
  const rows = visibleRows(config, created, query)
  const viewInputs = {
    context,
    animate: target.node,
    openOnHover: config.openOnHover,
    side: config.side,
    align: config.align,
    content: (menu: DropdownItemContext) => [
      ...(config.mode === 'menu' && config.search
        ? [
            DropdownSearch(
              {
                context,
                value: query,
                onValueChange: (value) => events.ChangedDropdownQuery({ value }),
                placeholder: 'Search…',
              },
              h,
            ),
          ]
        : []),
      ...rows.flatMap((row, index) => {
        const groups = config.groups && !(config.mode === 'menu' && config.search)
        const prefix =
          groups && (index === 0 || rows[index - 1]?.group !== row.group)
            ? [
                ...(index > 0 ? [DropdownSeparator({}, h)] : []),
                DropdownLabel({ context, children: [row.group] }, h),
              ]
            : []
        const icon = config.icons ? { icon: defaultIcons[row.icon] } : {}
        const item =
          config.mode === 'menu' && config.submenu && row.value === 'Theme'
            ? h.block(
                DropdownTheme.embedView({
                  slotId: 'dropdown-theme',
                  model: theme,
                  viewInputs: {
                    context,
                    animate: target.node,
                    trigger: (attributes) =>
                      DropdownSubTrigger(
                        { index, label: row.label, ...icon, attributes, animate: target.node },
                        menu,
                        h,
                      ),
                    content: (sub) =>
                      themes.map((label, subIndex) =>
                        DropdownItem(
                          {
                            index: subIndex,
                            label,
                            checked: selectedTheme === label,
                            animate: target.node,
                          },
                          sub,
                          h,
                        ),
                      ),
                  },
                }),
              )
            : DropdownItem(
                {
                  index,
                  label: row.label,
                  ...icon,
                  ...(config.selection === 'none' ? {} : { checked: selected.includes(row.label) }),
                  disabled: config.disabledRow && row.value === 'Privacy',
                  closeOnClick: config.selection !== 'multiple',
                  animate: target.node,
                },
                menu,
                h,
              )
        return [...prefix, item]
      }),
      ...(canCreate(config, created, query)
        ? [
            DropdownItem(
              {
                id: 'preview-dropdown-create',
                index: rows.length,
                label: `Create “${query.trim()}”`,
                ...(config.icons ? { icon: defaultIcons.plus } : {}),
                closeOnClick: config.selection !== 'multiple',
                animate: target.node,
              },
              menu,
              h,
            ),
          ]
        : []),
      ...(rows.length === 0 && !canCreate(config, created, query)
        ? [DropdownEmpty({ context, children: ['No results'] }, h)]
        : []),
    ],
  }
  return config.mode === 'menu'
    ? h.block(
        DropdownPopup.embedView({
          slotId: 'dropdown-popup',
          model: popup,
          viewInputs: {
            ...viewInputs,
            trigger: (attributes) =>
              Button({ context, variant: 'secondary', attributes, children: [config.label] }, h),
          },
        }),
      )
    : h.block(Dropdown.embedView({ slotId: 'dropdown-inline', model: inline, viewInputs }))
}
export const makeDropdownPlaygroundView = (events: Events) => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    config: Configuration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    lazy('dropdown-playground', render, [
      events,
      model.dropdown,
      model.dropdownPopup,
      model.dropdownThemeMenu,
      model.dropdownSelectedValues,
      model.dropdownTheme,
      model.dropdownQuery,
      model.dropdownCreatedItems,
      config,
      config.appearance.shape ?? settings.shape,
      config.appearance.size ?? settings.size,
      config.appearance.hover ?? settings.hover,
      h,
    ])
}
