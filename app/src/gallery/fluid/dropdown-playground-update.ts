import { Option } from 'effect'
import { Update } from 'foldkit'
import { visibleRows, themes, type Configuration } from '../../playground/configs/dropdown'
import type { ComponentPresentation } from '../../settings'
import { FluidGalleryBlock } from './block'
import { Dropdown } from './interactive-bindings'
import { DropdownPopup, DropdownTheme } from './playground-bindings'
export const reconcileDropdown = (config: Configuration, _presentation: ComponentPresentation) =>
  FluidGalleryBlock.makeStep((model) => {
    const rows = visibleRows(config, model.dropdownCreatedItems, model.dropdownQuery)
    const indices = rows.flatMap((row, index) =>
      model.dropdownSelectedValues.includes(row.label) ? [index] : [],
    )
    const selection = {
      checkedIndex:
        config.selection === 'single' && indices[0] !== undefined
          ? Option.some(indices[0])
          : Option.none<number>(),
      checkedIndices:
        config.selection === 'multiple'
          ? Option.some(indices)
          : Option.none<ReadonlyArray<number>>(),
    }
    const selectionEqual = (current: typeof model.dropdown.controller) => {
      const before = Option.getOrNull(current.checkedIndices)
      const after = Option.getOrNull(selection.checkedIndices)
      return (
        Option.getOrNull(current.checkedIndex) === Option.getOrNull(selection.checkedIndex) &&
        (before === null || after === null
          ? before === after
          : before.length === after.length &&
            before.every((value, index) => value === after[index]))
      )
    }
    return Update.combineSteps([
      ...(selectionEqual(model.dropdown.controller)
        ? []
        : [Dropdown.requestSelection({ selection })]),
      ...(selectionEqual(model.dropdownPopup.controller)
        ? []
        : [DropdownPopup.requestSelection({ selection })]),
      ...(model.dropdown.controller.disabled === config.disabled
        ? []
        : [Dropdown.requestDisabled({ disabled: config.disabled })]),
      ...(model.dropdownPopup.controller.disabled === config.disabled
        ? []
        : [DropdownPopup.requestDisabled({ disabled: config.disabled })]),
      ...(Option.getOrNull(model.dropdownThemeMenu.controller.checkedIndex) ===
      themes.indexOf(model.dropdownTheme)
        ? []
        : [
            DropdownTheme.requestSelection({
              selection: {
                checkedIndex: Option.some(themes.indexOf(model.dropdownTheme)),
                checkedIndices: Option.none(),
              },
            }),
          ]),
    ])
  })
