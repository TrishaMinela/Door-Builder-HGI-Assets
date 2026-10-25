import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { approvedPrivacyGlassIds } from '../../src/data/privacyGlass'
import { doorConfigurationLabel } from '../../src/data/doorConfigurationRules'
import { doorStyleDisplayName } from '../../src/data/productDisplayNames'

/** Read private, committed inventory constants without modifying/runtime-importing App. */
export function appInventory() {
  const source = readFileSync('src/App.tsx', 'utf8')
  const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declarations = new Map<string, ts.Node>()
  for (const statement of ast.statements) {
    if (ts.isVariableStatement(statement)) for (const item of statement.declarationList.declarations) if (ts.isIdentifier(item.name)) declarations.set(item.name.text, item)
    if (ts.isFunctionDeclaration(statement) && statement.name) declarations.set(statement.name.text, statement)
  }
  const roots = [...declarations.keys()].filter(name => /^(gridLocations|gridStyles|lowEGridStyles|flatGridPatterns|allGridPatterns|internalGrid.*|f48Internal.*|sInternal.*|f48GridColor.*|sGridColor.*|contouredGridAssets|prairieGridAssets|gridColorValues|.*Rules|glassCategoryChoices|retroGlassCategory|clearGlassIds|legacy.*GlassIds|f48GlassOptionIds|glassCategory|privacyGlassIds|.*GRID_GLASS_ID|doorConfigurationOptions|sideliteStyleOptions|doorSwingOptions|grainThumbnails|signatureGrainChoices|doorCatalogModelName)$/.test(name))
  const selected = new Set<string>(), chunks: string[] = []
  function visit(name: string) {
    if (selected.has(name) || !declarations.has(name)) return
    selected.add(name)
    const node = declarations.get(name)!
    function walk(child: ts.Node) { if (ts.isIdentifier(child) && child.text !== name && declarations.has(child.text)) visit(child.text); ts.forEachChild(child, walk) }
    walk(node)
    chunks.push(ts.isVariableDeclaration(node) ? `const ${node.getText(ast)};` : node.getText(ast))
  }
  roots.forEach(visit)
  // Sets are supplemented after declaration in App; preserve those additions.
  for (const statement of ast.statements) if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)) {
    const call = statement.expression
    if (ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === 'add' && selected.has(call.expression.expression.getText(ast))) chunks.push(statement.getText(ast))
  }
  const js = ts.transpileModule(`${chunks.join('\n')}\nresult={${roots.join(',')}}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
  const context = vm.createContext({ approvedPrivacyGlassIds, doorConfigurationLabel, doorStyleDisplayName, result: null })
  vm.runInContext(js, context, { timeout: 2000 })
  return context.result as Record<string, any>
}

export function typeValues(name: string): string[] {
  const source = readFileSync('src/types.ts', 'utf8')
  const ast = ts.createSourceFile('types.ts', source, ts.ScriptTarget.Latest, true)
  const declaration = ast.statements.find(node => ts.isTypeAliasDeclaration(node) && node.name.text === name) as ts.TypeAliasDeclaration
  if (!declaration || !ts.isUnionTypeNode(declaration.type)) throw new Error(`Unsupported inventory domain ${name}`)
  return declaration.type.types.map(node => { if (!ts.isLiteralTypeNode(node) || !ts.isStringLiteral(node.literal)) throw new Error(`Non-string domain ${name}`); return node.literal.text })
}

export function jsonValue(value: any): any {
  if (typeof value === 'function') return undefined
  if (value?.constructor?.name === 'Set') return [...value].map(jsonValue)
  if (Array.isArray(value)) return value.map(jsonValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v !== 'function').map(([k, v]) => [k, jsonValue(v)]))
  return value
}
