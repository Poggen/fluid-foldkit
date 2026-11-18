/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
export interface AccordionRow {
  readonly value: string
  readonly title: string
  readonly content: string
}

export const playgroundRows: ReadonlyArray<AccordionRow> = [
  {
    value: 'item-1',
    title: 'What is Fluid Functionalism?',
    content:
      'A design philosophy where every animation serves a functional purpose — motion is information, not decoration.',
  },
  {
    value: 'item-2',
    title: 'How does fluid hover work?',
    content:
      'The closest item to your cursor is highlighted before you click, reducing targeting errors.',
  },
  {
    value: 'item-3',
    title: 'Why spring physics?',
    content:
      'Springs respond naturally to interruption — if a user reverses mid-transition, the animation adapts.',
  },
  {
    value: 'item-4',
    title: 'Is it compatible with shadcn/ui?',
    content: 'Yes. Your existing theme, radius tokens, and setup apply automatically.',
  },
]

export const standaloneRows: ReadonlyArray<AccordionRow> = [
  {
    value: 'item-1',
    title: 'What is this component?',
    content: 'A collapsible accordion with animated expand/collapse and spring-animated chevron.',
  },
]

export const singleRows: ReadonlyArray<AccordionRow> = [
  {
    value: 'item-1',
    title: 'Getting Started',
    content:
      'Install the component and import it into your project. The accordion supports both single and multiple expand modes.',
  },
  {
    value: 'item-2',
    title: 'Styling',
    content:
      'The component integrates with the shape system for pill or rounded border-radius variants. All animations use spring physics.',
  },
  {
    value: 'item-3',
    title: 'Accessibility',
    content:
      'Built on Radix UI or Base UI Accordion (your pick) with WAI-ARIA attributes, keyboard navigation, and focus management.',
  },
  {
    value: 'item-4',
    title: 'Animation',
    content:
      'Smooth height transitions and spring-animated chevron rotation. The fluid hover background tracks your cursor.',
  },
]

export const multipleRows: ReadonlyArray<AccordionRow> = [
  {
    value: 'item-1',
    title: 'First Section',
    content: 'Multiple items can be expanded at the same time.',
  },
  {
    value: 'item-2',
    title: 'Second Section',
    content: 'Click any trigger to expand or collapse independently.',
  },
  {
    value: 'item-3',
    title: 'Third Section',
    content: 'Each item operates independently in multiple mode.',
  },
]

export const highlightRows: ReadonlyArray<AccordionRow> = [
  {
    value: 'item-1',
    title: 'Expanded, but not tinted',
    content: 'The panel reads as part of the page rather than a filled block.',
  },
  {
    value: 'item-2',
    title: 'Hover any row',
    content: 'The fill follows your cursor instead of marking a state.',
  },
  {
    value: 'item-3',
    title: 'Compare with the sections above',
    content: 'Those hold a block across the row and its panel while open.',
  },
]

export const expandChoices = [
  { value: 'one', label: 'One at a time' },
  { value: 'oneOrNone', label: 'One or none' },
  { value: 'any', label: 'Any number' },
]
