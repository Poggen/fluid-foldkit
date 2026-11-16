import type { Context, Definition, ESTree, Scope, Variable } from '@oxlint/plugins'
import {
  bindingSources,
  isExpressionWrapper,
  staticProjection,
  staticPropertyName,
  unwrapExpression,
} from './alias-grammar.ts'

import {
  hasLexicalMutation,
  hasOriginMutation,
  isStableVariable,
  variableOf,
} from './origin-mutation.ts'
import type { ImportIdentity, ImportIdentityOptions } from './origin-mutation.ts'

export { staticPropertyKeyName, staticPropertyName, unwrapExpression } from './alias-grammar.ts'

export { isStableVariable, variableOf } from './origin-mutation.ts'

export type { ImportIdentity, ImportIdentityOptions } from './origin-mutation.ts'

type RuleContext = Context

export const isStringModule = (node: ESTree.Expression): string | null => {
  const expression = unwrapExpression(node)

  if (expression.type === 'Literal' && typeof expression.value === 'string') {
    return expression.value
  }

  if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) {
    const value = expression.quasis[0]?.value.cooked ?? expression.quasis[0]?.value.raw

    return value ?? null
  }

  return null
}

export const importedName = (
  node: ESTree.ImportDeclaration['specifiers'][number],
): string | null => {
  if (node.type !== 'ImportSpecifier') {
    return null
  }

  if (node.imported.type === 'Identifier') {
    return node.imported.name
  }

  return node.imported.value
}

const importBindingIdentity = (definition: Definition): ImportIdentity | null => {
  const { parent } = definition.node

  if (definition.type !== 'ImportBinding' || parent?.type !== 'ImportDeclaration') {
    return null
  }

  const module = isStringModule(parent.source)

  if (module === null) {
    return null
  }

  return {
    module,
    name: definition.node.type === 'ImportSpecifier' ? importedName(definition.node) : null,
  }
}

export const isTypeOnlyDefinition = (definition: Definition) => {
  if (
    definition.node.type === 'TSInterfaceDeclaration' ||
    definition.node.type === 'TSTypeAliasDeclaration'
  ) {
    return true
  }

  if (
    definition.node.type === 'TSDeclareFunction' ||
    ((definition.node.type === 'TSModuleDeclaration' ||
      definition.node.type === 'ClassDeclaration' ||
      definition.node.type === 'TSEnumDeclaration' ||
      definition.node.type === 'FunctionDeclaration') &&
      definition.node.declare === true)
  ) {
    return true
  }

  let ancestor = definition.node.parent

  while (ancestor !== null) {
    if (ancestor.type === 'TSModuleDeclaration' && ancestor.declare) {
      return true
    }

    ancestor = ancestor.parent
  }

  if (definition.type === 'ImportBinding') {
    const { parent } = definition.node

    if (
      parent?.type === 'ImportDeclaration' &&
      (parent.importKind === 'type' ||
        (definition.node.type === 'ImportSpecifier' && definition.node.importKind === 'type'))
    ) {
      return true
    }
  }

  return (
    definition.node.type === 'VariableDeclarator' &&
    definition.node.parent.type === 'VariableDeclaration' &&
    definition.node.parent.declare === true
  )
}

export const isDeclaredLocally = (name: string, scope: Scope | null): boolean =>
  scope !== null &&
  ((scope.set.get(name)?.defs.some((definition) => !isTypeOnlyDefinition(definition)) ?? false) ||
    isDeclaredLocally(name, scope.upper))

export const immutableInitializer = (
  identifier: ESTree.IdentifierReference,
  context: RuleContext,
): ESTree.Expression | null => {
  const variable = variableOf(identifier.name, context.sourceCode.getScope(identifier))
  const definition = variable?.defs.at(0)

  if (
    variable === undefined ||
    variable.defs.length !== 1 ||
    !isStableVariable(variable) ||
    hasLexicalMutation(variable, context) ||
    definition?.type !== 'Variable' ||
    definition.node.type !== 'VariableDeclarator' ||
    definition.node.parent.type !== 'VariableDeclaration' ||
    definition.node.parent.kind !== 'const'
  ) {
    return null
  }

  const bindings = bindingSources(definition.node)
  const target = bindings?.targets.find((item) => item.identifier.name === identifier.name)

  return bindings?.unsupported === false && target?.path.length === 0 ? bindings.source : null
}

