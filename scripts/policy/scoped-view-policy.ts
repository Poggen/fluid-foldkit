import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript-api'
import {
  constant,
  descendants,
  imports,
  method,
  moduleConstant,
  owner,
  sourceResolver,
  suspendedView,
  unprovenConstructionConsumer,
} from './scoped-view-resolution.ts'

type Enrollment = { readonly file: string; readonly consumers?: readonly string[] }
const fluid = 'app/src/gallery/fluid/'
const chartFiles = ['cartesian', 'polar', 'flows', 'companions'].map(
  (name) => `app/src/gallery/${name}.ts`,
)
const enrolled: readonly Enrollment[] = [
  { file: 'registry/fluid/src/color-picker.ts' },
  { file: 'registry/fluid/src/color-picker-format-menu.ts' },
  { file: 'app/src/fonts/preference.ts' },
  {
    file: 'app/src/application-view.ts',
    consumers: ['app/src/application.ts'],
  },
  {
    file: 'app/src/preferences-view.ts',
    consumers: ['app/src/preferences.ts'],
  },
  { file: 'app/src/gallery/block.ts' },
  {
    file: 'app/src/reference/view.ts',
    consumers: ['app/src/reference/layer.ts'],
  },
  { file: 'app/src/reference/authored-charts.ts' },
  { file: 'app/src/reference/authored-choices.ts' },
  { file: 'app/src/reference/authored-chart-variants.ts' },
  ...chartFiles.map((file) => ({ file })),
  ...[
    'core-view',
    'details-view',
    'interactive-ordinary-view',
    'interactive-view',
    'dates-view',
  ].map((name) => ({
    file: `${fluid}${name}.ts`,
    consumers: [`${fluid}composition.ts`, `${fluid}index.ts`],
  })),
  ...[
    'ask-user-questions-playground-view',
    'banner-playground-view',
    'calendar-playground-view',
    'card-playground-view',
    'combobox-playground-view',
    'command-menu-playground-view',
    'configured-view',
    'date-picker-playground-view',
    'dropdown-playground-view',
    'input-message-playground-view',
    'simple-content-view',
    'simple-input-view',
    'simple-pure-view',
    'simple-state-view',
    'simple-tooltip-view',
  ].map((name) => ({
    file: `${fluid}${name}.ts`,
    consumers: [`${fluid}configured-view.ts`, `${fluid}composition.ts`, `${fluid}index.ts`],
  })),
  {
    file: `${fluid}blocks/configured-sidebar/view/view.ts`,
    consumers: [
      `${fluid}blocks/configured-sidebar/view/index.ts`,
      `${fluid}blocks/configured-sidebar/composition.ts`,
      `${fluid}blocks/configured-sidebar/layer.ts`,
    ],
  },
  {
    file: 'app/src/gallery/card.ts',
    consumers: [`${fluid}composition.ts`, `${fluid}index.ts`, ...chartFiles],
  },
]

const lazyCreations = (source: ts.SourceFile) => {
  const imported = imports(source, 'foldkit/html')
  return descendants(source).filter(
    (node): node is ts.CallExpression =>
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ['createLazy', 'createKeyedLazy'].includes(imported.get(node.expression.text)?.name ?? ''),
  )
}
const isReference = (node: ts.Node, name: string, declaration?: ts.Node): node is ts.Identifier =>
  ts.isIdentifier(node) &&
  node.text === name &&
  node !== declaration &&
  !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) &&
  !(ts.isQualifiedName(node.parent) && node.parent.right === node) &&
  !ts.isImportSpecifier(node.parent) &&
  !ts.isExportSpecifier(node.parent) &&
  !(ts.isPropertyAssignment(node.parent) && node.parent.name === node)
