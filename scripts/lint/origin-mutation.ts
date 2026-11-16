import type { Context, ESTree, Scope, Variable } from '@oxlint/plugins'
import { isExpressionWrapper, referenceUse } from './alias-grammar.ts'
import type { ReferenceUse } from './alias-grammar.ts'

type RuleContext = Context

export interface ImportIdentityOptions {
  readonly namespaces: ReadonlySet<string>
  readonly runtimeImportsOnly?: boolean
  readonly immutableAliasesOnly?: boolean
}

export const variableOf = (name: string, scope: Scope | null): Variable | undefined =>
  scope === null ? undefined : (scope.set.get(name) ?? variableOf(name, scope.upper))

export const isStableVariable = (variable: Variable) =>
  variable.references.every((reference) => !reference.isWrite() || reference.init)

export interface ImportIdentity {
  readonly module: string
  readonly name: string | null
}

const useMutates = (initial: readonly ReferenceUse[], context: RuleContext): boolean => {
  const pending = [...initial]
  const seen = new Set<Variable>()

  while (pending.length > 0) {
    const use = pending.pop()

    if (use === undefined || use.kind === 'terminal') {
      continue
    }

    if (use.kind !== 'binding') {
      return true
    }

    if (
      use.bindings.unsupported ||
      use.declaration.parent.type !== 'VariableDeclaration' ||
      use.declaration.parent.kind !== 'const'
    ) {
      return true
    }

    for (const { identifier } of use.bindings.targets) {
      const alias = variableOf(identifier.name, context.sourceCode.getScope(use.declaration))

      if (alias === undefined || !isStableVariable(alias)) {
        return true
      }

      if (seen.has(alias)) {
        continue
      }

      seen.add(alias)
      pending.push(...alias.references.map((reference) => referenceUse(reference.identifier)))
    }
  }

  return false
}

export const hasLexicalMutation = (variable: Variable, context: RuleContext): boolean =>
  useMutates(
    variable.references.map((reference) => referenceUse(reference.identifier)),
    context,
  )

type SchemaOrigin = 'namespace' | 'Finite' | 'String' | 'Date' | 'Union' | 'decodeUnknownOption'

type ProvenanceResolver = (node: ESTree.Node) => ImportIdentity | null

const schemaOrigin = (identity: ImportIdentity | null): SchemaOrigin | null => {
  if (identity === null) {
    return null
  }

  if (
    (identity.module === 'effect' && identity.name === 'Schema') ||
    (identity.module === 'effect/Schema' && identity.name === null)
  ) {
    return 'namespace'
  }

  if (identity.module !== 'effect/Schema' || identity.name === null) {
    return null
  }

  switch (identity.name) {
    case 'Finite':
    case 'String':
    case 'Date':
    case 'Union':
    case 'decodeUnknownOption': {
      return identity.name
    }

    default: {
      return null
    }
  }
}

const mutationIndexes = new WeakMap<
  ESTree.Program,
  WeakMap<ImportIdentityOptions, ReadonlySet<SchemaOrigin>>
>()

type ModuleOriginAnchor = Extract<
  ESTree.Expression,
  { type: 'ImportExpression' | 'AwaitExpression' | 'CallExpression' }
>

const moduleAnchors = new WeakMap<ESTree.Program, Set<ModuleOriginAnchor>>()

export const collectModuleOrigin = (context: RuleContext, node: ModuleOriginAnchor): void => {
  const program = context.sourceCode.ast
  let anchors = moduleAnchors.get(program)

  if (anchors === undefined) {
    anchors = new Set<ModuleOriginAnchor>()
    moduleAnchors.set(program, anchors)
  }

  anchors.add(node)
  mutationIndexes.delete(program)
}

const maximalModuleEntry = (node: ESTree.Node, resolve: ProvenanceResolver): ESTree.Node => {
  let current = node

  while (current.parent !== null) {
    const parent: ESTree.Node = current.parent

    if (isExpressionWrapper(parent) && parent.expression === current) {
      current = parent
      continue
    }

    const origin = schemaOrigin(resolve(current))

    if (
      parent.type === 'AwaitExpression' &&
      parent.argument === current &&
      origin !== null &&
      schemaOrigin(resolve(parent)) === origin
    ) {
      current = parent
    } else {
      break
    }
  }

  return current
}

const mutatedOrigins = (
  context: RuleContext,
  policy: ImportIdentityOptions,
  resolve: ProvenanceResolver,
): ReadonlySet<SchemaOrigin> => {
  const program = context.sourceCode.ast
  let policies = mutationIndexes.get(program)

  if (policies === undefined) {
    policies = new WeakMap<ImportIdentityOptions, ReadonlySet<SchemaOrigin>>()
    mutationIndexes.set(program, policies)
  }

  const cached = policies.get(policy)

  if (cached !== undefined) {
    return cached
  }

  const mutations = new Set<SchemaOrigin>()
  let root = context.sourceCode.getScope(program)

  while (root.upper !== null) {
    root = root.upper
  }

  const pending = [root]

  const inspect = (node: ESTree.Node) => {
    let current: ESTree.Node = maximalModuleEntry(node, resolve)

    while (true) {
      const origin = schemaOrigin(resolve(current))

      if (origin !== null && useMutates([referenceUse(current)], context)) {
        mutations.add(origin)
      }

      const parent: ESTree.Node | null = current.parent

      if (parent?.type === 'MemberExpression' && parent.object === current) {
        current = maximalModuleEntry(parent, resolve)
      } else if (parent !== null && isExpressionWrapper(parent) && parent.expression === current) {
        current = parent
      } else {
        break
      }
    }
  }

  while (pending.length > 0) {
    const scope = pending.pop()

    if (scope === undefined) {
      break
    }

    pending.push(...scope.childScopes)

    for (const variable of scope.variables) {
      for (const reference of variable.references) {
        inspect(reference.identifier)
      }
    }
  }

  for (const anchor of moduleAnchors.get(program) ?? []) {
    inspect(anchor)
  }

  policies.set(policy, mutations)

  return mutations
}

export const hasOriginMutation = (
  identities: readonly (ImportIdentity | null)[],
  context: RuleContext,
  policy: ImportIdentityOptions,
  resolve: ProvenanceResolver,
): boolean => {
  const origins = identities.flatMap((identity) => {
    const origin = schemaOrigin(identity)

    return origin === null ? [] : [origin]
  })

  if (origins.length === 0) {
    return false
  }

  const mutations = mutatedOrigins(context, policy, resolve)

  return mutations.has('namespace') || origins.some((origin) => mutations.has(origin))
}
