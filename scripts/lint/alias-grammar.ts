import type { ESTree } from '@oxlint/plugins'
import { terminalReason } from './terminal-uses.ts'
import type { TerminalReason } from './terminal-uses.ts'

type PropertyNode = Extract<ESTree.Node, { type: 'Property' }>

type StaticKeyValue = Extract<ESTree.Node, { type: 'Literal' }>['value'] | null

type ExpressionWrapper = Extract<
  ESTree.Expression,
  {
    type:
      | 'ParenthesizedExpression'
      | 'TSAsExpression'
      | 'TSNonNullExpression'
      | 'TSSatisfiesExpression'
      | 'TSInstantiationExpression'
      | 'TSTypeAssertion'
  }
>

export const isExpressionWrapper = (node: ESTree.Node): node is ExpressionWrapper => {
  if (
    node.type === 'ParenthesizedExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSNonNullExpression' ||
    node.type === 'TSSatisfiesExpression' ||
    node.type === 'TSInstantiationExpression' ||
    node.type === 'TSTypeAssertion'
  ) {
    return true
  }

  return false
}

export const unwrapExpression: (node: ESTree.Expression) => ESTree.Expression = (
  node: ESTree.Expression,
) => (isExpressionWrapper(node) ? unwrapExpression(node.expression) : node)

export const staticPropertyKeyName: (node: PropertyNode) => string | undefined = (
  node: PropertyNode,
) => {
  if (!node.computed && node.key.type === 'Identifier') {
    return node.key.name
  }

  let value: StaticKeyValue = null

  if (node.computed && node.key.type === 'Literal') {
    const { value: literalValue } = node.key
    value = literalValue
  }

  if (node.computed && node.key.type === 'TemplateLiteral' && node.key.expressions.length === 0) {
    const [firstQuasi] = node.key.quasis
    value = firstQuasi?.value.cooked ?? firstQuasi?.value.raw ?? null
  }

  return typeof value === 'string' ? value : undefined
}

export const staticPropertyName = (node: ESTree.MemberExpression) => {
  if (!node.computed && node.property.type === 'Identifier') {
    return node.property.name
  }

  let value: StaticKeyValue = null

  if (node.computed && node.property.type === 'Literal') {
    const { value: literalValue } = node.property
    value = literalValue
  }

  if (
    node.computed &&
    node.property.type === 'TemplateLiteral' &&
    node.property.expressions.length === 0
  ) {
    const [firstQuasi] = node.property.quasis
    value = firstQuasi?.value.cooked ?? firstQuasi?.value.raw ?? null
  }

  return typeof value === 'string' ? value : undefined
}

export interface StaticProjection {
  readonly source: ESTree.Expression
  readonly path: readonly string[]
}

export const staticProjection: (expression: ESTree.Expression) => StaticProjection | null = (
  expression: ESTree.Expression,
) => {
  const target = unwrapExpression(expression)

  if (target.type !== 'MemberExpression') {
    return { source: target, path: [] }
  }

  const key = staticPropertyName(target)
  const source = staticProjection(target.object)

  return key === undefined || source === null
    ? null
    : { source: source.source, path: [...source.path, key] }
}

export interface BindingTarget {
  readonly identifier: ESTree.BindingIdentifier
  readonly path: readonly string[]
}

export interface BindingSources {
  readonly source: ESTree.Expression
  readonly targets: readonly BindingTarget[]
  readonly unsupported: boolean
}

export const bindingSources: (declaration: ESTree.VariableDeclarator) => BindingSources | null = (
  declaration: ESTree.VariableDeclarator,
) => {
  if (declaration.init === null) {
    return null
  }

  const { id, init: source } = declaration

  if (id.type === 'Identifier') {
    return { source, targets: [{ identifier: id, path: [] }], unsupported: false }
  }

  if (id.type !== 'ObjectPattern') {
    return { source, targets: [], unsupported: true }
  }

  const targets: BindingTarget[] = []
  let unsupported = false

  for (const property of id.properties) {
    if (property.type !== 'Property' || property.value.type !== 'Identifier') {
      unsupported = true
      continue
    }

    const key = staticPropertyKeyName(property)

    if (key === undefined) {
      unsupported = true
    } else {
      targets.push({ identifier: property.value, path: [key] })
    }
  }

  return { source, targets, unsupported }
}

