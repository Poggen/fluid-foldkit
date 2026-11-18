import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript-api'
import { families, itemName, manifest, outputRoot, root } from './config.ts'
import { compositionSources } from './reference-examples.ts'
import { closure, packageRoot, resolveSource } from './graph.ts'

export const buildReferences = () => {
  const entries = families.flatMap((family) =>
    Object.entries(manifest(family).exports)
      .filter(([entry, location]) => entry !== './styles.css' && /\.tsx?$/u.test(location))
      .map(([entry, location]) => ({
        family,
        entry,
        location,
        file: resolveSource(packageRoot(family), location),
      })),
  )
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), (file) =>
    ts.sys.readFile(file),
  )
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  const program = ts.createProgram(
    entries.map((entry) => entry.file),
    parsed.options,
  )
  const checker = program.getTypeChecker()
  for (const { family, entry, location, file } of entries) {
    const source = program.getSourceFile(file)
    const module = source === undefined ? undefined : checker.getSymbolAtLocation(source)
    if (source === undefined || module === undefined)
      throw new Error(`Missing public module: ${file}`)
    const contracts = checker.getExportsOfModule(module).flatMap((exported) => {
      const symbol =
        (exported.flags & ts.SymbolFlags.Alias) !== 0
          ? checker.getAliasedSymbol(exported)
          : exported
      const declaration = symbol.declarations?.find(
        (node) => ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node),
      )
      if (
        declaration === undefined ||
        /(?:Prepared|Resource|Context)/u.test(exported.name) ||
        !/(?:Props|Inputs|Options|Config|Settings|Variant|Size|Presentation|Context)$/u.test(
          exported.name,
        )
      )
        return []
      const type = checker.getDeclaredTypeOfSymbol(symbol)
      const structured: (value: ts.Type) => boolean = (value: ts.Type) =>
        value.isUnion()
          ? value.types.some(structured)
          : (value.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) !== 0
      return [
        {
          name: exported.name,
          props: (structured(type) ? checker.getPropertiesOfType(type) : []).map((property) => {
            const member = property.valueDeclaration ?? property.declarations?.[0] ?? declaration
            return {
              name: property.name,
              type: checker.typeToString(
                checker.getTypeOfSymbolAtLocation(property, member),
                member,
                ts.TypeFormatFlags.NoTruncation,
              ),
              defaultValue:
                property
                  .getJsDocTags(checker)
                  .find((tag) => tag.name === 'default' || tag.name === 'defaultValue')
                  ?.text?.map((part) => part.text)
                  .join('') ?? null,
              optional: (property.flags & ts.SymbolFlags.Optional) !== 0,
              description: ts.displayPartsToString(property.getDocumentationComment(checker)),
            }
          }),
        },
      ]
    })
    const graph = closure(family, location)
    const files = [...graph.files]
      .filter(([file]) => /\.(?:tsx?|css)$/u.test(file))
      .map(([file, content]) => ({ path: path.relative(packageRoot(family), file), content }))
    const directory = path.join(outputRoot, 'reference', family)
    mkdirSync(directory, { recursive: true })
    writeFileSync(
      path.join(directory, `${itemName(entry)}.json`),
      JSON.stringify({
        family,
        name: itemName(entry),
        entry: path.relative(packageRoot(family), file),
        contracts,
        files: [...files, ...compositionSources(family, itemName(entry))],
      }) + '\n',
    )
  }
  console.log(`${entries.length} native component source/API references generated`)
}
if (import.meta.main) buildReferences()
