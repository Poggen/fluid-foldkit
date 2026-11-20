// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics nodeBuiltinImport:off -- Oxlint checks the repository's module boundaries with Node path and builtin-module APIs.
import {
  importIdentity,
  isDeclaredLocally,
  isStableVariable,
  isStringModule,
  staticPropertyKeyName,
  staticPropertyName,
  unwrapExpression,
  variableOf,
} from './import-identity.ts'
import { isBuiltin } from 'node:module'
import path from 'node:path'
import { definePlugin, defineRule } from '@oxlint/plugins'
import type { Context, Definition, ESTree, Scope } from '@oxlint/plugins'

type RuleContext = Context

const repoRoot = path.resolve(import.meta.dirname, '../..')
const workspacePackages = {
  '@foldkit-visuals/fluid': 'registry/fluid',
  '@foldkit-visuals/charts': 'registry/charts',
  '@foldkit-visuals/ramka': 'registry/ramka',
  '@foldkit-visuals/showcase': 'app',
}
const workspacePath = (filename: string) =>
  path.relative(repoRoot, path.resolve(filename)).split(path.sep).join('/')
const isWithin = (filename: string, directory: string) =>
  filename === directory || filename.startsWith(`${directory}/`)
const isBrowserZone = (filename: string) =>
  /^registry\/(?:fluid|charts|ramka)\/(?:src|examples\/src)\//u.test(filename)

const normalizeWorkspacePath: (filename: string, specifier: string) => string | null = (
  filename: string,
  specifier: string,
) => {
  if (specifier.startsWith('.'))
    return path.posix.normalize(path.posix.join(path.posix.dirname(filename), specifier))
  if (specifier.startsWith('app/') || specifier.startsWith('registry/'))
    return path.posix.normalize(specifier)
  if (specifier.startsWith('/')) return workspacePath(specifier)
  const workspace = Object.entries(workspacePackages).find(
    ([name]) => specifier === name || specifier.startsWith(`${name}/`),
  )
  return workspace === undefined
    ? null
    : path.posix.join(workspace[1], specifier.slice(workspace[0].length + 1))
}

const isPortableNativeRendererImport = (
  filename: string,
  specifier: string,
  target: string | null,
) =>
  isBrowserZone(filename) &&
  (specifier === 'foldkit/experimental/server' ||
    target?.replace(/\.[cm]?[jt]s$/u, '') === 'registry/charts/src/pie/private/server')

const browserServerModule = (filename: string, specifier: string) => {
  const normalized = specifier.toLowerCase()
  const target = normalizeWorkspacePath(filename, specifier)
  return (
    isBuiltin(specifier) ||
    normalized.startsWith('node:') ||
    normalized === '@effect/platform-node' ||
    normalized.startsWith('@effect/platform-node/') ||
    normalized === 'server-only' ||
    normalized.startsWith('server-only/') ||
    normalized.includes('/httpserver') ||
    (!isPortableNativeRendererImport(filename, specifier, target) &&
      (/(?:^|\/)server(?:\.[cm]?[jt]s)?(?:\/|$)/u.test(normalized) ||
        /\.server(?:\.[^/]*)?$/u.test(normalized)))
  )
}

