// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { preserveCheckboxReset } from './checkbox-group-input.js'
import { keepSwitchInputDefault } from './switch-input.js'
import { selectionMarker } from './selection-group-style.js'
import type { RadioValue } from './radio-group-state.js'

interface RadioFormContext {
  readonly hasForm: boolean
  readonly initialChecked: ReadonlyArray<{ readonly index: number; readonly checked: boolean }>
}

export function radioGroupInput<Message, Requirements>(
  item: typeof RadioValue.Type | undefined,
  selected: boolean,
  context: RadioFormContext,
  h: HtmlBuilder<Message, Requirements>,
): ReadonlyArray<Html> {
  const primitive = h.span
  const marker = selectionMarker(selected)

  return [
    item !== undefined && Option.isSome(item.value)
      ? primitive([
          h.DataAttribute(marker.name, marker.value),
          h.Class('sr-only'),
          h.Tabindex(-1),
          h.Role('radio'),
          h.AriaChecked(selected),
          h.AriaHidden(true),
        ])
      : null,
    item !== undefined && Option.isSome(item.value)
      ? preserveCheckboxReset(
          keepSwitchInputDefault(
            h.input([
              h.Type('radio'),
              h.Value(item.value.value),
              h.Tabindex(-1),
              h.AriaHidden(true),
              h.Checked(selected),
              h.Class(
                '[clip-path:inset(50%)] overflow-hidden whitespace-nowrap [border:0] p-0 w-px h-px m-0 fixed top-0 left-0',
              ),
            ]),
            context.initialChecked.find((candidate) => candidate.index === item.index)?.checked ??
              false,
          ),
          selected,
          true,
        )
      : null,
  ]
}
