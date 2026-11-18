import type { ESTree } from '@oxlint/plugins'

export type TerminalReason =
  | 'binding-site'
  | 'type-position'
  | 'call-effects-excluded'
  | 'function-result-excluded'
  | 'module-export-excluded'
  | 'primitive-consumption'
  | 'control-test'
  | 'discarded-result'

type TerminalClassifier = (current: ESTree.Node, parent: ESTree.Node) => TerminalReason | null

const bindingTerminal: TerminalClassifier = (current, parent) => {
  if (parent.type === 'VariableDeclarator' && parent.id === current) {
    return 'binding-site'
  }

  if (
    (parent.type === 'ImportSpecifier' ||
      parent.type === 'ImportDefaultSpecifier' ||
      parent.type === 'ImportNamespaceSpecifier') &&
    parent.local === current
  ) {
    return 'binding-site'
  }

  return null
}

const typeTerminal: TerminalClassifier = (current, parent) =>
  (parent.type === 'TSTypeQuery' && parent.exprName === current) ||
  (parent.type === 'TSTypeReference' && parent.typeName === current) ||
  ((parent.type === 'TSInterfaceHeritage' || parent.type === 'TSClassImplements') &&
    parent.expression === current)
    ? 'type-position'
    : null

const invocationTerminal: TerminalClassifier = (current, parent) => {
  if (
    (parent.type === 'CallExpression' || parent.type === 'NewExpression') &&
    (parent.callee === current || parent.arguments.some((argument) => argument === current))
  ) {
    return 'call-effects-excluded'
  }

  if (
    parent.type === 'TaggedTemplateExpression' &&
    (parent.tag === current || parent.quasi === current)
  ) {
    return 'call-effects-excluded'
  }

  if (
    parent.type === 'TemplateLiteral' &&
    parent.expressions.some((expression) => expression === current) &&
    parent.parent.type === 'TaggedTemplateExpression' &&
    parent.parent.quasi === parent
  ) {
    return 'call-effects-excluded'
  }

  return null
}

const functionTerminal: TerminalClassifier = (current, parent) =>
  (parent.type === 'ReturnStatement' && parent.argument === current) ||
  (parent.type === 'ArrowFunctionExpression' && parent.body === current)
    ? 'function-result-excluded'
    : null

const exportTerminal: TerminalClassifier = (current, parent) =>
  (parent.type === 'ExportDefaultDeclaration' && parent.declaration === current) ||
  (parent.type === 'ExportSpecifier' && parent.local === current) ||
  (parent.type === 'TSExportAssignment' && parent.expression === current)
    ? 'module-export-excluded'
    : null

const primitiveTerminal: TerminalClassifier = (current, parent) => {
  if (
    parent.type === 'UnaryExpression' &&
    parent.argument === current &&
    parent.operator !== 'delete'
  ) {
    return 'primitive-consumption'
  }

  if (parent.type === 'BinaryExpression' && (parent.left === current || parent.right === current)) {
    return 'primitive-consumption'
  }

  if (
    parent.type === 'TemplateLiteral' &&
    parent.expressions.some((expression) => expression === current)
  ) {
    return 'primitive-consumption'
  }

  if (parent.type === 'MemberExpression' && parent.computed && parent.property === current) {
    return 'primitive-consumption'
  }

  if (parent.type === 'Property' && parent.computed && parent.key === current) {
    return 'primitive-consumption'
  }

  return null
}

const controlTerminal: TerminalClassifier = (current, parent) => {
  if (
    parent.type === 'IfStatement' ||
    parent.type === 'WhileStatement' ||
    parent.type === 'DoWhileStatement' ||
    parent.type === 'ForStatement' ||
    parent.type === 'ConditionalExpression'
  ) {
    return parent.test === current ? 'control-test' : null
  }

  if (parent.type === 'SwitchStatement' && parent.discriminant === current) {
    return 'control-test'
  }

  if (parent.type === 'SwitchCase' && parent.test === current) {
    return 'control-test'
  }

  return null
}

const discardTerminal: TerminalClassifier = (current, parent) =>
  (parent.type === 'ExpressionStatement' && parent.expression === current) ||
  (parent.type === 'ForStatement' && (parent.init === current || parent.update === current))
    ? 'discarded-result'
    : null

const terminalClassifiers: readonly TerminalClassifier[] = [
  bindingTerminal,
  typeTerminal,
  invocationTerminal,
  functionTerminal,
  exportTerminal,
  primitiveTerminal,
  controlTerminal,
  discardTerminal,
]

export const terminalReason: (
  current: ESTree.Node,
  parent: ESTree.Node,
) => TerminalReason | null = (current: ESTree.Node, parent: ESTree.Node) => {
  for (const classify of terminalClassifiers) {
    const reason = classify(current, parent)

    if (reason !== null) {
      return reason
    }
  }

  return null
}
