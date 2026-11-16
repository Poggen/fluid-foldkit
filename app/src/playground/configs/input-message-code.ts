import { suggestedPrompts, placeholderPrompt, type Configuration } from './input-message'
export const inputMessageCode = (
  c: Configuration,
) => `import { InputMessageBlock } from '@foldkit-visuals/fluid/input-message'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'

const Composer = Page.makeRequiredFieldBinding(InputMessageBlock, {
  field: 'composer', init: { contextToArgs: () => [{
    id: 'composer', value: '', reduceMotion: false, disabled: ${c.disabled}, minRows: ${c.minRows}, maxRows: ${Math.max(c.minRows, c.maxRows)}, clickToFocus: ${c.clickToFocus},
    supportsFiles: ${c.attachments || c.leftSlot}, supportsQueue: ${c.status !== 'off'}, supportsStop: ${c.status !== 'off'}, showQueue: ${c.status !== 'off'},
    ${c.status === 'off' ? '' : `status: '${c.status}',`}
    ${c.suggestion ? `placeholderSuggestion: ${JSON.stringify(placeholderPrompt)},` : ''}
    suggestions: ${JSON.stringify(c.suggestionsOn ? suggestedPrompts : [])},
    history: ${JSON.stringify(c.historyOn ? ['Make my input box feel less stiff'] : [])},
  }] },
})

Composer.embedView({ slotId: 'composer', model: model.composer, viewInputs: {
  context, placeholder: ${JSON.stringify(c.placeholder)}, textareaLabel: 'Try the message composer', sendLabel: 'Send message', animate, getReorder, tooltip,
  ${c.leftSlot ? "leftSlot: ({ filePickerAttributes }) => [Button({ context, variant: 'ghost', buttonSize: 'sm', attributes: filePickerAttributes(), children: [defaultIcons.plus({ size: 16 }, h)] }, h)]," : ''}
  ${c.rightSlot ? "rightSlot: () => [Button({ context, variant: 'ghost', buttonSize: 'sm', children: ['Sonnet 5'], trailingIcon: defaultIcons['chevron-down'] }, h)]," : ''}
} })`