const isRequireFunction: (
  expression: ESTree.Expression,
  scope: Scope,
  context: RuleContext,
  seen?: Set<ESTree.Node>,
) => boolean = (
  expression: ESTree.Expression,
  scope: Scope,
  context: RuleContext,
  seen = new Set<Definition['node']>(),
) => {
  const isRequireBinding: (name: string, bindingScope: Scope) => boolean = (
    name: string,
    bindingScope: Scope,
  ) => {
    const variable = variableOf(name, bindingScope)

    if (name === 'require' && !isDeclaredLocally(name, bindingScope)) {
      return true
    }

    const [definition] = variable?.defs ?? []

    if (
      variable === undefined ||
      definition === undefined ||
      definition.type !== 'Variable' ||
      definition.node.type !== 'VariableDeclarator' ||
      definition.node.init === null ||
      !isStableVariable(variable) ||
      seen.has(definition.node)
    ) {
      return false
    }

    seen.add(definition.node)

    const declarationScope = context.sourceCode.getScope(definition.node)

    if (definition.node.id.type === 'ObjectPattern') {
      const initializer = unwrapExpression(definition.node.init)

      return (
        initializer.type === 'Identifier' &&
        initializer.name === 'module' &&
        !isDeclaredLocally('module', declarationScope) &&
        definition.node.id.properties.some(
          (property) =>
            property.type === 'Property' &&
            property.value.type === 'Identifier' &&
            property.value.name === name &&
            staticPropertyKeyName(property) === 'require',
        )
      )
    }

    if (definition.node.id.type !== 'Identifier') {
      return false
    }

    return isRequireFunction(definition.node.init, declarationScope, context, seen)
  }

  const value = unwrapExpression(expression)

  if (value.type === 'CallExpression') {
    const identity = importIdentity(value.callee, scope, context, { namespaces: new Set<string>() })

    return (identity?.name === 'createRequire' &&
      (identity.module === 'module' || identity.module === 'node:module')) satisfies boolean
  }

  if (value.type === 'Identifier') {
    return isRequireBinding(value.name, scope) satisfies boolean
  }

  return (value.type === 'MemberExpression' &&
    staticPropertyName(value) === 'require' &&
    value.object.type === 'Identifier' &&
    value.object.name === 'module' &&
    !isDeclaredLocally(value.object.name, scope)) satisfies boolean
}

const moduleSourceVisitors = (
  context: RuleContext,
  report: (node: ESTree.Node, source: ESTree.Expression) => void,
) => ({
  CallExpression(node: ESTree.CallExpression) {
    const [argument] = node.arguments

    if (
      argument !== undefined &&
      argument.type !== 'SpreadElement' &&
      isRequireFunction(node.callee, context.sourceCode.getScope(node), context)
    ) {
      report(node, argument)
    }
  },
  ExportAllDeclaration(node: ESTree.ExportAllDeclaration) {
    report(node, node.source)
  },
  ExportNamedDeclaration(node: ESTree.ExportNamedDeclaration) {
    if (node.source !== null) {
      report(node, node.source)
    }
  },
  ImportDeclaration(node: ESTree.ImportDeclaration) {
    report(node, node.source)
  },
  ImportExpression(node: ESTree.ImportExpression) {
    report(node, node.source)
  },
  TSImportEqualsDeclaration(node: ESTree.TSImportEqualsDeclaration) {
    if (node.moduleReference.type === 'TSExternalModuleReference') {
      report(node, node.moduleReference.expression)
    }
  },
  TSImportType(node: ESTree.TSImportType) {
    report(node, node.source)
  },
})

const noCrossLayerImports = defineRule({
  create(context) {
    const filename = workspacePath(context.filename)
    const report = (node: ESTree.Node, source: ESTree.Expression) => {
      const specifier = isStringModule(source)
      const target = specifier === null ? null : normalizeWorkspacePath(filename, specifier)
      if (target !== null && isWithin(filename, 'registry') && isWithin(target, 'app'))
        context.report({ messageId: 'packageApp', node })
    }
    return moduleSourceVisitors(context, report)
  },
  meta: {
    docs: { description: 'Keep source libraries independent of the showcase application.' },
    messages: {
      packageApp:
        'Component libraries cannot import the showcase. Fix: keep shared code in its owning library, or pass the value from the app.',
    },
    type: 'problem',
  },
})

const noBrowserServerImports = defineRule({
  create(context) {
    const filename = workspacePath(context.filename)
    if (!isBrowserZone(filename)) return {}
    const report = (node: ESTree.Node, source: ESTree.Expression) => {
      const specifier = isStringModule(source)
      if (specifier !== null && browserServerModule(filename, specifier))
        context.report({ messageId: 'serverImport', node })
    }
    return moduleSourceVisitors(context, report)
  },
  meta: {
    docs: { description: 'Keep Node and server-only modules out of browser component sources.' },
    messages: {
      serverImport:
        'Browser components cannot import Node or server-only modules. These imports break browser builds or expose server code. Fix: move the server implementation outside the browser component source.',
    },
    type: 'problem',
  },
})

export default definePlugin({
  meta: { name: 'rat-stack-boundaries' },
  rules: {
    'no-browser-server-imports': noBrowserServerImports,
    'no-cross-layer-imports': noCrossLayerImports,
  },
})
