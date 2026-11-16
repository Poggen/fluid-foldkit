import { items as dropdownItems } from '../../playground/configs/dropdown'
import { CommandMenuDialogBlock } from '@foldkit-visuals/fluid/command-menu-dialog'
import { CommandMenuTabsBlock } from '@foldkit-visuals/fluid/command-menu-tabs'
import { DropdownMenuBlock, DropdownSubBlock } from '@foldkit-visuals/fluid/dropdown'
import { SelectBlock } from '@foldkit-visuals/fluid/select'
import { Match, Option } from 'effect'
import { Update } from 'foldkit'
import { FluidGalleryBlock } from './block'
import { commandItems } from './command-data'

export const CommandDialog = FluidGalleryBlock.makeRequiredFieldBinding(CommandMenuDialogBlock, {
  field: 'commandDialog',
  init: {
    contextToArgs: () => [{ id: 'preview-commands', items: commandItems, shortcut: 'mod+k' }],
  },
}).withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(CommandMenuDialogBlock, {
    OpenChanged: FluidGalleryBlock.makeNoopStep,
    Selected: FluidGalleryBlock.makeNoopStep,
    QueryChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
const RawTabs = FluidGalleryBlock.makeRequiredFieldBinding(CommandMenuTabsBlock, {
  field: 'commandTabs',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-command-tabs',
        inputId: 'preview-commands-input',
        tabs: [
          { value: 'all', label: 'All' },
          { value: 'Actions', label: 'Actions' },
          { value: 'Go to', label: 'Go to' },
          { value: 'Help', label: 'Help' },
        ],
        value: 'all',
      },
    ],
  },
})
export const CommandTabs = RawTabs.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(CommandMenuTabsBlock, {
    ValueChanged: ({ value }) => RawTabs.requestConfigureValue({ value }),
  }),
})
const RawFilter = FluidGalleryBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'commandFilter',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-command-filter',
        items: ['all', 'Actions', 'Go to', 'Help'].map((value) => ({ value, label: value })),
        value: 'all',
      },
    ],
  },
})
export const CommandFilter = RawFilter.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        RawFilter.requestConfigure({ items: model.commandFilter.items, value }),
      ),
    OpenChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
const RawSort = FluidGalleryBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'commandSort',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-command-sort',
        items: ['default', 'az'].map((value) => ({ value, label: value })),
        value: 'default',
      },
    ],
  },
})
export const CommandSort = RawSort.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        RawSort.requestConfigure({ items: model.commandSort.items, value }),
      ),
    OpenChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
export const DropdownPopupRequests = FluidGalleryBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'dropdownPopup',
  placement: 'popupDropdown',
  init: { contextToArgs: () => [{ id: 'preview-dropdown-popup' }] },
})
export const DropdownPopup = DropdownPopupRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      FluidGalleryBlock.makeStep((model) =>
        Update.combineSteps(
          events.flatMap((event) => {
            if (event._tag !== 'Selected') return []
            const row = model.dropdownPopup.controller.rows.find((row) => row.index === event.index)
            if (!row) return []
            if (row.id === 'preview-dropdown-create') {
              const value = model.dropdownQuery.trim()
              const multi = Option.isSome(model.dropdownPopup.controller.checkedIndices)
              const single = model.dropdownPopup.controller.rows.some(
                (item) => item.kind === 'radio',
              )
              const selected = multi
                ? [...model.dropdownSelectedValues, value]
                : single
                  ? [value]
                  : model.dropdownSelectedValues
              const all = [...dropdownItems, ...model.dropdownCreatedItems, { value, label: value }]
              return [
                FluidGalleryBlock.makeFieldsStep((current) => ({
                  dropdownCreatedItems: () => [
                    ...current.dropdownCreatedItems,
                    { value, label: value },
                  ],
                  dropdownSelectedValues: () => selected,
                  dropdownQuery: () => '',
                })),
                DropdownPopupRequests.requestSelection({
                  selection: {
                    checkedIndex: single ? Option.some(all.length - 1) : Option.none(),
                    checkedIndices: multi
                      ? Option.some(
                          all.flatMap((item, index) =>
                            selected.includes(item.label) ? [index] : [],
                          ),
                        )
                      : Option.none(),
                  },
                }),
              ]
            }
            const selected =
              row.kind === 'checkbox'
                ? model.dropdownSelectedValues.includes(row.label)
                  ? model.dropdownSelectedValues.filter((value) => value !== row.label)
                  : [...model.dropdownSelectedValues, row.label]
                : row.kind === 'radio'
                  ? [row.label]
                  : model.dropdownSelectedValues
            return [
              FluidGalleryBlock.makeFieldsStep(() => ({ dropdownSelectedValues: () => selected })),
              DropdownPopupRequests.requestSelection({
                selection: {
                  checkedIndex: row.kind === 'radio' ? Option.some(event.index) : Option.none(),
                  checkedIndices:
                    row.kind === 'checkbox'
                      ? Option.some(
                          model.dropdownPopup.controller.rows
                            .filter((row) => selected.includes(row.label))
                            .map((row) => row.index),
                        )
                      : Option.none(),
                },
              }),
            ]
          }),
        ),
      ),
  }),
})
const RawTheme = FluidGalleryBlock.makeRequiredFieldBinding(DropdownSubBlock, {
  field: 'dropdownThemeMenu',
  placement: 'themeSubmenu',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-dropdown-theme',
        rootId: 'preview-dropdown-popup',
        parentId: 'preview-dropdown-popup',
        checkedIndex: 2,
      },
    ],
  },
})
export const DropdownTheme = RawTheme.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(DropdownSubBlock, {
    Events: ({ events }) =>
      FluidGalleryBlock.makeStep((model) =>
        Update.combineSteps(
          events.map((event) =>
            Match.value(event).pipe(
              Match.tagsExhaustive({
                OpenChanged: ({ open }) =>
                  DropdownPopupRequests.requestSubmenuHold({
                    index:
                      model.dropdownPopup.controller.rows.find((row) => row.label === 'Theme')
                        ?.index ?? 0,
                    open,
                  }),
                RootCloseRequested: () => DropdownPopupRequests.requestVisibility({ open: false }),
                Selected: ({ index }) =>
                  Update.combineSteps([
                    FluidGalleryBlock.makeFieldsStep(() => ({
                      dropdownTheme: () => ['Light', 'Dark', 'System'][index] ?? 'System',
                    })),
                    RawTheme.requestSelection({
                      selection: {
                        checkedIndex: Option.some(index),
                        checkedIndices: Option.none(),
                      },
                    }),
                  ]),
              }),
            ),
          ),
        ),
      ),
  }),
})
export const playgroundBindings = [
  CommandDialog,
  CommandTabs,
  CommandFilter,
  CommandSort,
  DropdownPopup,
  DropdownTheme,
] as const
