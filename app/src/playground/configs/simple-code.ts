import { filesFor } from './chat-message'
import { Match } from 'effect'
import type { FluidConfiguration } from '../configuration'

const q = (value: unknown) => JSON.stringify(value, null, 2)
const bind = (name: string, owner: string, field: string, args: string) =>
  `const ${name} = Page.makeRequiredFieldBinding(${owner}, {
  field: '${field}', init: { contextToArgs: () => [${args}] },
})`
const view = (name: string, field: string, inputs: string) =>
  `h.block(${name}.embedView({ slotId: '${field}', model: model.${field}, viewInputs: {
  context, ${inputs}
} }))`
const labels = (text: string, count: number, fallback: string) =>
  Array.from(
    { length: count },
    (_, index) => text.split(',')[index]?.trim() || `${fallback} ${index + 1}`,
  )
const contextCode = (c: FluidConfiguration) => {
  const size = 'size' in c && c.size !== 'site' ? c.size : c.appearance.size
  return `import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
const context = createPresentationContext(${q({ ...c.appearance, ...(size === undefined ? {} : { size }) }).replace(/"hover":/gu, '"hoverMode":')})\n`
}
const inputCode = (c: Extract<FluidConfiguration, { readonly _tag: 'input' | 'textarea' }>) => {
  const name = c._tag === 'input' ? 'Input' : 'Textarea'
  return `import { ${name}Block } from '@foldkit-visuals/fluid/${c._tag}'
import { childAttributes } from 'foldkit/html'
${bind(name, `${name}Block`, c._tag, q({ id: 'example', value: c.value, disabled: c.disabled, readOnly: c.readOnly }))}
${view(name, c._tag, `name: ${q(c.name)}, placeholder: ${q(c.placeholder)}, invalid: ${c.invalid}, ${c._tag === 'input' ? `type: ${q(c.type)}, attributes: ${c.required ? "childAttributes([h.Attribute('required', '')])" : '[]'},` : ''}`)}`
}
const tooltipCode = (c: Extract<FluidConfiguration, { readonly _tag: 'tooltip' }>) => {
  const keys = c.presentation === 'morph' ? ['basic', 'neighbor', 'third'] : ['basic']
  return `import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { Button } from '@foldkit-visuals/fluid/button'
import { childAttributes } from 'foldkit/html'
${bind('Tooltips', 'DocumentTooltipBlock', 'tooltips', '')}.withOutMessagePolicy({
  fold: Page.makeOutMessageFold(DocumentTooltipBlock, { Transaction: () => Page.makeNoopStep() }),
})
const Composition = Page.makeComposition({ bindings: [Tooltips] })
const keys = ${q(keys)}
const labels = ${q([c.label, 'A longer detail on the next item', 'One more detail'])}
const triggers = ${q([c.triggerLabel, 'Next', 'Last'])}
const addTooltips = keys.map(key => Tooltips.requestAdd({ key, groupKey: 'example-tooltips', group: { presentation: ${q(c.presentation)} }, options: ${q({ hoverable: c.hoverable, side: c.side, sideOffset: c.sideOffset, delayDuration: c.delayDuration, ...(c.followCursor === 'none' ? {} : { followCursor: c.followCursor }) })} }))
h.block(Tooltips.embedView({ slotId: 'tooltips', model: model.tooltips, viewInputs: {
  renderTrigger: (key, attributes) => Button({ context, variant: 'secondary', children: [triggers[keys.indexOf(key)] ?? ''], render: (attrs, children) => attributes.button(attrs.flatMap(attr => '__childAttribute' in attr ? [attr] : childAttributes([attr])), children) }, h),
  renderDocument: (content, popups) => h.div([], [content, ...popups]),
  render: ({ tooltip }) => h.div([h.Class('flex items-center gap-2')], keys.map(key => tooltip(key, { content: labels[keys.indexOf(key)] ?? '', shortcut: ${q(c.shortcut)}, shapeClass: ${q(c.appearance.shape === 'sharp' ? 'rounded-none' : 'rounded-lg')}, animate, reducedMotion: 'user' }))),
} }))`
}

