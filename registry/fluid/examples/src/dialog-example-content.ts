export const dialogCopy = {
  basic: [
    'Open dialog',
    'Create teamspace',
    'Add a new teamspace to organize your projects and collaborate with your team.',
  ],
  small: ['Small', 'Small dialog', '400px: a confirmation, 1 field, a short message.'],
  large: ['Large', 'Large dialog', '540px: a short form, or a longer confirmation.'],
  extraLarge: [
    'Extra large',
    'Extra large dialog',
    '880px: 2 columns, a table, or a sidebar beside a panel.',
  ],
  seeded: [
    'Open seeded dialog',
    'Initially open',
    'defaultOpen seeds this uncontrolled occurrence once.',
  ],
  nested: ['Open nested dialog', 'Nested dialog', 'Close this dialog to return to its parent.'],
  scoped: ['Open scoped dialog', 'Scoped dialog', 'A nonmodal portal inside a bounded region.'],
  outer: [
    'Open parent dialog',
    'Parent dialog',
    'Focus returns here after closing the nested dialog.',
  ],
  controlled: [
    'Open controlled',
    'Controlled dialog',
    'The caller decides whether close requests are admitted.',
  ],
} as const
