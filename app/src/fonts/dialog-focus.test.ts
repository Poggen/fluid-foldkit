import { CommandMenuDialogConfig } from '@foldkit-visuals/fluid/command-menu-dialog'
import { Schema } from 'effect'
import { expect, test } from 'vitest'

test('programmatic command dialogs retain their explicit focus return target', () => {
  const config = Schema.decodeUnknownSync(CommandMenuDialogConfig)({
    id: 'font-picker',
    items: [],
    returnFocusSelector: '[data-font-picker-return="true"] button',
  })
  expect(config.returnFocusSelector).toBe('[data-font-picker-return="true"] button')
})
