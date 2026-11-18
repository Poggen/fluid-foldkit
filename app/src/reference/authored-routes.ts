export const authoredFeature = (slug: string) => {
  if (['code-block', 'context-menu', 'data-table'].includes(slug)) return 'data-components'
  if (['input', 'textarea', 'checkbox', 'field', 'input-group'].includes(slug)) return 'forms'
  if (
    [
      'badge',
      'switch',
      'tabs',
      'slider',
      'radio-group',
      'checkbox-group',
      'thinking-indicator',
    ].includes(slug)
  )
    return 'controls'
  if (['line', 'area', 'bar', 'heatmap', 'gauge', 'composed'].includes(slug)) return 'charts'
  if (['dropdown', 'breadcrumb'].includes(slug)) return 'menus'
  if (slug === 'thinking-steps') return 'thinking'
  if (['card', 'carousel-dots', 'table'].includes(slug)) return 'surfaces'
  if (slug === 'input-copy') return 'copy'
  if (slug === 'color-picker') return 'colors'
  if (['select', 'combobox'].includes(slug)) return 'choices'
  if (slug === 'tooltip') return 'tooltip'
  if (slug === 'calendar') return 'calendar'
  if (slug === 'banner') return 'banner'
  if (slug === 'chat-message') return 'chat'
  if (slug === 'ask-user-questions') return 'questions'
  if (slug === 'dialog') return 'dialogs'
  if (slug === 'date-picker') return 'dates'
  if (slug === 'command-menu') return 'commands'
  if (slug === 'input-message') return 'messages'
  if (slug === 'sidebar') return 'sidebars'
  return undefined
}
