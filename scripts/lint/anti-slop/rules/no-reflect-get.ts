import { defineRule } from '@oxlint/plugins'
import type { Context, ESTree } from '@oxlint/plugins'
import { collectModuleOrigin } from '../../origin-mutation.ts'
import { isGlobalReflectMethodCall } from '../shared/reflect-method.ts'
import { importIdentity, immutableInitializer } from '../../import-identity.ts'

const schemaImports = {
  namespaces: new Set(['Schema']),
  runtimeImportsOnly: true,
  immutableAliasesOnly: true,
}
const cellPrimitives = new Set(['Finite', 'String', 'Date'])

function schemaMember(expression: ESTree.Expression, context: Context): string | null {
  const identity = importIdentity(
    expression,
    context.sourceCode.getScope(expression),
    context,
    schemaImports,
  )

  return identity?.module === 'effect/Schema' ? identity.name : null
}

function finiteCell(
  expression: ESTree.Expression,
  context: Context,
  seen = new Set<ESTree.Node>(),
): boolean {
  if (seen.has(expression)) {
    return false
  }

  seen.add(expression)
  const member = schemaMember(expression, context)

  if (member !== null && cellPrimitives.has(member)) {
    return true
  }

  if (expression.type === 'Identifier') {
    const initializer = immutableInitializer(expression, context)

    return initializer !== null && finiteCell(initializer, context, seen)
  }

  if (
    expression.type !== 'CallExpression' ||
    expression.callee.type === 'Super' ||
    expression.callee.type === 'V8IntrinsicExpression' ||
    expression.arguments.length !== 1 ||
    schemaMember(expression.callee, context) !== 'Union'
  ) {
    return false
  }

  const members = expression.arguments.at(0)

  return (
    members?.type === 'ArrayExpression' &&
    members.elements.length > 0 &&
    members.elements.every(
      (item) =>
        item !== null && item.type !== 'SpreadElement' && finiteCell(item, context, new Set(seen)),
    )
  )
}

function optionDecoder(
  expression: ESTree.Expression,
  context: Context,
  seen = new Set<ESTree.Node>(),
): boolean {
  if (seen.has(expression)) {
    return false
  }

  seen.add(expression)

  if (expression.type === 'Identifier') {
    const initializer = immutableInitializer(expression, context)

    return initializer !== null && optionDecoder(initializer, context, seen)
  }

  if (
    expression.type !== 'CallExpression' ||
    expression.callee.type === 'Super' ||
    expression.callee.type === 'V8IntrinsicExpression' ||
    expression.arguments.length !== 1 ||
    schemaMember(expression.callee, context) !== 'decodeUnknownOption'
  ) {
    return false
  }

  const contract = expression.arguments.at(0)

  return (
    contract !== undefined && contract.type !== 'SpreadElement' && finiteCell(contract, context)
  )
}

function directlyDecoded(node: ESTree.CallExpression, context: Context): boolean {
  const parent = node.parent

  if (
    node.arguments.length !== 2 ||
    node.arguments.some((argument) => argument.type === 'SpreadElement') ||
    parent?.type !== 'CallExpression' ||
    parent.arguments.length !== 1 ||
    parent.arguments.at(0) !== node ||
    parent.callee.type === 'Super' ||
    parent.callee.type === 'V8IntrinsicExpression'
  ) {
    return false
  }

  return optionDecoder(parent.callee, context)
}

/** Dynamic public cells must enter a concrete decoder before their value can escape. */
export const noReflectGetRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow unchecked Reflect.get; admit only immediate finite Effect Schema cell decoding.',
    },
    messages: {
      reflectGet:
        '`Reflect.get` bypasses property type evidence. Use typed property access, or pass its two-argument result directly into a genuine Effect Schema.decodeUnknownOption decoder of an immutable Finite, String, Date or closed union cell contract.',
    },
  },
  createOnce(context) {
    let pending: ESTree.CallExpression[] = []

    return {
      Program() {
        pending = []
      },
      ImportExpression(node) {
        collectModuleOrigin(context, node)
      },
      AwaitExpression(node) {
        collectModuleOrigin(context, node)
      },
      CallExpression(node) {
        collectModuleOrigin(context, node)
        if (node.callee.type === 'Super' || node.callee.type === 'V8IntrinsicExpression') return

        if (isGlobalReflectMethodCall(context.sourceCode, node.callee, 'get')) pending.push(node)
      },
      'Program:exit'() {
        for (const node of pending) {
          if (!directlyDecoded(node, context)) context.report({ node, messageId: 'reflectGet' })
        }
        pending = []
      },
    }
  },
})