export type ReferenceUse =
  | {
      readonly kind: 'binding'
      readonly declaration: ESTree.VariableDeclarator
      readonly bindings: BindingSources
    }
  | { readonly kind: 'mutation' | 'unsupported' }
  | { readonly kind: 'terminal'; readonly reason: TerminalReason }

const captureCarriers = new Set<ESTree.Node['type']>([
  'ObjectExpression',
  'ObjectPattern',
  'ArrayExpression',
  'ArrayPattern',
  'SpreadElement',
  'RestElement',
  'ConditionalExpression',
  'LogicalExpression',
  'SequenceExpression',
  'AwaitExpression',
  'YieldExpression',
])

const isCaptureCarrier: (parent: ESTree.Node, current: ESTree.Node) => boolean = (
  parent: ESTree.Node,
  current: ESTree.Node,
) => (parent.type === 'Property' && parent.value === current) || captureCarriers.has(parent.type)

const isMutationTarget: (parent: ESTree.Node | null, current: ESTree.Node) => boolean = (
  parent: ESTree.Node | null,
  current: ESTree.Node,
) =>
  (parent?.type === 'AssignmentExpression' && parent.left === current) ||
  (parent?.type === 'UpdateExpression' && parent.argument === current) ||
  (parent?.type === 'UnaryExpression' &&
    parent.operator === 'delete' &&
    parent.argument === current) ||
  ((parent?.type === 'ForInStatement' || parent?.type === 'ForOfStatement') &&
    parent.left === current)

const referenceExpression: (identifier: ESTree.Node) => ESTree.Node | null = (
  identifier: ESTree.Node,
) => {
  let expression: ESTree.Node = identifier

  while (expression.parent !== null) {
    const parent: ESTree.Node = expression.parent

    if (parent.type === 'MemberExpression' && parent.object === expression) {
      if (staticProjection(parent) === null) {
        return null
      }

      expression = parent
    } else if (isExpressionWrapper(parent) && parent.expression === expression) {
      expression = parent
    } else {
      break
    }
  }

  return expression
}

const isTypeQualification: (parent: ESTree.Node, current: ESTree.Node) => boolean = (
  parent: ESTree.Node,
  current: ESTree.Node,
) => parent.type === 'TSQualifiedName' && (parent.left === current || parent.right === current)

export const referenceUse: (identifier: ESTree.Node) => ReferenceUse = (
  identifier: ESTree.Node,
) => {
  const expression = referenceExpression(identifier)

  if (expression === null) {
    return { kind: 'unsupported' }
  }

  let current: ESTree.Node = expression
  let captured = false

  while (current.parent !== null) {
    const parent: ESTree.Node = current.parent
    const reason = terminalReason(current, parent)

    if (reason !== null) {
      return { kind: 'terminal', reason }
    }

    if (parent.type === 'VariableDeclarator' && parent.init === current) {
      const bindings = bindingSources(parent)

      return captured || bindings === null
        ? { kind: 'unsupported' }
        : { kind: 'binding', declaration: parent, bindings }
    }

    if (isMutationTarget(parent, current)) {
      return { kind: captured ? 'unsupported' : 'mutation' }
    }

    if (isExpressionWrapper(parent) && parent.expression === current) {
      current = parent
    } else if (isTypeQualification(parent, current)) {
      current = parent
    } else if (isCaptureCarrier(parent, current)) {
      captured = true
      current = parent
    } else {
      return { kind: 'unsupported' }
    }
  }

  return { kind: 'unsupported' }
}
