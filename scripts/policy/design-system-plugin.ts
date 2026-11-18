import { definePlugin, defineRule } from '@oxlint/plugins'
import type { Context, ESTree } from '@oxlint/plugins'
import {
  bindingComponent,
  componentName,
  isBuilder,
  isStringModule,
  properties,
  resolveValue,
  staticPropertyKeyName,
  staticPropertyName,
  stringsIn,
} from './design-system-ast.ts'

import { importIdentity, isStableVariable, variableOf } from '../lint/import-identity.ts'

const classBuilderImports = {
  namespaces: new Set<string>(),
  runtimeImportsOnly: true,
  immutableAliasesOnly: true,
}

const isClassBuilder: (value: ESTree.Expression, context: Context) => boolean = (
  value: ESTree.Expression,
  context: Context,
) => {
  if (isBuilder(value, context)) return true
  const identity = importIdentity(
    value,
    context.sourceCode.getScope(value),
    context,
    classBuilderImports,
  )
  return identity?.module === 'foldkit/html' && identity.name === 'inertHtml'
}

const classCount: (
  value: ESTree.Expression,
  context: Context,
  seen?: Set<ESTree.Node>,
) => number = (value: ESTree.Expression, context: Context, seen = new Set<ESTree.Node>()) => {
  const node = resolveValue(value, context)
  if (seen.has(node)) return 0 satisfies number
  const path = new Set([...seen, node])
  const count = (expression: ESTree.Expression) => classCount(expression, context, path)
  const returns: (statement: ESTree.Node) => number = (statement: ESTree.Node) => {
    if (statement.type === 'ReturnStatement')
      return statement.argument === null ? 0 : count(statement.argument)
    if (statement.type === 'BlockStatement') return Math.max(0, ...statement.body.map(returns))
    if (statement.type === 'IfStatement')
      return Math.max(
        returns(statement.consequent),
        statement.alternate === null ? 0 : returns(statement.alternate),
      )
    return 0
  }
  switch (node.type) {
    case 'ArrayExpression':
      return node.elements.reduce(
        (total, item) =>
          total + (item === null ? 0 : count(item.type === 'SpreadElement' ? item.argument : item)),
        0,
      ) satisfies number
    case 'ConditionalExpression':
      return Math.max(count(node.consequent), count(node.alternate)) satisfies number
    case 'LogicalExpression':
      return (
        node.operator === '&&' ? count(node.right) : Math.max(count(node.left), count(node.right))
      ) satisfies number
    case 'CallExpression': {
      if (
        node.callee.type === 'MemberExpression' &&
        staticPropertyName(node.callee) === 'Class' &&
        isClassBuilder(node.callee.object, context)
      )
        return 1 satisfies number
      const callee = resolveValue(node.callee, context)
      const variable =
        callee.type === 'Identifier'
          ? variableOf(callee.name, context.sourceCode.getScope(callee))
          : undefined
      const definition = variable?.defs[0]
      const fn =
        variable !== undefined &&
        isStableVariable(variable) &&
        definition?.node.type === 'FunctionDeclaration'
          ? definition.node
          : callee
      if (
        fn.type !== 'FunctionDeclaration' &&
        fn.type !== 'FunctionExpression' &&
        fn.type !== 'ArrowFunctionExpression'
      )
        return 0 satisfies number
      if (fn.body === null || path.has(fn)) return 0 satisfies number
      path.add(fn)
      return (
        fn.body.type === 'BlockStatement' ? returns(fn.body) : count(fn.body)
      ) satisfies number
    }
    default:
      return 0 satisfies number
  }
}

const noShadowedClass = defineRule({
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      shadowed:
        'Foldkit Class replaces earlier Class attributes on this element. Merge the complete class recipe into one Class.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        const keyed =
          callee.type === 'CallExpression' &&
          callee.callee.type === 'MemberExpression' &&
          staticPropertyName(callee.callee) === 'keyed' &&
          isClassBuilder(callee.callee.object, context)
        const element =
          callee.type === 'MemberExpression' &&
          /^[a-z]/u.test(staticPropertyName(callee) ?? '') &&
          !['keyed', 'block', 'text'].includes(staticPropertyName(callee) ?? '') &&
          isClassBuilder(callee.object, context)
        if (!keyed && !element) return
        const attributes = node.arguments[keyed ? 1 : 0]
        if (
          attributes !== undefined &&
          attributes.type !== 'SpreadElement' &&
          classCount(attributes, context) > 1
        )
          context.report({ node: attributes, messageId: 'shadowed' })
      },
    }
  },
})

const controlForRole = new Map([
  ['tab', 'Tabs/TabsItem'],
  ['tablist', 'Tabs'],
  ['checkbox', 'Checkbox'],
  ['switch', 'Switch'],
  ['radio', 'RadioGroup'],
  ['radiogroup', 'RadioGroup'],
  ['combobox', 'Combobox'],
  ['listbox', 'Select/Listbox'],
  ['option', 'Select/Listbox'],
  ['menu', 'Dropdown/Menu'],
  ['menuitem', 'Dropdown/Menu'],
  ['menuitemcheckbox', 'Dropdown/Menu'],
  ['menuitemradio', 'Dropdown/Menu'],
  ['slider', 'Slider'],
])

