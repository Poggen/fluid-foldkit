import { dirname, resolve } from 'node:path'
import ts from 'typescript-api'

export const descendants: (root: ts.Node) => ts.Node[] = (root: ts.Node) => {
  const nodes: ts.Node[] = []
  const visit = (node: ts.Node) => {
    nodes.push(node)
    ts.forEachChild(node, visit)
  }
  visit(root)
  return nodes
}
export const method = (node: ts.Node | undefined, name: string): node is ts.CallExpression =>
  node !== undefined &&
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  node.expression.name.text === name
export const constant = (node: ts.Node | undefined): node is ts.VariableDeclaration =>
  node !== undefined &&
  ts.isVariableDeclaration(node) &&
  ts.isIdentifier(node.name) &&
  ts.isVariableDeclarationList(node.parent) &&
  (node.parent.flags & ts.NodeFlags.Const) !== 0
export const moduleConstant = (node: ts.Node | undefined): node is ts.VariableDeclaration =>
  constant(node) &&
  ts.isVariableStatement(node.parent.parent) &&
  ts.isSourceFile(node.parent.parent.parent)
export const owner: (node: ts.Node) => ts.SignatureDeclaration | undefined = (node: ts.Node) => {
  let current: ts.Node | undefined = node.parent
  while (current !== undefined) {
    if (ts.isFunctionLike(current)) return current
    current = current.parent
  }
}
export const imports = (source: ts.SourceFile, module?: string) => {
  const found = new Map<string, { readonly name: string; readonly module: string }>()
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      (module !== undefined && statement.moduleSpecifier.text !== module)
    )
      continue
    const bindings = statement.importClause?.namedBindings
    if (
      bindings !== undefined &&
      ts.isNamedImports(bindings) &&
      !statement.importClause?.isTypeOnly
    )
      for (const item of bindings.elements)
        if (!item.isTypeOnly)
          found.set(item.name.text, {
            name: item.propertyName?.text ?? item.name.text,
            module: statement.moduleSpecifier.text,
          })
  }
  return found
}

type ResolvedDeclaration =
  | ts.VariableDeclaration
  | ts.FunctionDeclaration
  | ts.ImportSpecifier
  | ts.ParameterDeclaration