const inLoop = (node: ts.Node, boundary: ts.Node) => {
  for (let current = node.parent; current !== boundary; current = current.parent) {
    if (
      ts.isForStatement(current) ||
      ts.isForOfStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isWhileStatement(current) ||
      ts.isDoStatement(current)
    )
      return true
  }
  return false
}
type Options = {
  readonly file?: string
  readonly consumerFile?: string
  readonly sources?: Readonly<Record<string, string>>
  readonly readSource?: (file: string) => string | undefined
}
type Factory = {
  readonly declaration: ts.VariableDeclaration
  readonly body: ts.Block
  readonly fn: ts.ArrowFunction | ts.FunctionExpression
  readonly effect: boolean
}
const factoryOf = (node: ts.Node | undefined): Factory | undefined => {
  if (
    node === undefined ||
    !(ts.isArrowFunction(node) || ts.isFunctionExpression(node)) ||
    !ts.isBlock(node.body)
  )
    return undefined
  const direct = moduleConstant(node.parent) ? node.parent : undefined
  const effect =
    method(node.parent, 'sync') && moduleConstant(node.parent.parent)
      ? node.parent.parent
      : undefined
  const declaration = direct ?? effect
  return declaration === undefined
    ? undefined
    : {
        declaration,
        body: node.body,
        fn: node,
        effect: effect !== undefined,
      }
}
const checkedView = (node: ts.Node | undefined) =>
  method(node, 'makeView') ||
  (method(node, 'withInputs') &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isPropertyAccessExpression(node.expression.expression) &&
    node.expression.expression.name.text === 'makeView')