export const simpleCode: (c: FluidConfiguration) => string | undefined = (
  c: FluidConfiguration,
) => {
  const code = Match.value(c).pipe(
    Match.tags({
      input: (c) => {
        return inputCode(c)
      },
      textarea: (c) => {
        return inputCode(c)
      },
      button: (c) => {
        return `import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
Button({ context, variant: ${q(c.variant)}, buttonSize: ${q(c.iconOnly ? (c.buttonSize === 'compact' ? 'icon-compact' : 'icon') : c.buttonSize)}, loading: ${c.loading}, active: ${c.active}, disabled: ${c.disabled},
  ${c.leadingIcon ? 'leadingIcon: defaultIcons.plus,' : ''} ${c.trailingIcon ? "trailingIcon: defaultIcons['arrow-right']," : ''}
  children: [${c.iconOnly ? 'defaultIcons.plus({}, h)' : q(c.label)}], attributes: [h.AriaLabel(${q(c.label)})],
}, h)`
      },
      badge: (c) => {
        return `import { Badge } from '@foldkit-visuals/fluid/badge'
Badge({ context, variant: ${q(c.variant)}, color: ${q(c.color)}, children: [${q(c.label)}] }, h)`
      },
      checkbox: (c) => {
        return `import { CheckboxBlock } from '@foldkit-visuals/fluid/checkbox'
import { Field, FieldLabel } from '@foldkit-visuals/fluid/field'
${bind('Checkbox', 'CheckboxBlock', 'checkbox', q({ id: 'notification', checked: c.checked, indeterminate: c.indeterminate, disabled: c.disabled, readOnly: c.readOnly }))}
Field({ context, orientation: 'horizontal', invalid: ${c.invalid}, children: [
  ${view('Checkbox', 'checkbox', `animate: animateTarget, label: ${q(c.label)}, name: ${q(c.name)}, value: ${q(c.formValue)}, required: ${c.required}, invalid: ${c.invalid},`)},
  FieldLabel({ context, htmlFor: 'notification', children: [${q(c.label)}] }, h),
]}, h)`
      },
      switch: (c) => {
        return `import { SwitchBlock, createSwitchMotionScope } from '@foldkit-visuals/fluid/switch'
const switchMotion = createSwitchMotionScope('example')
${bind('Switch', 'SwitchBlock', 'switch', q({ id: 'example', checked: c.checked, disabled: c.disabled }))}
${view('Switch', 'switch', `label: ${q(c.label)}, animate: switchMotion.node,`)}`
      },
      field: (c) => {
        const hasError = c.invalid && c.error !== ''
        const describedBy = [
          c.showDescription ? 'field-input-description' : '',
          hasError ? 'field-input-error' : '',
        ]
          .filter((id) => id !== '')
          .join(' ')
        return `import { InputBlock } from '@foldkit-visuals/fluid/input'
import { Field, FieldLabel, FieldDescription, FieldError } from '@foldkit-visuals/fluid/field'
import { childAttributes } from 'foldkit/html'
${bind('Input', 'InputBlock', 'input', q({ id: 'field-input', value: c.value, disabled: c.disabled, readOnly: c.readOnly }))}
Field({ context, orientation: ${q(c.orientation)}, invalid: ${c.invalid}, children: [
  FieldLabel({ context, htmlFor: 'field-input', children: [${q(c.label)}] }, h),
  ${view('Input', 'input', `placeholder: ${q(c.placeholder)}, invalid: ${c.invalid}, attributes: ${describedBy === '' ? '[]' : `childAttributes([h.AriaDescribedBy(${q(describedBy)})])`},`)},
  ${c.showDescription ? `FieldDescription({ context, id: 'field-input-description', children: [${q(c.description)}] }, h),` : ''}
  ${hasError ? `FieldError({ context, id: 'field-input-error', children: [${q(c.error)}] }, h),` : ''}
]}, h)`
      },
      'input-group': (c) => {
        const fields = [
          { name: 'First', field: 'first', label: c.firstLabel, value: c.firstValue, icon: 'user' },
          {
            name: 'Second',
            field: 'second',
            label: c.secondLabel,
            value: c.secondValue,
            icon: 'mail',
          },
          {
            name: 'Third',
            field: 'third',
            label: c.thirdLabel,
            value: c.thirdValue,
            icon: 'globe',
          },
        ].slice(0, c.count)
        return `import { InputGroupBlock } from '@foldkit-visuals/fluid/input-group'
import { InputFieldBlock } from '@foldkit-visuals/fluid/input-field'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
${bind('Group', 'InputGroupBlock', 'group', "{ id: 'group' }")}
${fields.map((f, index) => bind(f.name, 'InputFieldBlock', f.field, q({ id: f.field, index, value: f.value, disabled: c.disabled, readOnly: c.readOnly }))).join('\n')}
${view(
  'Group',
  'group',
  `content: group => [
${fields.map((f) => `  ${view(f.name, f.field, `activeIndex: group.activeIndex, label: ${q(f.label)}, labelHidden: ${c.hideLabels}, placeholder: ${q(c.placeholder)}, ${c.showIcons ? `icon: defaultIcons.${f.icon},` : ''} ${c.invalid ? "error: 'Check this value'," : ''}`)},`).join('\n')}
],`,
)}`
      },
      select: (c) => {
        const items = (
          c.itemsPreset === 'roles'
            ? ['Owner', 'Editor', 'Viewer', 'Guest']
            : c.itemsPreset === 'frameworks'
              ? ['React', 'Svelte', 'Vue', 'Solid']
              : [
                  'Design and creative engineering',
                  'Product and strategy',
                  'Research and accessibility',
                  'Infrastructure and developer experience',
                ]
        ).map((label) => ({ value: label, label }))
        return `import { SelectBlock } from '@foldkit-visuals/fluid/select'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
${bind('Select', 'SelectBlock', 'select', q({ id: 'example', items, disabled: c.disabled }))}
${view('Select', 'select', `animate: animateTarget, placeholder: ${q(c.placeholder)}, variant: ${q(c.variant)}, name: ${q(c.name)}, required: ${c.required}, ${c.error ? "error: 'Choose a value'," : ''} ${c.showIcon ? 'icon: defaultIcons.user,' : ''}`)}`
      },
      tabs: (c) => {
        const names = labels(c.labels, c.count, 'Tab')
        return `import { TabsBlock, TabsItem } from '@foldkit-visuals/fluid/tabs'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
${bind('Tabs', 'TabsBlock', 'tabs', q({ id: 'example', selectedIndex: 0, activeLabel: c.activeLabel }))}
const labels = ${q(names)}
${view(
  'Tabs',
  'tabs',
  `animate: animateTarget, ariaLabel: 'Workspace tabs', items: labels.map(value => ({ value, disabled: ${c.disabled} })),
  content: tabs => labels.map((label, index) => TabsItem({ index, label, ${c.showIcons ? "icon: index % 3 === 0 ? defaultIcons.home : index % 3 === 1 ? defaultIcons['message-circle'] : defaultIcons.inbox," : ''} }, tabs, h)),`,
)}`
      },
      slider: (c) => {
        return `import { SliderBlock, createSliderMotionScope } from '@foldkit-visuals/fluid/slider'
const sliderMotion = createSliderMotionScope('example')
${bind('Slider', 'SliderBlock', 'slider', q({ id: 'example', value: c.range ? [Math.min(c.value, c.upperValue), Math.max(c.value, c.upperValue)] : c.value, min: c.min, max: c.max, step: c.step, variant: c.variant, ...(c.size === 'site' ? {} : { size: c.size }), disabled: c.disabled, ...(c.valueDisplay === 'automatic' ? {} : { showValue: c.valueDisplay === 'show' }), ...(c.valuePosition === 'automatic' ? {} : { valuePosition: c.valuePosition }), ...(c.stepsPreset === 'none' ? {} : { steps: c.stepsPreset === 'quarters' ? [0, 25, 50, 75, 100] : [0, 10, 30, 60, 100] }), showSteps: c.showSteps }))}
${view('Slider', 'slider', `label: ${q(c.label)}, animate, motionValues: sliderMotion.node,`)}`
      },
      'radio-group': (c) => {
        const radio = true
        const name = radio ? 'RadioGroup' : 'CheckboxGroup'
        const item = radio ? 'RadioItem' : 'CheckboxItem'
        return `import { ${name}Block, ${item} } from '@foldkit-visuals/fluid/${c._tag}'
${radio ? '' : "import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'"}
${bind('Group', `${name}Block`, 'group', q({ id: 'example', ...(radio ? { selectedIndex: Math.min(1, c.count - 1), items: Array.from({ length: c.count }, (_, index) => ({ index, value: `option-${index}` })) } : { checkedIndices: [1, 2].filter((index) => index < c.count), items: Array.from({ length: c.count }, (_, index) => ({ index, checked: index === 1 || index === 2 })) }) }))}
const labels = ${q(labels(c.labels, c.count, 'Option'))}
${view(
  'Group',
  'group',
  `animate: animateTarget, animateHighlight, ${radio ? '' : 'animateSelection: selectionBackgroundAnimation(target),'}
  content: group => labels.map((label, index) => ${item}({ index, label }, group, h)),`,
)}`
      },
      'checkbox-group': (c) => {
        return `import { CheckboxGroupBlock, CheckboxItem } from '@foldkit-visuals/fluid/checkbox-group'
import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'
import { Update } from 'foldkit'
${bind('RawGroup', 'CheckboxGroupBlock', 'group', q({ id: 'example', checkedIndices: [1, 2].filter((index) => index < c.count), items: Array.from({ length: c.count }, (_, index) => ({ index, checked: index === 1 || index === 2 })) }))}
const Group = RawGroup.withOutMessagePolicy({
  fold: Page.makeOutMessageFold(CheckboxGroupBlock, {
    Toggled: ({ index }) => Page.makeStep(model => {
      const checked = model.group.checkedItems.find(item => item.index === index)?.checked ?? false
      const items = [...model.group.checkedItems.filter(item => item.index !== index), { index, checked: !checked }]
      return Update.combineSteps([
        RawGroup.requestItems({ items }),
        RawGroup.requestSelection({ indices: items.filter(item => item.checked).map(item => item.index) }),
      ])
    }),
  }),
})
const labels = ${q(labels(c.labels, c.count, 'Option'))}
${view(
  'Group',
  'group',
  `animate: animateTarget, animateHighlight, animateSelection: selectionBackgroundAnimation(target),
  content: group => labels.map((label, index) => CheckboxItem({ index, label }, group, h)),`,
)}`
      },
      'chat-message': (c) => {
        return `import { ChatMessageBlock, type ChatMessageConfig } from '@foldkit-visuals/fluid/chat-message'
import { Button } from '@foldkit-visuals/fluid/button'
const chatConfig: ChatMessageConfig = ${q({ id: 'example', from: c.from, files: filesFor(c), thumbnailSize: c.thumbnailSize })}
${bind('Chat', 'ChatMessageBlock', 'chat', 'chatConfig')}
${view('Chat', 'chat', `animate: (node, options) => animateTarget(node, { ...options, initial: false }), children: () => ${c.label === '' ? 'null' : `h.p([], [${q(c.label)}])`}, ${c.showTime ? `time: () => ${q(c.time)},` : ''} ${c.showActions ? `actions: () => Button({ context, variant: 'ghost', children: [${q(c.actionLabel)}], attributes: [h.OnClick(Message.RequestedCopy())] }, h),` : ''}`)}`
      },
      'thinking-indicator': (c) => {
        return `import { ThinkingIndicatorBlock, thinkingIndicatorAnimations } from '@foldkit-visuals/fluid/thinking-indicator'
${bind('Thinking', 'ThinkingIndicatorBlock', 'thinking', "{ id: 'thinking', reduceMotion: false }")}
${view('Thinking', 'thinking', `...thinkingIndicatorAnimations(target), size: ${c.size === 'site' ? 'context().size' : q(c.size)}, showIcon: ${c.showIcon},`)}`
      },
      'thinking-steps': (c) => {
        const rows = [
          {
            name: 'Profile',
            field: 'profile',
            label: c.stepLabel,
            description: c.stepDescription,
            status: c.status,
            icon: 'search',
          },
          {
            name: 'Portfolio',
            field: 'portfolio',
            label: 'Reading portfolio',
            status: 'complete',
            icon: 'globe',
          },
          {
            name: 'Recent',
            field: 'recent',
            label: 'Searching recent work',
            status: 'complete',
            icon: 'search',
          },
          {
            name: 'Analysis',
            field: 'analysis',
            label: 'Analyzing results',
            status: 'active',
            icon: 'brain',
          },
        ].slice(0, c.count)
        return `import { ThinkingStepsBlock } from '@foldkit-visuals/fluid/thinking-steps'
import { ThinkingStepBlock } from '@foldkit-visuals/fluid/thinking-step'
${bind('Steps', 'ThinkingStepsBlock', 'steps', q({ id: 'steps', defaultOpen: c.open, disabled: c.disabled, ...(c.control === 'controlled' ? { open: c.open } : {}), ...(c.running === 'unset' ? {} : { running: c.running === 'running' }) }))}
${rows.map((row) => bind(row.name, 'ThinkingStepBlock', row.field, `${q({ id: row.field, status: row.status })} as const`)).join('\n')}
${view(
  'Steps',
  'steps',
  `animate: animateTarget, label: () => ${q(c.label)}, ${c.meta === '' ? '' : `meta: () => ${q(c.meta)},`} content: () => [
${rows.map((row, index) => `  ${view(row.name, row.field, `animate: animateTarget, label: ${q(row.label)}, ${index === 0 ? `href: ${q(c.href)}, ${c.stepMeta === '' ? '' : `meta: () => ${q(c.stepMeta)},`}` : ''} ${row.description === undefined ? '' : `description: ${q(row.description)},`} showIcon: ${c.showIcons}, icon: ${q(row.icon)}, isLast: ${index === rows.length - 1},`)},`).join('\n')}
],`,
)}`
      },
      dialog: (c) => {
        return `import { DialogBlock, DialogHeader, DialogTitle, DialogDescription } from '@foldkit-visuals/fluid/dialog'
import { Button } from '@foldkit-visuals/fluid/button'
${bind('Dialog', 'DialogBlock', 'dialog', q({ id: 'dialog', modal: c.modal }))}
${view(
  'Dialog',
  'dialog',
  `animate, size: ${q(c.modalSize)}, position: ${q(c.position)}, showCloseButton: ${c.showCloseButton}, hasDescription: true,
  trigger: attributes => Button({ context, children: [${q(c.triggerLabel)}], attributes }, h),
  content: modal => [DialogHeader({ context, children: [DialogTitle({ dialogId: modal.id, children: [${q(c.label)}] }, h), DialogDescription({ dialogId: modal.id, children: [${q(c.description)}] }, h)] }, h),
    ${c.showActions ? `h.div([], [Button({ context, variant: 'ghost', children: [${q(c.cancelLabel)}], attributes: modal.close }, h), Button({ context, children: [${q(c.confirmLabel)}], attributes: modal.close }, h)]),` : ''}
  ],`,
)}`
      },
      table: (c) => {
        const headers = labels(c.headers, c.columnCount, 'Column')
        const rows = Array.from({ length: c.rowCount }, (_, index) =>
          [
            index === 0 ? c.firstCell : `Project ${index + 1}`,
            index % 2 ? 'Draft' : 'Published',
            `${index + 1} minutes ago`,
          ].slice(0, c.columnCount),
        )
        const selected = { none: [], first: [0], run: [0, 1, 2], disjoint: [0, 2] }[
          c.selection
        ].filter((index) => index < c.rowCount)
        return `import { TableBlock } from '@foldkit-visuals/fluid/table'
import { TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '@foldkit-visuals/fluid/table-parts'
${bind('Table', 'TableBlock', 'table', q({ id: 'table', selectedIndices: selected, heldHeadIndex: c.heldHeader < 0 ? null : c.heldHeader, hideHeadHighlight: c.hideHeaderHighlight }))}
const headers = ${q(headers)}
const rows = ${q(rows)}
${view(
  'Table',
  'table',
  `animateHighlight, ${c.hoverMarker ? `hoverMarker: () => h.span([h.Class('absolute left-0 top-1/2 -translate-y-1/2')], ['•']), ` : ''}content: table => [
  ${c.showHeader ? `TableHeader({ context: table, children: [TableRow({ context: table, keepRule: ${c.keepHeaderRule}, children: headers.map((label, index) => TableHead({ context: table, ${c.headerHover ? 'hoverIndex: index, ' : ''}children: [label] }, h)) }, h)] }, h),` : ''}
  TableBody({ children: rows.length > 0 ? rows.map((row, index) => TableRow({ index, context: table, children: row.map(value => TableCell({ size: table.size, children: [value] }, h)) }, h)) : [TableEmpty({ columns: ${c.columnCount}, title: ${q(c.emptyTitle)}, description: ${q(c.emptyDescription)} }, h)] }, h),
],`,
)}`
      },
      'carousel-dots': (c) => {
        return `import { CarouselDotsBlock } from '@foldkit-visuals/fluid/carousel-dots'
${bind('Carousel', 'CarouselDotsBlock', 'carousel', q({ id: 'carousel', count: c.count, value: 0, autoplay: c.autoplay ? { duration: c.duration, loop: c.loop } : false }))}
${view('Carousel', 'carousel', `animate: animateTarget, animateHighlight, getLabel: index => ${q(c.labelPrefix)} + ' ' + (index + 1),`)}`
      },
      'color-picker': (c) => {
        const swatches =
          c.swatchesPreset === 'none'
            ? []
            : c.swatchesPreset === 'warm'
              ? ['#ef4444', '#f97316', '#eab308']
              : c.swatchesPreset === 'cool'
                ? ['#06b6d4', '#3b82f6', '#8b5cf6']
                : ['#16a34a', '#3b82f6', '#8b5cf6', '#ec4899']
        return `import { ColorPickerBlock } from '@foldkit-visuals/fluid/color-picker'
${bind('Color', 'ColorPickerBlock', 'color', q({ id: 'color', defaultValue: c.value, format: c.format, hideEyedropper: c.hideEyedropper, swatches }))}
h.div([h.Id('color-container')], [${view('Color', 'color', "portalContainerId: 'color-container', animate, sliderMotion: sliderMotion.node, highlightMotion: animateHighlight,")}])`
      },
      tooltip: (c) => {
        return tooltipCode(c)
      },
      'input-copy': (c) => {
        return `import { InputCopyBlock } from '@foldkit-visuals/fluid/input-copy'
import { DocumentTooltipBlock, type DocumentTooltipOccurrenceViewInputs } from '@foldkit-visuals/fluid/tooltip'
let copyTrigger: DocumentTooltipOccurrenceViewInputs['trigger'] = () => null
${bind('Copy', 'InputCopyBlock', 'copy', q({ id: 'copy', value: c.value, variant: c.variant, align: c.align, disabled: c.disabled }))}
${bind('Tooltips', 'DocumentTooltipBlock', 'tooltips', '')}.withOutMessagePolicy({
  fold: Page.makeOutMessageFold(DocumentTooltipBlock, { Transaction: () => Page.makeNoopStep() }),
})
const Composition = Page.makeComposition({ bindings: [Copy, Tooltips] })
const init = Composition.makeInit(() => ({ model: {}, steps: [Tooltips.requestAdd({ key: 'copy', options: { side: 'top' } })] }))
${view(
  'Tooltips',
  'tooltips',
  `renderTrigger: (_key, attributes) => copyTrigger(attributes),
  renderDocument: (content, popups) => h.div([], [content, ...popups]),
  render: ({ tooltip }) => ${view('Copy', 'copy', `label: ${q(c.label)}, animate: animateTarget, tooltip: ({ trigger }, options) => { copyTrigger = trigger; return tooltip('copy', { ...options, animate, reducedMotion: 'user' }) },`)},`,
)}`
      },
      accordion: (c) => {
        return `import { AccordionGroupBlock, AccordionItem, AccordionTrigger, AccordionContent } from '@foldkit-visuals/fluid/accordion'
const items = [{ value: 'first', title: 'A considered default', description: 'A comfortable place to start.' }, { value: 'second', title: 'Make it yours', description: 'Adjust the details as you go.' }]
${bind('Accordion', 'AccordionGroupBlock', 'accordion', `{ id: 'accordion', type: '${c.expand === 'any' ? 'multiple' : 'single'}', collapsible: ${c.expand !== 'one'}, highlight: '${c.highlightExpanded ? 'item' : 'trigger'}', items: items.map(({ value }, index) => ({ value, index })), defaultValue: 'first' }`)}
${view('Accordion', 'accordion', `animate, animateHighlight, content: accordion => items.map(({ value, title, description }, index) => AccordionItem({ value, index, children: item => [AccordionTrigger({ value, children: [title] }, item, h), AccordionContent({ value, children: [description] }, item, h)] }, accordion, h)),`)}`
      },
    }),
    Match.orElse(() => undefined),
  )
  return code === undefined ? undefined : `${contextCode(c)}\n${code}`
}