export const sourceResolver = (load: (file: string) => ts.SourceFile | undefined) => {
  const moduleSource = (from: ts.SourceFile, specifier: string) => {
    if (!specifier.startsWith('.')) return undefined
    const path = resolve(dirname(from.fileName), specifier.replace(/\.js$/, '.ts'))
    const candidates = path.endsWith('.ts') ? [path] : [`${path}.ts`, `${path}/index.ts`]
    for (const candidate of candidates) {
      const source = load(candidate)
      if (source !== undefined) return source
    }
  }
  const local: (source: ts.SourceFile, name: string) => ResolvedDeclaration | undefined = (
    source: ts.SourceFile,
    name: string,
  ) => {
    for (const statement of source.statements) {
      if (ts.isVariableStatement(statement)) {
        const declaration = statement.declarationList.declarations.find(
          (item) => ts.isIdentifier(item.name) && item.name.text === name,
        )
        if (declaration !== undefined) return declaration
      }
      if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return statement
      if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) continue
      const bindings = statement.importClause?.namedBindings
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        const item = bindings.elements.find((item) => !item.isTypeOnly && item.name.text === name)
        if (item !== undefined) return item
      }
    }
  }
  const transparent = (source: ts.SourceFile) =>
    source.statements.every(
      (statement) =>
        (ts.isImportDeclaration(statement) && statement.importClause !== undefined) ||
        (ts.isExportDeclaration(statement) &&
          statement.exportClause !== undefined &&
          ts.isNamedExports(statement.exportClause)) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isEmptyStatement(statement),
    )
  const exported: (
    source: ts.SourceFile,
    name: string,
    seen?: Set<string>,
  ) => ResolvedDeclaration | undefined = (
    source: ts.SourceFile,
    name: string,
    seen = new Set<string>(),
  ) => {
    const key = `${source.fileName}:${name}`
    if (seen.has(key)) return undefined satisfies ResolvedDeclaration | undefined
    seen.add(key)
    for (const statement of source.statements) {
      if (
        (ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement)) &&
        statement.modifiers?.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        const declaration = local(source, name)
        if (declaration === statement || declaration?.parent.parent === statement)
          return declaration satisfies ResolvedDeclaration | undefined
      }
      if (
        !ts.isExportDeclaration(statement) ||
        statement.isTypeOnly ||
        statement.exportClause === undefined ||
        !ts.isNamedExports(statement.exportClause)
      )
        continue
      const item = statement.exportClause.elements.find(
        (item) => !item.isTypeOnly && item.name.text === name,
      )
      if (item === undefined) continue
      if (!transparent(source)) return undefined satisfies ResolvedDeclaration | undefined
      const original = item.propertyName?.text ?? item.name.text
      if (statement.moduleSpecifier === undefined)
        return resolveLocal(source, original, seen) satisfies ResolvedDeclaration | undefined
      if (!ts.isStringLiteral(statement.moduleSpecifier))
        return undefined satisfies ResolvedDeclaration | undefined
      const target = moduleSource(source, statement.moduleSpecifier.text)
      return (target === undefined ? undefined : exported(target, original, seen)) satisfies
        | ResolvedDeclaration
        | undefined
    }
  }
  const resolveLocal: (
    source: ts.SourceFile,
    name: string,
    seen?: Set<string>,
  ) => ResolvedDeclaration | undefined = (
    source: ts.SourceFile,
    name: string,
    seen = new Set<string>(),
  ) => {
    const declaration = local(source, name)
    if (declaration === undefined || !ts.isImportSpecifier(declaration))
      return declaration satisfies ResolvedDeclaration | undefined
    const imported = imports(source).get(name)
    if (imported === undefined) return undefined satisfies ResolvedDeclaration | undefined
    const target = moduleSource(source, imported.module)
    return (target === undefined ? declaration : exported(target, imported.name, seen)) satisfies
      | ResolvedDeclaration
      | undefined
  }
  const imported = (source: ts.SourceFile, name: string) => {
    const declaration = resolveLocal(source, name)
    return declaration === undefined || ts.isImportSpecifier(declaration)
      ? undefined
      : { source: declaration.getSourceFile(), name: declaration.name?.getText() }
  }
  const binding: (identifier: ts.Identifier) => ResolvedDeclaration | undefined = (
    identifier: ts.Identifier,
  ) => {
    for (
      let scope: ts.Node | undefined = identifier.parent;
      scope !== undefined;
      scope = scope.parent
    ) {
      if (ts.isFunctionLike(scope)) {
        const parameter = scope.parameters.find((item) => item.name.getText() === identifier.text)
        if (parameter !== undefined) return parameter
      }
      if (!(ts.isBlock(scope) || ts.isSourceFile(scope))) continue
      for (const statement of scope.statements) {
        if (ts.isVariableStatement(statement)) {
          const declaration = statement.declarationList.declarations.find(
            (item) => item.name.getText() === identifier.text,
          )
          if (declaration !== undefined) return declaration
        }
        if (ts.isFunctionDeclaration(statement) && statement.name?.text === identifier.text)
          return statement
      }
    }
    return resolveLocal(identifier.getSourceFile(), identifier.text)
  }
  const sdkMember = (
    node: ts.Node | undefined,
    member: string,
    namespace: string,
    module: string,
  ): node is ts.CallExpression => {
    if (
      !method(node, member) ||
      !ts.isPropertyAccessExpression(node.expression) ||
      !ts.isIdentifier(node.expression.expression)
    )
      return false
    const identifier = node.expression.expression
    const declaration = binding(identifier)
    const imported = imports(identifier.getSourceFile(), module).get(identifier.text)
    return (
      declaration !== undefined && ts.isImportSpecifier(declaration) && imported?.name === namespace
    )
  }
  const checkedBlock = (identifier: ts.Identifier) => {
    const declaration = binding(identifier)
    return (
      moduleConstant(declaration) && sdkMember(declaration.initializer, 'make', 'Block', 'foldkit')
    )
  }
  const exportedNames = (source: ts.SourceFile) =>
    source.statements.flatMap((statement) => {
      if (
        ts.isExportDeclaration(statement) &&
        !statement.isTypeOnly &&
        statement.exportClause !== undefined &&
        ts.isNamedExports(statement.exportClause)
      )
        return statement.exportClause.elements
          .filter((item) => !item.isTypeOnly)
          .map((item) => item.name.text)
      if (
        !(ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement)) ||
        !statement.modifiers?.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)
      )
        return []
      if (ts.isFunctionDeclaration(statement))
        return statement.name === undefined ? [] : [statement.name.text]
      return statement.declarationList.declarations.flatMap((item) =>
        ts.isIdentifier(item.name) ? [item.name.text] : [],
      )
    })
  return {
    moduleSource,
    imported,
    exported,
    exportedNames,
    transparent,
    binding,
    sdkMember,
    checkedBlock,
  }
}

export type SourceResolver = ReturnType<typeof sourceResolver>

