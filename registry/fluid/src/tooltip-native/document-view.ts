import type { Html } from 'foldkit/html'
import type { InteractionViewInputs, TooltipViewInputs } from './interaction.js'
import type { Model, Row } from './state.js'
import type { DocumentTooltipRenderInputs } from './document-inputs.js'

type RenderInteraction = (
  key: string,
  model: Row['interaction'],
  inputs: InteractionViewInputs,
) => Html

export const renderDocumentTooltip = (
  model: Model,
  inputs: DocumentTooltipRenderInputs,
  renderInteraction: RenderInteraction,
): Html => {
  const seen = new Set<string>()
  const registered = (key: string) => {
    const row = model.rows[key]
    if (row === undefined) {
      throw new Error(`Tooltip ${key} must be registered before rendering`)
    }
    if (seen.has(key)) {
      throw new Error(`Tooltip ${key} has multiple trigger slots`)
    }
    seen.add(key)
    return row
  }

  if (inputs.part === 'popups') {
    return inputs.renderPopups(
      inputs.entries.map(({ key, content, ...popup }) => {
        const row = registered(key)
        if (row.presentation.phase === 'absent') return null

        return renderInteraction(key, row.interaction, {
          ...popup,
          part: 'popup',
          group: model.groups[row.groupKey],
          presentation: row.presentation,
          animate: inputs.animate,
          renderContent: () => {
            if (content !== undefined) return content
            if (inputs.renderContent === undefined) {
              throw new Error(`Tooltip ${key} requires content or renderContent`)
            }
            return inputs.renderContent(key)
          },
        })
      }),
    )
  }

  if (inputs.part === 'triggers') {
    return inputs.render({
      tooltip: (key) => {
        const row = registered(key)
        return renderInteraction(key, row.interaction, {
          part: 'trigger',
          presentation: row.presentation,
          trigger: (context) => inputs.renderTrigger(key, context),
        })
      },
    })
  }

  const rendered = new Map<string, Omit<TooltipViewInputs, 'trigger'>>()
  const content = inputs.render({
    tooltip: (key, tooltipInputs) => {
      const row = registered(key)
      rendered.set(key, tooltipInputs)
      return renderInteraction(key, row.interaction, {
        part: 'trigger',
        presentation: row.presentation,
        trigger: (context) => inputs.renderTrigger(key, context),
      })
    },
  })

  const popups = Array.from(rendered, ([key, { content, ...popup }]) => {
    const row = model.rows[key]
    if (row === undefined || row.presentation.phase === 'absent') return null

    return renderInteraction(key, row.interaction, {
      ...popup,
      part: 'popup',
      group: model.groups[row.groupKey],
      presentation: row.presentation,
      renderContent: () => {
        if (content !== undefined) return content
        if (inputs.renderContent === undefined) {
          throw new Error(`Tooltip ${key} requires content or renderContent`)
        }
        return inputs.renderContent(key)
      },
    })
  })

  return inputs.renderDocument(content, popups)
}