const isIdentityVariable = (variable: Variable, options: ImportIdentityOptions): boolean => {
  if (!isStableVariable(variable)) {
    return false
  }

  if (options.immutableAliasesOnly !== true) {
    return true
  }

  return variable.defs.every(
    (definition) =>
      definition.type === 'Variable' &&
      definition.node.type === 'VariableDeclarator' &&
      definition.node.parent.type === 'VariableDeclaration' &&
      definition.node.parent.kind === 'const',
  )
}

const isModuleRequireBinding = (
  source: ESTree.Expression,
  projection: readonly string[] | undefined,
  scope: Scope | null,
): boolean => {
  const initializer = unwrapExpression(source)

  return (
    initializer.type === 'Identifier' &&
    initializer.name === 'module' &&
    !isDeclaredLocally('module', scope) &&
    projection?.[0] === 'require'
  )
}

const resolveImportIdentity = (
  expression: ESTree.Node,
  scope: Scope | null,
  context: RuleContext,
  options: ImportIdentityOptions,
  seen = new Set<Definition['node']>(),
  variables = new Set<Variable>(),
): ImportIdentity | null => {
  const requireFunction = (
    candidate: ESTree.Expression,
    candidateScope: Scope | null,
    visited = new Set<Definition['node']>(),
  ): boolean => {
    const requireBinding = (name: string, bindingScope: Scope | null) => {
      const variable = variableOf(name, bindingScope)

      if (name === 'require' && !isDeclaredLocally(name, bindingScope)) {
        return true
      }

      const [definition] = variable?.defs ?? []

      if (
        variable === undefined ||
        definition?.type !== 'Variable' ||
        definition.node.type !== 'VariableDeclarator' ||
        definition.node.init === null ||
        !isIdentityVariable(variable, options) ||
        visited.has(definition.node)
      ) {
        return false
      }

      visited.add(definition.node)

      const declarationScope = context.sourceCode.getScope(definition.node)
      const bindings = bindingSources(definition.node)
      const binding = bindings?.targets.find((item) => item.identifier.name === name)

      if (bindings === null || (options.immutableAliasesOnly === true && bindings.unsupported)) {
        return false
      }

      if (definition.node.id.type === 'ObjectPattern') {
        return isModuleRequireBinding(bindings.source, binding?.path, declarationScope)
      }

      if (binding?.path.length !== 0) {
        return false
      }

      return requireFunction(bindings.source, declarationScope, visited)
    }

    const target = unwrapExpression(candidate)

    if (target.type === 'Identifier') {
      return requireBinding(target.name, candidateScope)
    }

    if (target.type === 'MemberExpression') {
      return (
        staticPropertyName(target) === 'require' &&
        target.object.type === 'Identifier' &&
        target.object.name === 'module' &&
        !isDeclaredLocally('module', candidateScope)
      )
    }

    if (target.type === 'CallExpression') {
      const identity = resolveImportIdentity(
        target.callee,
        candidateScope,
        context,
        options,
        visited,
        variables,
      )

      return (
        identity?.name === 'createRequire' &&
        (identity.module === 'module' || identity.module === 'node:module')
      )
    }

    return false
  }

  const loadedModuleIdentity = (
    candidate: ESTree.Expression,
    candidateScope: Scope | null,
  ): ImportIdentity | null => {
    const target = unwrapExpression(candidate)

    if (target.type === 'AwaitExpression') {
      return loadedModuleIdentity(target.argument, candidateScope)
    }

    if (target.type === 'ImportExpression') {
      const module = isStringModule(target.source)

      return module === null ? null : { module, name: null }
    }

    if (target.type !== 'CallExpression') {
      return null
    }

    const [argument] = target.arguments

    if (
      argument === undefined ||
      argument.type === 'SpreadElement' ||
      !requireFunction(target.callee, candidateScope)
    ) {
      return null
    }

    const module = isStringModule(argument)

    return module === null ? null : { module, name: null }
  }

  const projectIdentity = (
    identity: ImportIdentity | null,
    path: readonly string[],
  ): ImportIdentity | null => {
    let current = identity

    for (const name of path) {
      if (current === null || (current.name !== null && !options.namespaces.has(current.name))) {
        return null
      }

      current = {
        module: current.name === null ? current.module : `${current.module}/${current.name}`,
        name,
      }
    }

    return current
  }

  const importIdentityForVariable = (name: string, variable: Variable): ImportIdentity | null => {
    const [definition] = variable.defs

    if (definition === undefined || seen.has(definition.node)) {
      return null
    }

    seen.add(definition.node)
    variables.add(variable)

    const imported = importBindingIdentity(definition)

    if (imported !== null) {
      if (options.runtimeImportsOnly === true && isTypeOnlyDefinition(definition)) {
        return null
      }

      return imported
    }

    if (
      definition.type !== 'Variable' ||
      definition.node.type !== 'VariableDeclarator' ||
      !isIdentityVariable(variable, options) ||
      definition.node.init === null
    ) {
      return null
    }

    const bindings = bindingSources(definition.node)
    const binding = bindings?.targets.find((item) => item.identifier.name === name)
    const declarationScope = context.sourceCode.getScope(definition.node)

    if (bindings === null || (options.immutableAliasesOnly === true && bindings.unsupported)) {
      return null
    }

    if (binding === undefined) {
      return options.immutableAliasesOnly === true || definition.node.id.type === 'ObjectPattern'
        ? null
        : resolveImportIdentity(
            bindings.source,
            declarationScope,
            context,
            options,
            seen,
            variables,
          )
    }

    return projectIdentity(
      resolveImportIdentity(bindings.source, declarationScope, context, options, seen, variables),
      binding.path,
    )
  }

  if (isExpressionWrapper(expression)) {
    return resolveImportIdentity(expression.expression, scope, context, options, seen, variables)
  }

  if (expression.type === 'Identifier') {
    const variable = variableOf(expression.name, scope)

    return variable === undefined ? null : importIdentityForVariable(expression.name, variable)
  }

  if (
    expression.type === 'CallExpression' ||
    expression.type === 'AwaitExpression' ||
    expression.type === 'ImportExpression'
  ) {
    return loadedModuleIdentity(expression, scope)
  }

  if (expression.type === 'MemberExpression') {
    const projection = staticProjection(expression)

    if (projection === null) {
      return null
    }

    return projectIdentity(
      resolveImportIdentity(projection.source, scope, context, options, seen, variables),
      projection.path,
    )
  }

  return null
}

export const importIdentity = (
  expression: ESTree.Expression,
  scope: Scope | null,
  context: RuleContext,
  options: ImportIdentityOptions,
  seen = new Set<Definition['node']>(),
): ImportIdentity | null => {
  const variables = new Set<Variable>()
  const identity = resolveImportIdentity(expression, scope, context, options, seen, variables)

  if (identity === null || options.immutableAliasesOnly !== true) {
    return identity
  }

  if ([...variables].some((variable) => hasLexicalMutation(variable, context))) {
    return null
  }

  const resolve = (node: ESTree.Node) =>
    resolveImportIdentity(node, context.sourceCode.getScope(node), context, options)

  const origins = [
    identity,
    ...[...variables].map((variable) => {
      const identifier = variable.identifiers.at(0)

      return identifier === undefined
        ? null
        : resolveImportIdentity(identifier, variable.scope, context, options)
    }),
  ]

  return hasOriginMutation(origins, context, options, resolve) ? null : identity
}
