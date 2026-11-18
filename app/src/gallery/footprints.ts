export const fluidFootprints: Readonly<
  Record<string, { readonly size: 'small' | 'medium' | 'large'; readonly side?: 'right' }>
> = {
  'input-message': { size: 'medium' },
  'color-picker': { size: 'large', side: 'right' },
  card: { size: 'medium' },
  'command-menu': { size: 'large', side: 'right' },
  sidebar: { size: 'large' },
  'thinking-steps': { size: 'large', side: 'right' },
  'ask-user-questions': { size: 'large' },
  banner: { size: 'medium', side: 'right' },
  accordion: { size: 'medium' },
  'carousel-dots': { size: 'large', side: 'right' },
  'data-table': { size: 'large' },
  table: { size: 'medium' },
  calendar: { size: 'medium', side: 'right' },
  input: { size: 'small' },
  textarea: { size: 'small' },
}