export const suspendedView = (node: ts.Node, resolver: SourceResolver) => {
  if (!resolver.sdkMember(node, 'suspend', 'Layer', 'effect') || node.arguments.length !== 1)
    return undefined
  const construction = node.arguments[0]
  if (
    construction === undefined ||
    !(ts.isArrowFunction(construction) || ts.isFunctionExpression(construction)) ||
    construction.parameters.length !== 0
  )
    return undefined
  let outer: ts.Node = node
  while (
    ts.isPropertyAccessExpression(outer.parent) &&
    outer.parent.expression === outer &&
    outer.parent.name.text === 'pipe'
  ) {
    const pipe = outer.parent.parent
    if (
      !ts.isCallExpression(pipe) ||
      !pipe.arguments.every(
        (arg) =>
          resolver.sdkMember(arg, 'provide', 'Layer', 'effect') ||
          resolver.sdkMember(arg, 'provideMerge', 'Layer', 'effect'),
      )
    )
      return undefined
    outer = pipe
  }
  if (!moduleConstant(outer.parent) || outer.parent.initializer !== outer) return undefined
  const body = construction.body
  const statement =
    ts.isBlock(body) && body.statements.length === 1 ? body.statements[0] : undefined
  const returned = ts.isBlock(body)
    ? statement !== undefined && ts.isReturnStatement(statement)
      ? statement.expression
      : undefined
    : body
  if (
    !method(returned, 'makeLayer') ||
    !ts.isPropertyAccessExpression(returned.expression) ||
    !ts.isIdentifier(returned.expression.expression) ||
    !resolver.checkedBlock(returned.expression.expression) ||
    returned.arguments.length !== 1
  )
    return undefined
  const fields: (
    expression: ts.Expression | undefined,
    seen?: Set<ts.Node>,
  ) => Map<string, ts.Expression> | undefined = (
    expression: ts.Expression | undefined,
    seen = new Set<ts.Node>(),
  ) => {
    if (expression === undefined || seen.has(expression))
      return undefined satisfies Map<string, ts.Expression> | undefined
    seen.add(expression)
    if (ts.isIdentifier(expression)) {
      const declaration = resolver.binding(expression)
      return (
        moduleConstant(declaration) ? fields(declaration.initializer, seen) : undefined
      ) satisfies Map<string, ts.Expression> | undefined
    }
    if (!ts.isObjectLiteralExpression(expression))
      return undefined satisfies Map<string, ts.Expression> | undefined
    const result = new Map<string, ts.Expression>()
    for (const property of expression.properties) {
      if (ts.isSpreadAssignment(property)) {
        const spread = fields(property.expression, new Set(seen))
        if (spread === undefined) return undefined satisfies Map<string, ts.Expression> | undefined
        for (const [name, value] of spread) result.set(name, value)
      } else if (
        ts.isPropertyAssignment(property) &&
        (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
      ) {
        result.set(property.name.text, property.initializer)
      } else if (ts.isShorthandPropertyAssignment(property)) {
        result.set(property.name.text, property.name)
      } else return undefined satisfies Map<string, ts.Expression> | undefined
    }
    return result satisfies Map<string, ts.Expression> | undefined
  }
  const record = fields(returned.arguments[0])
  if (
    record === undefined ||
    !record.has('init') ||
    !record.has('update') ||
    ['children', 'bindings', 'operations'].some((name) => record.has(name))
  )
    return undefined
  const view = record.get('view')
  return view === undefined ? undefined : { construction, view }
}

export const unprovenConstructionConsumer = (
  source: ts.SourceFile,
  applicationSources: readonly ts.SourceFile[],
  factoryNames: ReadonlySet<string | undefined>,
  allowedConsumers: ReadonlySet<string>,
  read: (file: string) => string | undefined,
) => {
  const file = source.fileName
  const candidates = new Map(applicationSources.map((source) => [source.fileName, source]))
  candidates.set(file, source)
  const consumerResolver = sourceResolver((path) => {
    const existing = candidates.get(path)
    if (existing !== undefined) return existing
    const content = read(path)
    if (content === undefined) return undefined
    const loaded = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true)
    candidates.set(path, loaded)
    return loaded
  })
  const isFactory = (declaration: ts.Declaration | undefined) =>
    declaration !== undefined &&
    ts.isVariableDeclaration(declaration) &&
    declaration.getSourceFile().fileName === file &&
    factoryNames.has(declaration.name.getText())
  for (const candidate of applicationSources) {
    for (const statement of candidate.statements) {
      if (
        !(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) ||
        statement.moduleSpecifier === undefined ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue
      const target = consumerResolver.moduleSource(candidate, statement.moduleSpecifier.text)
      if (target === undefined) continue
      const bindings = ts.isImportDeclaration(statement)
        ? statement.importClause?.namedBindings
        : statement.exportClause
      const named =
        bindings !== undefined && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings))
      const consumesFactory = named
        ? bindings.elements.some(
            (item) =>
              !item.isTypeOnly &&
              isFactory(
                consumerResolver.exported(target, item.propertyName?.text ?? item.name.text),
              ),
          )
        : target.fileName === file ||
          consumerResolver
            .exportedNames(target)
            .some((name) => isFactory(consumerResolver.exported(target, name)))
      if (
        consumesFactory &&
        (!named ||
          !allowedConsumers.has(candidate.fileName) ||
          (ts.isExportDeclaration(statement) && !consumerResolver.transparent(candidate)))
      )
        return candidate.fileName
    }
  }
}
