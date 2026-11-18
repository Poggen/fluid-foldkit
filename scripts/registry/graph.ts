import { readFileSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript-api'
import type { Family } from './config.ts'
import { root, frameworkPackages, manifest, isolatedDependencies } from './config.ts'

export const packageRoot = (family: Family) => path.join(root, 'registry', family)
export const resolveSource = (directory: string, specifier: string) => {
  const file = path.resolve(directory, specifier)
  const candidates = file.endsWith('.js')
    ? [file.slice(0, -3) + '.ts', file.slice(0, -3) + '.tsx', file]
    : [file, `${file}.ts`, `${file}.tsx`, path.join(file, 'index.ts')]
  const found = candidates.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  )
  if (!found) throw new Error(`Unresolved source import: ${directory} -> ${specifier}`)
  return found
}

export const moduleReferences = (file: string, text: string) => {
  const references: { value: string; start: number; end: number }[] = []
  if (file.endsWith('.css')) {
    for (const match of text.matchAll(/@import\s*['"]([^'"]+)['"]/gu)) {
      if (match[1]) references.push({ value: match[1], start: 0, end: 0 })
    }
    return references
  }
  if (!/\.[cm]?tsx?$/u.test(file)) return references
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const add = (node: ts.StringLiteralLike) =>
    references.push({ value: node.text, start: node.getStart(source) + 1, end: node.end - 1 })
  const visit: (node: ts.Node) => void = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    )
      add(node.moduleSpecifier)
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0]
      if (argument && ts.isStringLiteralLike(argument)) add(argument)
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    )
      add(node.argument.literal)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return references
}

export const closure = (family: Family, entry: string) => {
  const directory = packageRoot(family)
  const files = new Map<string, string>()
  const external = new Set<string>()
  const pending = [resolveSource(directory, entry)]
  while (pending.length) {
    const file = pending.pop()
    if (!file || files.has(file)) continue
    if (!file.startsWith(directory + path.sep))
      throw new Error(`Registry import escapes ${family}: ${file}`)
    const content = readFileSync(file, 'utf8')
    files.set(file, content)
    for (const reference of moduleReferences(file, content)) {
      if (reference.value.startsWith('.'))
        pending.push(resolveSource(path.dirname(file), reference.value))
      else external.add(reference.value)
    }
  }
  return { files, external }
}

const packageName = (specifier: string) =>
  specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : (specifier.split('/')[0] ?? specifier)
export const dependencies = (family: Family, specifiers: ReadonlySet<string>) => {
  const source = manifest(family)
  const result = new Set<string>()
  for (const specifier of specifiers) {
    const name = packageName(specifier)
    if (frameworkPackages.has(name) || name === 'tailwindcss') continue
    if (isolatedDependencies.has(name)) {
      result.add(`${name}-${family}@npm:${name}@${source.dependencies[name]}`)
      continue
    }
    const version = source.dependencies[name] ?? source.dependencies[`@types/${name}`]
    if (!version) throw new Error(`Undeclared registry dependency: ${family}: ${name}`)
    result.add(`${source.dependencies[name] ? name : `@types/${name}`}@${version}`)
    const types =
      source.dependencies[`@types/${name}`] ?? source.devDependencies?.[`@types/${name}`]
    if (types) result.add(`@types/${name}@${types}`)
  }
  return [...result].sort()
}

export const installedPath = (family: Family, file: string) => {
  const relative = path.relative(packageRoot(family), file)
  return `@ui/${family}/${relative.startsWith('src/') ? relative.slice(4) : relative}`
}

export const installedContent = (family: Family, file: string, text: string) => {
  let result = text
  for (const reference of moduleReferences(file, text).sort((a, b) => b.start - a.start)) {
    const name = packageName(reference.value)
    if (isolatedDependencies.has(name)) {
      const replacement = reference.value.replace(name, `${name}-${family}`)
      result = result.slice(0, reference.start) + replacement + result.slice(reference.end)
    }
  }
  return result
}
