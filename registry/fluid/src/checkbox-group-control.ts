// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Predicate } from 'effect'
import * as Checkbox from '@foldkit/ui/checkbox'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

export interface CheckboxRowControl {
  readonly index: number
  readonly label: string
  readonly checked: boolean
}

export type RenderCheckboxRow = (
  control: CheckboxRowControl,
  render: (attributes: ReadonlyArray<ChildAttribute>) => Html,
) => Html

export function checkboxRow<Message>(
  id: string,
  control: CheckboxRowControl,
  toggle: (index: number) => Message,
  render: (attributes: ReadonlyArray<ChildAttribute>) => Html,
  h: HtmlBuilder<Message>,
): Html {
  return Checkbox.view(
    {
      id: `${id}-check-${control.index}`,
      isChecked: control.checked,
      onToggle: () => toggle(control.index),
      toView: (attributes) =>
        render(
          attributes.checkbox.flatMap((attribute) => {
            if ('_tag' in attribute) {
              // Source owns keydown and delegated click; existing child groups keep their dispatcher.
              if (
                Predicate.isTagged(attribute, 'OnKeyUpPreventDefault') ||
                Predicate.isTagged(attribute, 'OnClick')
              ) {
                return []
              }

              return childAttributes([attribute])
            }

            return [attribute]
          }),
        ),
    },
    h,
  )
}

export const checkboxRowLabelId = (id: string, index: number) =>
  Checkbox.labelId(`${id}-check-${index}`)
