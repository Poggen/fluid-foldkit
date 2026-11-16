import type { Context, ESTree } from '@oxlint/plugins'
import {
  immutableInitializer,
  importIdentity,
  isStringModule,
  staticPropertyKeyName,
  staticPropertyName,
  unwrapExpression,
  variableOf,
} from '../lint/import-identity.ts'

export { isStringModule, staticPropertyKeyName, staticPropertyName, unwrapExpression }

export const resolveValue = (
  value: ESTree.Expression,
  context: Context,
  seen = new Set<ESTree.Node>(),
): ESTree.Expression => {
  const node = unwrapExpression(value)
  if (node.type !== 'Identifier' || seen.has(node)) return node
  seen.add(node)
  const initializer = immutableInitializer(node, context)
  return initializer === null ? node : resolveValue(initializer, context, seen)
}

export const stringsIn = (
  value: ESTree.Expression,
  context: Context,
  seen = new Set<ESTree.Node>(),
): readonly { readonly text: string; readonly node: ESTree.Node }[] => {
  const node = resolveValue(value, context)
  if (seen.has(node)) return []
  seen.add(node)
  const text = isStringModule(node)
  if (text !== null) return [{ text, node }]
  switch (node.type) {
    case 'TemplateLiteral':
      return node.quasis.map((part) => ({ text: part.value.cooked ?? part.value.raw, node: part }))
    case 'ConditionalExpression':
      return [
        ...stringsIn(node.consequent, context, seen),
        ...stringsIn(node.alternate, context, seen),
      ]
    case 'LogicalExpression':
      return [...stringsIn(node.left, context, seen), ...stringsIn(node.right, context, seen)]
    case 'ArrayExpression':
      return node.elements.flatMap((item) =>
        item === null
          ? []
          : stringsIn(item.type === 'SpreadElement' ? item.argument : item, context, seen),
      )
    case 'ObjectExpression':
      return node.properties.flatMap((property) => {
        if (property.type === 'SpreadElement') return stringsIn(property.argument, context, seen)
        const key = staticPropertyKeyName(property)
        return key === undefined ? [] : [{ text: key, node: property.key }]
      })
    case 'BinaryExpression': {
      if (node.operator !== '+') return []
      const left = stringsIn(node.left, context, seen)
      const right = stringsIn(node.right, context, seen)
      return left.length === 1 && right.length === 1
        ? [{ text: `${left[0]?.text ?? ''}${right[0]?.text ?? ''}`, node }]
        : [...left, ...right]
    }
    case 'CallExpression': {
      const name = node.callee.type === 'Identifier' ? node.callee.name : null
      return ['cn', 'clsx', 'twMerge'].includes(name ?? '')
        ? node.arguments.flatMap((arg) =>
            stringsIn(arg.type === 'SpreadElement' ? arg.argument : arg, context, seen),
          )
        : []
    }
    default:
      return []
  }
}

const namespaces = new Set([
  'Button',
  'Badge',
  'Card',
  'Input',
  'Textarea',
  'Checkbox',
  'Switch',
  'Slider',
  'RadioGroup',
  'Tabs',
])
const componentImports = { namespaces, runtimeImportsOnly: true, immutableAliasesOnly: true }
const builderImports = { namespaces: new Set<string>() }

export const componentName = (value: ESTree.Expression, context: Context): string | null => {
  const source = resolveValue(value, context)
  const target =
    source.type === 'CallExpression' &&
    source.callee.type === 'MemberExpression' &&
    staticPropertyName(source.callee) === 'makeBlock'
      ? source.callee.object
      : value
  const identity = importIdentity(
    target,
    context.sourceCode.getScope(target),
    context,
    componentImports,
  )
  if (identity === null || identity.name === null) return null
  if (!/^@foldkit(?:-visuals\/fluid\/|\/ui(?:\/|$))/u.test(identity.module)) return null
  const name = identity.name === 'view' ? identity.module.split('/').at(-1) : identity.name
  return name?.replace(/Block$/u, '') ?? null
}

export const bindingComponent = (
  value: ESTree.Expression,
  context: Context,
  seen = new Set<ESTree.Node>(),
): string | null => {
  const node = resolveValue(value, context)
  if (seen.has(node)) return null
  seen.add(node)
  if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') return null
  const method = staticPropertyName(node.callee)
  if (method === 'withOutMessagePolicy') return bindingComponent(node.callee.object, context, seen)
  if (method !== 'makeRequiredFieldBinding' && method !== 'makeKeyedArrayBinding') return null
  const child = node.arguments[0]
  return child === undefined || child.type === 'SpreadElement'
    ? null
    : componentName(child, context)
}

export const isBuilder = (value: ESTree.Expression, context: Context): boolean => {
  const node = resolveValue(value, context)
  if (node.type !== 'Identifier') return false
  const definition = variableOf(node.name, context.sourceCode.getScope(node))?.defs[0]
  if (definition?.type !== 'Parameter') return false
  const parameter = definition.name
  if (
    'typeAnnotation' in parameter &&
    parameter.typeAnnotation?.typeAnnotation.type === 'TSTypeReference'
  ) {
    const typeName = parameter.typeAnnotation.typeAnnotation.typeName
    if (typeName.type === 'Identifier') {
      const identity = importIdentity(
        typeName,
        context.sourceCode.getScope(typeName),
        context,
        builderImports,
      )
      if (identity?.module === 'foldkit/html' && identity.name === 'HtmlBuilder') return true
    }
    if (
      typeName.type === 'TSQualifiedName' &&
      typeName.left.type === 'Identifier' &&
      typeName.right.name === 'HtmlBuilder'
    ) {
      const identity = importIdentity(
        typeName.left,
        context.sourceCode.getScope(typeName.left),
        context,
        builderImports,
      )
      if (identity?.module === 'foldkit/html' && identity.name === null) return true
    }
  }
  const fn = definition.node
  if (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression') return false
  const parent = fn.parent
  if (parent?.type !== 'CallExpression' || parent.callee.type !== 'MemberExpression') return false
  const method = staticPropertyName(parent.callee)
  const receiver = parent.callee.object
  const withInputs =
    method === 'withInputs' &&
    receiver.type === 'MemberExpression' &&
    staticPropertyName(receiver) === 'makeView'
  const index = method === 'makeView' ? 1 : withInputs ? 2 : -1
  return fn.params[index] === parameter
}

export const properties = (
  value: ESTree.Expression,
  context: Context,
  seen = new Set<ESTree.Node>(),
): readonly ESTree.ObjectProperty[] => {
  const node = resolveValue(value, context)
  if (node.type !== 'ObjectExpression' || seen.has(node)) return []
  seen.add(node)
  return node.properties.flatMap((property) =>
    property.type === 'SpreadElement' ? properties(property.argument, context, seen) : [property],
  )
}
