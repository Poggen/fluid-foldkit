import * as classNames from './dropdown-example-view-classes.js'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs'
import { docSection } from './doc-section.js'
import source from './dropdown-example-view.ts?raw'
import { Option } from 'effect'
import { Button } from '@foldkit-visuals/fluid/button'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { DropdownSubTrigger } from '@foldkit-visuals/fluid/dropdown-sub'
import {
  DropdownLabel,
  DropdownSeparator,
  DropdownSearch,
  DropdownEmpty,
} from '@foldkit-visuals/fluid/dropdown-parts'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import {
  Basic,
  Groups,
  Triggered,
  File,
  Status,
  Language,
  Labels,
  Components,
  Move,
  Share,
  DropdownExampleComposition,
  DocTabs,
  Message,
  motion,
} from './dropdown-example-block.js'
import {
  views,
  viewIcons,
  folders,
  statuses,
  labels,
  languages,
  matches,
} from './dropdown-example-data.js'

const accountRows = [
  { label: 'Email', icon: defaultIcons.mail },
  { label: 'Notifications', icon: defaultIcons.bell },
  { label: 'Privacy', icon: defaultIcons.shield },
]

const appearanceRows = [
  { label: 'General', icon: defaultIcons.settings },
  { label: 'Theme', icon: defaultIcons.palette },
  { label: 'Display', icon: defaultIcons.monitor },
]

