import type { CatalogueFamily } from './showcase-catalogue-types.js'

export const latestComponentCatalogue: ReadonlyArray<CatalogueFamily> = [
  {
    slug: 'breadcrumb',
    name: 'Breadcrumb',
    entryPoints: ['breadcrumb'],
    examples: [{ file: 'breadcrumb.html', label: 'Authored trails and responsive collapse' }],
    exampleKind: 'focused',
    states:
      'Natural-width collapse, separators, dropdown trails, truncation tooltips, sharp corners and standard hover.',
    testOwners: ['breadcrumb.test.ts'],
    note: '',
  },
  {
    slug: 'checkbox',
    name: 'Checkbox',
    entryPoints: ['checkbox'],
    examples: [
      { file: 'checkbox.html', label: 'Authored checkbox sections' },
      { file: 'forms.html', label: 'Form integration' },
    ],
    exampleKind: 'focused',
    states:
      'Controlled choices, check motion, required/reset behavior, choice cards and sharp corners.',
    testOwners: ['forms.test.ts', 'forms-dom.test.ts'],
    note: '',
  },
  {
    slug: 'field',
    name: 'Field',
    entryPoints: ['field'],
    examples: [{ file: 'field.html', label: 'All ten authored sections' }],
    exampleKind: 'focused',
    states:
      'Automatic association, labels, descriptions, errors, orientation, choice cards, fieldsets and separators.',
    testOwners: ['forms.test.ts', 'forms-dom.test.ts'],
    note: '',
  },
  {
    slug: 'input',
    name: 'Input',
    entryPoints: ['input'],
    examples: [
      { file: 'input.html', label: 'All six authored sections' },
      { file: 'forms.html', label: 'Form integration' },
    ],
    exampleKind: 'focused',
    states:
      'Text, number stepping, files through the shared registry, disabled/error states and shapes.',
    testOwners: ['forms.test.ts', 'forms-dom.test.ts'],
    note: '',
  },
  {
    slug: 'textarea',
    name: 'Textarea',
    entryPoints: ['textarea'],
    examples: [{ file: 'textarea.html', label: 'All five authored sections' }],
    exampleKind: 'focused',
    states:
      'Controlled multiline text, field sizing, resize, descriptions, disabled/error states and shapes.',
    testOwners: ['forms.test.ts', 'forms-dom.test.ts'],
    note: '',
  },
]