export const inspectScopedViews = (
  text: string,
  consumerText = text,
  options: Options = {},
): readonly string[] => {
  const files = new Map<string, ts.SourceFile>()
  const add = (file: string, content: string) => {
    const key = resolve(file)
    const source = ts.createSourceFile(key, content, ts.ScriptTarget.Latest, true)
    files.set(key, source)
    return source
  }
  const source = add(options.file ?? 'view.ts', text)
  if (consumerText !== text) add(options.consumerFile ?? 'layer.ts', consumerText)
  for (const [file, content] of Object.entries(options.sources ?? {})) add(file, content)
  // Only explicit construction consumers may prove a factory's lifetime.
  const constructionSources = [...files.values()]
  const load = (file: string): ts.SourceFile | undefined => {
    const key = resolve(file)
    const existing = files.get(key)
    if (existing !== undefined) return existing
    const content = options.readSource?.(key)
    return content === undefined ? undefined : add(key, content)
  }
  const resolver = sourceResolver(load)
  const resolveImport = resolver.imported
  const errors: string[] = []
  const constructions = new Set<ts.SignatureDeclaration>()
  const ordinaryViews = new Map<ts.SignatureDeclaration, ts.Expression>()
  for (const file of constructionSources) {
    const nodes = descendants(file)
    for (const node of nodes) {
      const suspended = suspendedView(node, resolver)
      if (suspended === undefined) continue
      constructions.add(suspended.construction)
      ordinaryViews.set(suspended.construction, suspended.view)
    }
    for (const plans of nodes.filter(
      (node) => moduleConstant(node) && node.name.getText() === 'plans',
    )) {
      if (!ts.isVariableDeclaration(plans) || !method(plans.initializer, 'gen')) continue
      const construction = plans.initializer.arguments[0]
      if (construction === undefined || !ts.isFunctionExpression(construction)) continue
      constructions.add(construction)
      if (
        !nodes.some(
          (node) =>
            method(node, 'acquireChildren') &&
            ts.isYieldExpression(node.parent) &&
            node.parent.asteriskToken !== undefined &&
            owner(node) === construction,
        )
      )
        errors.push('Layer construction must acquire checked Composition children')
      if (
        !nodes.some(
          (node) =>
            method(node, 'makeLayer') &&
            node.arguments.some((arg) => ts.isIdentifier(arg) && arg.text === 'plans'),
        )
      )
        errors.push('Block.makeLayer must consume the constructed plans')
    }
  }
  if (constructions.size === 0)
    return [
      'Implementation requires consumed Effect.gen plans or checked Layer.suspend record construction',
    ]
  const proven = new Set<ts.VariableDeclaration>()
  const proving = new Set<ts.VariableDeclaration>()
  const proveFactory = (factory: Factory): boolean => {
    if (proven.has(factory.declaration)) return true
    if (proving.has(factory.declaration)) return false
    proving.add(factory.declaration)
    const returns = factory.body.statements.filter(ts.isReturnStatement)
    const result = returns[0]?.expression
    if (
      returns.length !== 1 ||
      result === undefined ||
      !(checkedView(result) || ts.isArrowFunction(result) || ts.isFunctionExpression(result))
    ) {
      errors.push('Factory must return one checked Composition view or render helper')
      return false
    }
    const name = factory.declaration.name.getText()
    const definingSource = factory.declaration.getSourceFile()
    const uses: ts.Identifier[] = []
    for (const file of constructionSources) {
      const localNames = file === definingSource ? [name] : []
      for (const alias of imports(file).keys()) {
        const imported = resolveImport(file, alias)
        if (imported?.source.fileName === definingSource.fileName && imported.name === name)
          localNames.push(alias)
      }
      for (const localName of localNames)
        uses.push(
          ...descendants(file).filter((node): node is ts.Identifier =>
            isReference(node, localName, factory.declaration.name),
          ),
        )
    }
    let valid = uses.length > 0
    const owners = new Set<ts.SignatureDeclaration>()
    for (const use of uses) {
      const useOwner = owner(use)
      const directCall = ts.isCallExpression(use.parent) && use.parent.expression === use
      const yielded = ts.isYieldExpression(use.parent) && use.parent.asteriskToken !== undefined
      if (
        useOwner === undefined ||
        owners.has(useOwner) ||
        inLoop(use, useOwner) ||
        (factory.effect ? !yielded : !directCall)
      ) {
        valid = false
        continue
      }
      owners.add(useOwner)
      const ordinaryView = ordinaryViews.get(useOwner)
      if (ordinaryView !== undefined && use.parent !== ordinaryView) {
        errors.push('Ordinary construction must consume the factory as its final view')
        valid = false
      }
      if (constructions.has(useOwner) && !checkedView(result)) {
        errors.push('Construction entry must return one checked Composition view')
        valid = false
      }
      if (!constructions.has(useOwner)) {
        const parent = factoryOf(useOwner)
        if (parent === undefined || !proveFactory(parent)) valid = false
      }
    }
    if (!valid)
      errors.push(
        factory.effect
          ? 'Effect view producer must be yielded once during plans construction'
          : 'View factory must be called exactly once during plans construction or a proven construction helper',
      )
    proving.delete(factory.declaration)
    if (valid) proven.add(factory.declaration)
    return valid
  }
  const stableView = (identifier: ts.Identifier, factory: Factory): boolean => {
    const name = identifier.text
    const from = identifier.getSourceFile()
    for (
      let scope: ts.Node | undefined = identifier.parent;
      scope !== undefined;
      scope = scope.parent
    ) {
      if (
        ts.isFunctionLike(scope) &&
        scope.parameters.some((parameter) => parameter.name.getText() === name)
      )
        return false
      if (!(ts.isBlock(scope) || ts.isSourceFile(scope))) continue
      for (const statement of scope.statements) {
        if (ts.isFunctionDeclaration(statement) && statement.name?.text === name)
          return ts.isSourceFile(scope) || scope === factory.body
        if (!ts.isVariableStatement(statement)) continue
        const declaration = statement.declarationList.declarations.find(
          (item) => item.name.getText() === name,
        )
        if (declaration !== undefined)
          return (
            constant(declaration) &&
            (ts.isSourceFile(scope) || scope === factory.body) &&
            declaration.initializer !== undefined &&
            (ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer))
          )
      }
    }
    const imported = resolveImport(from, name)
    if (imported === undefined) return false
    return imported.source.statements.some((node) => {
      if (
        !(ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) ||
        !node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      )
        return false
      if (ts.isFunctionDeclaration(node)) return node.name?.text === imported.name
      return (
        ts.isVariableStatement(node) &&
        node.declarationList.declarations.some(
          (declaration) =>
            moduleConstant(declaration) &&
            declaration.name.getText() === imported.name &&
            declaration.initializer !== undefined &&
            (ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer)),
        )
      )
    })
  }
  const creations = lazyCreations(source)
  if (creations.length === 0) errors.push('Scoped override requires scoped lazy constructors')
  for (const creation of creations) {
    const slot = creation.parent
    if (!constant(slot) || slot.initializer !== creation || !ts.isIdentifier(slot.name)) {
      errors.push('Lazy slot must initialize a direct const')
      continue
    }
    const body = slot.parent.parent.parent
    const factory = ts.isBlock(body) ? factoryOf(body.parent) : undefined
    if (factory === undefined) {
      errors.push('Lazy factory must be a module const or Effect.sync producer')
      continue
    }
    proveFactory(factory)
    for (const reference of descendants(source).filter((node): node is ts.Identifier =>
      isReference(node, slot.name.getText(), slot.name),
    )) {
      if (!ts.isCallExpression(reference.parent) || reference.parent.expression !== reference) {
        errors.push('Lazy slot cannot escape or be shadowed')
        continue
      }
      if (owner(reference) === factory.fn)
        errors.push('Lazy slot must run inside the returned render helper')
      const index =
        ts.isIdentifier(creation.expression) &&
        imports(source, 'foldkit/html').get(creation.expression.text)?.name === 'createKeyedLazy'
          ? 1
          : 0
      const expression = reference.parent.arguments[index]
      const argument =
        expression !== undefined && ts.isExpressionWithTypeArguments(expression)
          ? expression.expression
          : expression
      if (argument === undefined || !ts.isIdentifier(argument)) {
        errors.push('Lazy call requires a stable named view')
        continue
      }
      if (!stableView(argument, factory))
        errors.push('Lazy view function must be stable in module or construction scope')
    }
  }
  return [...new Set(errors)]
}

