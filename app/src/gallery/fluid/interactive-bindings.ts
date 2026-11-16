import { ScrollAreaBlock } from '@foldkit-visuals/fluid/scroll-area'
import { AskUserQuestionsBlock } from '@foldkit-visuals/fluid/ask-user-questions'
import { DialogBlock } from '@foldkit-visuals/fluid/dialog'
import { DropdownBlock } from '@foldkit-visuals/fluid/dropdown'
import { InputCopyBlock } from '@foldkit-visuals/fluid/input-copy'
import { InputFieldBlock } from '@foldkit-visuals/fluid/input-field'
import { InputGroupBlock } from '@foldkit-visuals/fluid/input-group'
import { InputMessageBlock, inputMessageTooltipEntries } from '@foldkit-visuals/fluid/input-message'
import { NavMenuBlock } from '@foldkit-visuals/fluid/nav-menu'
import { createReorderScope } from '@foldkit-visuals/fluid/reorder'
import { SidebarBlock } from '@foldkit-visuals/fluid/sidebar'
import { SidebarWorkspaceHeaderBlock } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarUserFooterBlock } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { Option } from 'effect'
import { Update } from 'foldkit'
import { motion } from '../../motion'
import { FluidGalleryBlock } from './block'
import { SIDEBAR_THREADS } from './demo-data'
import { questions } from './question-data'
export { questions } from './question-data'
export const reorder = createReorderScope(motion)
export const ComposerRequests = FluidGalleryBlock.makeRequiredFieldBinding(InputMessageBlock, {
  field: 'composer',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-composer',
        disabled: false,
        value: '',
        reduceMotion: false,
        supportsFiles: false,
        minRows: 1,
        placeholderSuggestion: 'Why is every other input box so stiff?',
      },
    ],
  },
})
export const Composer = ComposerRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(InputMessageBlock, {
    Events: ({ events }) =>
      FluidGalleryBlock.makeStep((model) => {
        const current = model.composer
        let value = current.value,
          files = current.files,
          queue = current.queue,
          status = Option.getOrNull(current.status),
          history = model.composerHistory
        for (const event of events) {
          if (event._tag === 'ValueChanged') value = event.value
          if (event._tag === 'FilesChanged') files = event.files
          if (event._tag === 'QueueChanged') queue = event.queue
          if (event._tag === 'Sent') {
            value = ''
            files = []
            history = [...history, event.text]
            if (status !== null) status = 'streaming'
          }
          if (event._tag === 'Stopped') status = 'idle'
        }
        return Update.combineSteps([
          FluidGalleryBlock.makeFieldsStep(() => ({ composerHistory: () => history })),
          ComposerRequests.requestConfigure({
            value,
            files,
            queue,
            status,
            disabled: current.disabled,
            supportsFiles: current.supportsFiles,
            supportsQueue: current.supportsQueue,
            showQueue: current.showQueue,
            supportsStop: current.supportsStop,
            accept: current.accept,
            maxFiles: Option.getOrNull(current.maxFiles),
            filePreviewSize: current.filePreviewSize,
            minRows: current.minRows,
            maxRows: current.maxRows,
            clickToFocus: current.clickToFocus,
            history: current.history,
            suggestions: current.suggestions,
            placeholderSuggestion: Option.getOrNull(current.placeholderSuggestion),
          }),
          reconcileComposerTooltips(),
        ])
      }),
    PresentationChanged: () => reconcileComposerTooltips(),
  }),
})
export const CopyRequests = FluidGalleryBlock.makeRequiredFieldBinding(InputCopyBlock, {
  field: 'copy',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-copy',
        variant: 'icon' as const,
        align: 'right' as const,
        value: 'bunx shadcn@4.23.0 add @fluid-foldkit/button',
        disabled: false,
      },
    ],
  },
})
export const Copy = CopyRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(InputCopyBlock, {
    Events: FluidGalleryBlock.makeNoopStep,
  }),
})
export const DialogRequests = FluidGalleryBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'preview-dialog' }] },
})
export const Dialog = DialogRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: FluidGalleryBlock.makeNoopStep,
    CompletedClose: FluidGalleryBlock.makeNoopStep,
  }),
})
export const DropdownRequests = FluidGalleryBlock.makeRequiredFieldBinding(DropdownBlock, {
  field: 'dropdown',
  placement: 'inlineDropdown',
  init: {
    contextToArgs: () => [{ id: 'preview-dropdown', checkedIndex: 0, disabled: false }],
  },
})
export const Dropdown = DropdownRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(DropdownBlock, {
    Events: ({ events }) =>
      FluidGalleryBlock.makeStep((model) => {
        const event = events.filter((event) => event._tag === 'Selected').at(-1)
        const row =
          event === undefined
            ? undefined
            : model.dropdown.controller.rows.find((row) => row.index === event.index)
        if (row === undefined) return { model }
        const selected =
          row.kind === 'checkbox'
            ? model.dropdownSelectedValues.includes(row.label)
              ? model.dropdownSelectedValues.filter((value) => value !== row.label)
              : [...model.dropdownSelectedValues, row.label]
            : row.kind === 'radio'
              ? [row.label]
              : model.dropdownSelectedValues
        return Update.combineSteps([
          FluidGalleryBlock.makeFieldsStep(() => ({ dropdownSelectedValues: () => selected })),
          DropdownRequests.requestSelection({
            selection: {
              checkedIndex: row.kind === 'radio' ? Option.some(row.index) : Option.none(),
              checkedIndices:
                row.kind === 'checkbox'
                  ? Option.some(
                      model.dropdown.controller.rows
                        .filter((row) => selected.includes(row.label))
                        .map((row) => row.index),
                    )
                  : Option.none(),
            },
          }),
        ])
      }),
  }),
})
export const AskRequests = FluidGalleryBlock.makeRequiredFieldBinding(AskUserQuestionsBlock, {
  field: 'ask',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-ask',
        questions: questions,
      },
    ],
  },
})
export const Ask = AskRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(AskUserQuestionsBlock, {
    Events: FluidGalleryBlock.makeNoopStep,
  }),
})
export const GroupRequests = FluidGalleryBlock.makeRequiredFieldBinding(InputGroupBlock, {
  field: 'group',
  init: { contextToArgs: () => [{ id: 'preview-input-group' }] },
})
export const Group = GroupRequests
export const FirstRequests = FluidGalleryBlock.makeRequiredFieldBinding(InputFieldBlock, {
  field: 'first',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-first-name',
        index: 0,
        value: '',
        disabled: false,
        readOnly: false,
      },
    ],
  },
})
export const First = FirstRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(InputFieldBlock, {
    Changed: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        FirstRequests.requestConfigure({
          value,
          disabled: model.first.disabled,
          readOnly: model.first.readOnly,
        }),
      ),
  }),
})
export const LastRequests = FluidGalleryBlock.makeRequiredFieldBinding(InputFieldBlock, {
  field: 'last',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-last-name',
        index: 1,
        value: '',
        disabled: false,
        readOnly: false,
      },
    ],
  },
})
export const Last = LastRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(InputFieldBlock, {
    Changed: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        LastRequests.requestConfigure({
          value,
          disabled: model.last.disabled,
          readOnly: model.last.readOnly,
        }),
      ),
  }),
})
export const WebsiteRequests = FluidGalleryBlock.makeRequiredFieldBinding(InputFieldBlock, {
  field: 'website',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-website',
        index: 2,
        value: '',
        disabled: false,
        readOnly: false,
      },
    ],
  },
})
export const Website = WebsiteRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(InputFieldBlock, {
    Changed: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        WebsiteRequests.requestConfigure({
          value,
          disabled: model.website.disabled,
          readOnly: model.website.readOnly,
        }),
      ),
  }),
})
export const SidebarScroll = FluidGalleryBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'sidebarScroll',
  init: { contextToArgs: () => [{ id: 'preview-sidebar-scroll' }] },
}).withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: FluidGalleryBlock.makeNoopStep,
  }),
})
export const SidebarRequests = FluidGalleryBlock.makeRequiredFieldBinding(SidebarBlock, {
  field: 'sidebar',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-sidebar',
        variant: 'inset' as const,
        side: 'left' as const,
        defaultOpen: true,
        persist: false,
        shortcut: null,
        mobileBreakpoint: 0,
        width: '224px',
        collapsible: 'none' as const,
        rail: false,
      },
    ],
  },
})
export const Sidebar = SidebarRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(SidebarBlock, {
    OpenChanged: FluidGalleryBlock.makeNoopStep,
    WidthChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
export const SidebarWorkspace = FluidGalleryBlock.makeRequiredFieldBinding(
  SidebarWorkspaceHeaderBlock,
  {
    field: 'sidebarWorkspace',
    init: { contextToArgs: () => [{ id: 'preview-sidebar-workspace', name: 'Acme Inc' }] },
  },
).withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(SidebarWorkspaceHeaderBlock, {
    Events: FluidGalleryBlock.makeNoopStep,
  }),
})
export const SidebarUser = FluidGalleryBlock.makeRequiredFieldBinding(SidebarUserFooterBlock, {
  field: 'sidebarUser',
  init: { contextToArgs: () => [{ id: 'preview-sidebar-user', name: 'Micka Touillaud' }] },
}).withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(SidebarUserFooterBlock, {
    Events: FluidGalleryBlock.makeNoopStep,
  }),
})
export const SidebarActions = FluidGalleryBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'sidebarActions',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-sidebar-actions',
        ariaLabel: 'Actions',
        items: [
          {
            value: 'new',
            href: '#',
            label: 'New thread',
            disabled: false,
            status: null,
            badge: null,
            level: 0,
          },
        ],
      },
    ],
  },
}).withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: FluidGalleryBlock.makeNoopStep,
  }),
})
export const ThreadsRequests = FluidGalleryBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'threads',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-threads',
        ariaLabel: 'Threads',
        activeSlug: null,
        items: SIDEBAR_THREADS.filter((_, index) => index !== 1).map((thread, index) => ({
          value: String(index),
          href: '#',
          label: thread.label,
          disabled: false,
          status: thread.status,
          badge: thread.badge ?? null,
          level: 0,
        })),
      },
    ],
  },
})
export const Threads = ThreadsRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: ({ href }) =>
      FluidGalleryBlock.makeStep((model) =>
        ThreadsRequests.requestConfigure({ items: model.threads.items, activeSlug: href }),
      ),
  }),
})
export const TooltipsRequests = FluidGalleryBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
})
export const Tooltips = TooltipsRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: FluidGalleryBlock.makeNoopStep,
  }),
})
function reconcileComposerTooltips() {
  return FluidGalleryBlock.makeStep((model) => {
    const entries = inputMessageTooltipEntries(model.composer)
    const wanted = new Set(entries.map((entry) => entry.key))
    const owners = [model.composer.filesView.id, model.composer.queueView.id]
    return Update.combineSteps([
      ...Object.keys(model.tooltips.rows)
        .filter((key) => owners.some((id) => key.startsWith(`${id}-remove-`)) && !wanted.has(key))
        .map((key) => TooltipsRequests.requestRemove({ key })),
      ...entries
        .filter((entry) => model.tooltips.rows[entry.key] === undefined)
        .map((entry) =>
          TooltipsRequests.requestAdd({ key: entry.key, options: { side: entry.side } }),
        ),
    ])
  })
}

export const interactiveBindings = [
  Composer,
  Copy,
  Dialog,
  Dropdown,
  Ask,
  Group,
  First,
  Last,
  Website,
  Sidebar,
  SidebarScroll,
  Threads,
  SidebarWorkspace,
  SidebarUser,
  SidebarActions,
  Tooltips,
] as const

export {
  CommandDialog,
  CommandTabs,
  CommandFilter,
  CommandSort,
  DropdownPopup,
  DropdownTheme,
} from './playground-bindings'