const useComponents = defineRule({
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      control:
        'Use {{component}} and its checked composition instead of assigning {{attribute}}="{{value}}" to a hand-built control.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression' || !isBuilder(node.callee.object, context))
          return
        const method = staticPropertyName(node.callee)
        const first = node.arguments[0]
        const second = node.arguments[1]
        if (first === undefined || first.type === 'SpreadElement') return
        const attribute =
          method === 'Role' ? 'role' : method === 'Attribute' ? isStringModule(first) : null
        const value = method === 'Attribute' ? second : first
        if (value === undefined || value.type === 'SpreadElement') return
        for (const item of stringsIn(value, context)) {
          const component = attribute === 'role' ? controlForRole.get(item.text) : undefined
          if (component !== undefined)
            context.report({
              node: item.node,
              messageId: 'control',
              data: { component, attribute: attribute ?? '', value: item.text },
            })
        }
      },
    }
  },
})

const controls = new Set([
  'Button',
  'Badge',
  'Input',
  'Textarea',
  'Checkbox',
  'Switch',
  'Slider',
  'RadioGroup',
  'Tabs',
])
const ownedUtility =
  /^(?:p[trblxyse]?|h|min-h|max-h|size|bg|rounded(?:-[trblse]{1,2})?|shadow|border(?:-[trblxyse])?|ring(?:-offset)?|font|leading|tracking)(?:-|$)/u
const ownedProperty =
  /^(?:padding|height|min-height|max-height|background|border|border-radius|box-shadow|font|font-size|font-weight|line-height|letter-spacing|color)(?:-|$)/u

const baseClass = (token: string) => {
  let depth = 0
  let start = 0
  for (let index = 0; index < token.length; index++) {
    const character = token[index]
    if (character === '[' || character === '(') depth++
    else if (character === ']' || character === ')') depth--
    else if (character === ':' && depth === 0) start = index + 1
  }
  return token.slice(start).replace(/^!|!$/gu, '')
}

const restyling = (token: string) => {
  const base = baseClass(token)
  if (ownedUtility.test(base)) return true
  if (
    /^text-(?!left$|right$|center$|justify$|start$|end$|wrap$|nowrap$|balance$|pretty$)/u.test(base)
  )
    return true
  const property = /^\[([^:]+):/u.exec(base)?.[1]
  return property !== undefined && ownedProperty.test(property)
}

const noRestyle = defineRule({
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      restyle:
        '{{component}} owns "{{value}}". Use its variant, buttonSize/size, or presentation options; put surrounding layout on the parent.',
    },
  },
  create(context) {
    const report = (node: ESTree.Node, component: string, value: string) =>
      context.report({ node, messageId: 'restyle', data: { component, value } })
    const classes = (value: ESTree.Expression, component: string) => {
      for (const item of stringsIn(value, context)) {
        for (const token of item.text.split(/\s+/u).filter(Boolean)) {
          if (restyling(token)) report(item.node, component, token)
        }
      }
    }
    const attributes = (value: ESTree.Expression, component: string) => {
      const node = resolveValue(value, context)
      if (node.type !== 'ArrayExpression') return
      for (const item of node.elements) {
        if (item === null || item.type === 'SpreadElement') continue
        const attribute = resolveValue(item, context)
        if (
          attribute.type !== 'CallExpression' ||
          attribute.callee.type !== 'MemberExpression' ||
          !isBuilder(attribute.callee.object, context)
        )
          continue
        const method = staticPropertyName(attribute.callee)
        const first = attribute.arguments[0]
        const second = attribute.arguments[1]
        if (first === undefined || first.type === 'SpreadElement') continue
        if (method === 'Class') classes(first, component)
        if (
          method === 'Attribute' &&
          isStringModule(first) === 'class' &&
          second !== undefined &&
          second.type !== 'SpreadElement'
        )
          classes(second, component)
        if (method === 'Style') {
          for (const property of properties(first, context)) {
            const name = staticPropertyKeyName(property)
            if (
              name !== undefined &&
              ownedProperty.test(name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`))
            )
              report(property, component, name)
          }
        }
      }
    }
    const inspectProps = (value: ESTree.Expression, component: string) => {
      for (const property of properties(value, context)) {
        if (property.type !== 'Property' || property.method) continue
        const name = staticPropertyKeyName(property)
        if (name === 'className') classes(property.value, component)
        if (name === 'attributes') attributes(property.value, component)
      }
    }
    return {
      CallExpression(node) {
        const first = node.arguments[0]
        if (first === undefined || first.type === 'SpreadElement') return
        const direct = componentName(node.callee, context)
        if (direct !== null && controls.has(direct)) inspectProps(first, direct)
        if (
          node.callee.type !== 'MemberExpression' ||
          staticPropertyName(node.callee) !== 'embedView'
        )
          return
        const component = bindingComponent(node.callee.object, context)
        if (component === null || !controls.has(component)) return
        for (const property of properties(first, context)) {
          if (property.type === 'Property' && staticPropertyKeyName(property) === 'viewInputs')
            inspectProps(property.value, component)
        }
      },
    }
  },
})

export default definePlugin({
  meta: { name: 'foldkit-design' },
  rules: {
    'use-components': useComponents,
    'no-restyle': noRestyle,
    'no-shadowed-class': noShadowedClass,
  },
})