// The pinned preview's module-only rule cannot recognize once-per-Layer construction.
// Grant an override only after proving the explicit factory chain and renderer identities.
export const checkedScopedViewOverrides = () => {
  const root = resolve(import.meta.dirname, '../..')
  const read = (file: string) => {
    try {
      return readFileSync(file, 'utf8')
    } catch {
      return undefined
    }
  }
  const appRoot = resolve(root, 'app/src')
  const applicationSources = readdirSync(appRoot, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => {
      const path = resolve(appRoot, file)
      return ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
    })
  return enrolled.flatMap((record) => {
    const file = resolve(root, record.file)
    const text = read(file)
    if (text === undefined) throw new Error(`Missing enrolled view: ${record.file}`)
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    const creations = lazyCreations(source)
    if (creations.length === 0) return []
    const factoryNames = new Set(
      creations.map((creation) => factoryOf(owner(creation))?.declaration.name.getText()),
    )
    const allowedConsumers = new Set([
      file,
      ...(record.consumers ?? []).map((consumer) => resolve(root, consumer)),
    ])
    const unproven = unprovenConstructionConsumer(
      source,
      applicationSources,
      factoryNames,
      allowedConsumers,
      read,
    )
    if (unproven !== undefined)
      throw new Error(`${record.file}: Unproven construction consumer ${unproven}`)
    const sources = Object.fromEntries(
      (record.consumers ?? []).map((consumer) => {
        const path = resolve(root, consumer)
        const content = read(path)
        if (content === undefined) throw new Error(`Missing construction consumer: ${consumer}`)
        return [path, content]
      }),
    )
    const failures = inspectScopedViews(text, text, { file, sources, readSource: read })
    if (failures.length) throw new Error(`${record.file}: ${failures.join('; ')}`)
    return [
      { files: [record.file], rules: { 'foldkit/lazy-view-stable-references': 'off' } as const },
    ]
  })
}