export const view = DropdownExampleComposition.makeView((model, h) => {
  const appearance = { shape: model.docShape, size: model.docSize, hoverMode: model.docHover }
  const documentationTabs = (key: string) => {
    const child = model.docTabs[key]
    return child === undefined
      ? h.empty
      : h.block(
          DocTabs.embedView({
            key,
            slotId: child.tabs.id,
            model: child,
            viewInputs: previewCodeTabsViewInputs(h, {
              ...appearance,
              animate: motion.node,
              ariaLabel: `${key} example`,
            }),
          }),
        )
  }
  const context = createPresentationContext({ ...appearance, reducedMotion: 'user' })

  const animate = motion.node
  const common = { animate, context }
  const languageMatches = matches(languages, model.languageQuery)
  const labelMatches = matches(labels, model.labelQuery)
  const componentMatches = matches(model.componentValues, model.componentQuery)
  const query = model.componentQuery.trim()

  const canCreate =
    query !== '' &&
    !model.componentValues.some((value) => value.toLowerCase() === query.toLowerCase())

  const fileContext = {
    context,
    id: 'file-menu',
    activeIndex: model.file.hover.activeIndex,
    multiple: false,
    inMenu: true,
  }

  const move = h.block(
    Move.embedView({
      slotId: 'move',
      model: model.move,
      viewInputs: {
        ...common,
        trigger: (attributes) =>
          DropdownSubTrigger(
            {
              id: 'move-menu-trigger',
              index: 0,
              label: 'Move to',
              icon: defaultIcons.folder,
              animate,
              attributes,
            },
            fileContext,
            h,
          ),
        content: (itemContext) =>
          folders.map((label, index) =>
            DropdownItem(
              { label, index, animate, disabled: model.isDisabled && index === folders.length - 1 },
              itemContext,
              h,
            ),
          ),
        ...appearance,
      },
    }),
  )

  const share = h.block(
    Share.embedView({
      slotId: 'share',
      model: model.share,
      viewInputs: {
        ...common,
        trigger: (attributes) =>
          DropdownSubTrigger(
            {
              id: 'share-menu-trigger',
              index: 1,
              label: 'Share',
              icon: defaultIcons.link,
              animate,
              attributes,
            },
            fileContext,
            h,
          ),
        content: (itemContext) =>
          ['Copy link', 'Email'].map((label, index) =>
            DropdownItem(
              { label, index, animate, icon: index === 0 ? defaultIcons.link : defaultIcons.mail },
              itemContext,
              h,
            ),
          ),
        ...appearance,
      },
    }),
  )

  const basic = h.block(
    Basic.embedView({
      slotId: 'basic',
      model: model.basic,
      viewInputs: {
        ...common,
        content: (itemContext) =>
          views.map((label, index) =>
            DropdownItem(
              {
                label,
                index,
                animate,
                icon: defaultIcons[viewIcons[index] ?? 'star'],
                checked: Option.getOrNull(model.selected) === index,
                disabled: model.isDisabled && index === views.length - 1,
              },
              itemContext,
              h,
            ),
          ),
        ...appearance,
      },
    }),
  )

  const groups = h.block(
    Groups.embedView({
      slotId: 'groups',
      model: model.groups,
      viewInputs: {
        ...common,
        content: (itemContext) => [
          DropdownLabel({ children: ['Account'], context }, h),
          ...accountRows.map(({ label, icon }, index) =>
            DropdownItem(
              {
                label,
                index,
                animate,
                icon,
              },
              itemContext,
              h,
            ),
          ),
          DropdownSeparator({}, h),
          DropdownLabel({ children: ['Appearance'], context }, h),
          ...appearanceRows.map(({ label, icon }, index) =>
            DropdownItem(
              {
                label,
                index: index + 3,
                animate,
                icon,
              },
              itemContext,
              h,
            ),
          ),
        ],
        ...appearance,
      },
    }),
  )

  const triggered = h.block(
    Triggered.embedView({
      slotId: 'triggered',
      model: model.triggered,
      viewInputs: {
        ...common,
        trigger: (attributes) =>
          Button(
            {
              variant: 'ghost',
              children: ['Open menu'],
              attributes,
              context,
              ...appearance,
            },
            h,
          ),
        content: (itemContext) =>
          views.map((label, index) =>
            DropdownItem(
              {
                label,
                index,
                animate,
                icon: defaultIcons[viewIcons[index] ?? 'star'],
                checked: model.view === index,
                disabled: model.isDisabled && index === views.length - 1,
              },
              itemContext,
              h,
            ),
          ),
        ...appearance,
      },
    }),
  )

  const file = h.block(
    File.embedView({
      slotId: 'file',
      model: model.file,
      viewInputs: {
        ...common,
        trigger: (attributes) =>
          Button(
            {
              variant: 'ghost',
              children: ['Q3 report.pdf'],
              attributes,
              context,
              ...appearance,
            },
            h,
          ),
        content: (itemContext) => [
          move,
          share,
          DropdownItem(
            { label: 'Rename', index: 2, animate, icon: defaultIcons.pencil },
            itemContext,
            h,
          ),
        ],
        ...appearance,
      },
    }),
  )

  const status = h.block(
    Status.embedView({
      slotId: 'status',
      model: model.status,
      viewInputs: {
        ...common,
        trigger: (attributes) =>
          Button({ variant: 'ghost', children: ['Status'], attributes, context, ...appearance }, h),
        content: (itemContext) =>
          statuses.map((label, index) =>
            DropdownItem(
              {
                label,
                index,
                animate,
                checked: model.statuses.includes(index),
                disabled: model.isDisabled && index === statuses.length - 1,
              },
              itemContext,
              h,
            ),
          ),
        ...appearance,
      },
    }),
  )

  const language = h.block(
    Language.embedView({
      slotId: 'language',
      model: model.language,
      viewInputs: {
        ...common,
        trigger: (attributes) =>
          Button(
            {
              variant: 'ghost',
              children: [model.languageValue],
              trailingIcon: defaultIcons['chevron-down'],
              attributes,
              context,
              ...appearance,
            },
            h,
          ),
        content: (itemContext) => [
          DropdownSearch(
            {
              context: createPresentationContext(itemContext),
              value: model.languageQuery,
              onValueChange: (value) => Message.UpdatedLanguageQuery({ value }),
              placeholder: 'Search languages',
            },
            h,
          ),
          ...languageMatches.map((label, index) =>
            DropdownItem(
              { label, index, animate, checked: model.languageValue === label },
              itemContext,
              h,
            ),
          ),
          ...(languageMatches.length === 0
            ? [
                DropdownEmpty(
                  {
                    context: createPresentationContext(itemContext),
                    children: ['No languages found'],
                  },
                  h,
                ),
              ]
            : []),
        ],
        ...appearance,
      },
    }),
  )

  const labelMenu = h.block(
    Labels.embedView({
      slotId: 'labels',
      model: model.labels,
      viewInputs: {
        ...common,
        trigger: (attributes) =>
          Button(
            {
              variant: 'ghost',
              children: [`Labels · ${model.labelsValue.length}`],
              attributes,
              context,
              ...appearance,
            },
            h,
          ),
        content: (itemContext) => [
          DropdownSearch(
            {
              context: createPresentationContext(itemContext),
              value: model.labelQuery,
              onValueChange: (value) => Message.UpdatedLabelQuery({ value }),
              placeholder: 'Search labels',
            },
            h,
          ),
          ...labelMatches.map((label, index) =>
            DropdownItem(
              { label, index, animate, checked: model.labelsValue.includes(label) },
              itemContext,
              h,
            ),
          ),
          ...(labelMatches.length === 0
            ? [
                DropdownEmpty(
                  {
                    context: createPresentationContext(itemContext),
                    children: ['No labels found'],
                  },
                  h,
                ),
              ]
            : []),
        ],
        ...appearance,
      },
    }),
  )

  const componentMenu = h.block(
    Components.embedView({
      slotId: 'components',
      model: model.components,
      viewInputs: {
        ...common,
        trigger: (attributes) =>
          Button(
            {
              variant: 'ghost',
              children: [`Components · ${model.used.length}`],
              attributes,
              context,
              ...appearance,
            },
            h,
          ),
        content: (itemContext) => [
          DropdownSearch(
            {
              context: createPresentationContext(itemContext),
              value: model.componentQuery,
              onValueChange: (value) => Message.UpdatedComponentQuery({ value }),
              placeholder: 'Search components',
            },
            h,
          ),
          ...componentMatches.map((label, index) =>
            DropdownItem(
              { label, index, animate, checked: model.used.includes(label) },
              itemContext,
              h,
            ),
          ),
          ...(canCreate
            ? [
                DropdownItem(
                  {
                    label: `Create “${query}”`,
                    index: componentMatches.length,
                    animate,
                    icon: defaultIcons.plus,
                    closeOnClick: false,
                  },
                  itemContext,
                  h,
                ),
              ]
            : []),
          ...(componentMatches.length === 0 && !canCreate
            ? [
                DropdownEmpty(
                  {
                    context: createPresentationContext(itemContext),
                    children: ['No components found'],
                  },
                  h,
                ),
              ]
            : []),
        ],
        ...appearance,
      },
    }),
  )

  const sections = [
    { id: 'basic', title: 'Basic', node: basic },
    { id: 'groups', title: 'Groups', node: groups },
    { id: 'triggered', title: 'Triggered menu', node: triggered },
    { id: 'submenus', title: 'Submenus', node: file },
    { id: 'multiple', title: 'Multiple selection', node: status },
    { id: 'searchable', title: 'Searchable menu', node: language },
    { id: 'searchable-multiple', title: 'Searchable multiple selection', node: labelMenu },
    { id: 'create', title: 'Create from the query', node: componentMenu },
  ]

  return h.div(
    [h.Class(model.isDocEmbedded ? '' : classNames.dropdownPage)],
    [
      model.isDocEmbedded
        ? null
        : h.header(
            [],
            [
              h.h1([], ['Dropdown']),
              h.p([], ['2 forms: an inline panel, or a popup on any trigger.']),
            ],
          ),
      ...sections.map((section) =>
        docSection(h, {
          title: section.title,
          children: [section.node],
          source,
          presentation: { context },
          pane: model.docTabs[section.id]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
          tabs: documentationTabs(section.id),
          tabsId: previewCodeTabId('dropdown', section.id),
        }),
      ),
      model.lastAction ? h.output([h.AriaLive('polite')], [model.lastAction]) : null,
    ],
  )
})
