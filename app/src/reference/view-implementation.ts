import { pageNavigation } from '../page-navigation'
import { referenceSection, referenceHeading, referenceToolbar } from './classes'
import type { controlsView } from './controls-view'
import { AsyncData } from 'foldkit'
import { codeBlock } from '../../../components/docs/code-block'
import { Button } from '@foldkit-visuals/fluid/button'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { Option } from 'effect'
import { pageAt } from '../../../lib/catalogue'
import { presentation } from '../settings'
import { ComponentReferenceBlock, Message } from './block'
import { apiTable } from './api-table'
import { previewCode } from './preview'
import { ApiScrolls, apiScrollKey } from './view'
import type { H, ReferenceViewRenderer, ReferenceViewParts } from './view'
const sourcePlaygroundStage: Readonly<Record<string, string>> = {
  accordion: 'relative flex outline-none items-start justify-center h-[420px] bg-background',
  sidebar:
    'relative flex outline-none items-center justify-center h-[560px] md:h-[640px] bg-background',
  calendar: 'relative flex outline-none items-start justify-center min-h-[420px] bg-background',
  'date-picker':
    'relative flex outline-none items-start justify-center min-h-[480px] bg-background',
  card: 'relative flex outline-none items-center justify-center min-h-[600px] bg-background px-4 py-4',
  'input-message':
    'relative flex outline-none items-end justify-center h-[560px] bg-background px-4 py-4',
  'ask-user-questions':
    'relative flex outline-none items-end justify-center min-h-[560px] bg-background px-4 py-4 sm:px-8 sm:py-12',
  'command-menu':
    'relative flex outline-none items-start justify-center min-h-[480px] bg-background px-4 py-12 sm:px-8',
  combobox:
    'relative flex outline-none items-start justify-center min-h-[360px] bg-background px-4 py-12 sm:px-8',
  banner:
    'relative flex outline-none items-center justify-center min-h-[340px] bg-background px-4 py-12 sm:px-8',
  button:
    'relative flex outline-none items-center justify-center min-h-[280px] bg-background px-4 py-12 sm:px-8',
  breadcrumb:
    'relative flex outline-none items-center justify-center min-h-[280px] bg-background px-4 py-12 sm:px-8',
}
const sourceDefaultStage =
  'relative flex outline-none items-center justify-center min-h-[120px] bg-background px-4 py-12 sm:px-8'
export const renderApiReference = (
  reference: Parameters<ReferenceViewRenderer>[1]['reference'],
  path: string,
  apiScrolls: typeof ComponentReferenceBlock.Model.Type.apiScrolls,
  shape: Parameters<typeof presentation>[0]['shape'],
  size: Parameters<typeof presentation>[0]['size'],
  hover: Parameters<typeof presentation>[0]['hover'],
  h: H,
) => {
  const context = presentation({ shape, size, hover })
  const data = Option.getOrUndefined(AsyncData.getData(reference))
  const referenceError = Option.getOrUndefined(AsyncData.getError(reference))
  return h.section(
    [h.Class(referenceSection), h.AriaLabel('API reference')],
    [
      h.h2([h.Class(referenceHeading)], ['API reference']),
      ...(AsyncData.isPending(reference) ? [h.p([h.Role('status')], ['Loading native API…'])] : []),
      ...(referenceError !== undefined
        ? [
            h.p([h.Role('alert')], [referenceError]),
            Button(
              {
                context,
                variant: 'secondary',
                children: ['Retry reference'],
                attributes: [h.OnClick(Message.RequestedRetry())],
              },
              h,
            ),
          ]
        : []),
      ...(data?.contracts ?? [])
        .map((contract, index) => ({ contract, key: apiScrollKey(path, index) }))
        .filter(({ contract }) => contract.props.length > 0)
        .map(({ contract, key }) =>
          h.section(
            [h.Class('reference-contract')],
            [
              h.h3(
                [h.Class(`pb-2 pt-6 text-left text-site-subtitle text-foreground`)],
                [contract.name],
              ),
              ...(contract.props.length
                ? apiScrolls
                    .filter((scroll) => scroll.key === key)
                    .map((scroll) =>
                      h.block(
                        ApiScrolls.embedView({
                          key,
                          slotId: scroll.model.id,
                          model: scroll.model,
                          viewInputs: {
                            context,
                            className: 'reference-table-scroll w-full',
                            viewportClassName: 'scroll-fade-x',
                            content: () => [apiTable(contract.props, context, h)],
                            children: [],
                          },
                        }),
                      ),
                    )
                : []),
            ],
          ),
        ),
    ],
  )
}

export const renderReferenceView = (
  model: typeof ComponentReferenceBlock.Model.Type,
  inputs: Parameters<ReferenceViewRenderer>[1],
  h: H,
  {
    renderAuthored,
    renderSidebarControls,
    renderInlineControls,
    renderToolbar,
    renderApiReference: renderApi,
  }: ReferenceViewParts,
) => {
  const page = pageAt(model.path)
  if (page === undefined) return h.empty
  const context = presentation(inputs.settings)
  const controlsArgs: Parameters<typeof controlsView> = [
    model.path,
    model.controls,
    model.controlsHover,
    model.controlsHighlight,
    model.shuffleTooltip,
    inputs.previewReady,
    inputs.settings.shape,
    inputs.settings.size,
    inputs.settings.hover,
    h,
  ]
  if (inputs.part === 'controls') return renderSidebarControls(...controlsArgs)
  const data = Option.getOrUndefined(AsyncData.getData(inputs.reference))
  const source =
    data?.files.find((file) => file.path === model.sourceFile) ??
    data?.files.find((file) => file.path === data.entry) ??
    data?.files[0]
  return h.div(
    [
      h.Class('component-reference contents'),
      h.DataAttribute('reference-page', `${page.family}/${page.slug}`),
    ],
    [
      h.section(
        [h.Class('flex flex-col gap-4 pt-8'), h.AriaLabel('Playground')],
        [
          h.h2([h.Class(referenceHeading)], ['Playground']),
          h.div(
            [h.Class('contents')],
            [
              h.div(
                [
                  h.Class(
                    `relative isolate flex flex-col gap-0 w-full border border-border/60 transition-[border-color] duration-150 ease-out focus-within:border-foreground/40 ${resolvePresentation({ context }).shape.container} reference-preview-card`,
                  ),
                ],
                [
                  renderToolbar(
                    model.previewTabs,
                    model.inspector,
                    inputs.settings.shape,
                    inputs.settings.size,
                    inputs.settings.hover,
                    h,
                  ),
                  h.div(
                    [
                      h.Id('docs-playground-view-panel-0'),
                      h.Role('tabpanel'),
                      h.AriaLabelledBy('docs-playground-view-tab-0'),
                      h.Class(
                        model.previewTabs.selectedIndex !== 1
                          ? `${sourcePlaygroundStage[page.slug] ?? sourceDefaultStage} reference-preview`
                          : 'hidden',
                      ),
                    ],
                    [inputs.renderPreview()],
                  ),
                  h.div(
                    [
                      h.Id('docs-playground-view-panel-1'),
                      h.Role('tabpanel'),
                      h.AriaLabelledBy('docs-playground-view-tab-1'),
                      h.Class(model.previewTabs.selectedIndex === 1 ? '' : 'hidden'),
                    ],
                    model.previewTabs.selectedIndex === 1
                      ? [
                          codeBlock(
                            {
                              code: previewCode(page, model.configuration),
                              label: 'Playground code',
                              context,
                            },
                            h,
                          ),
                        ]
                      : [],
                  ),
                ],
              ),
              ...(inputs.inlineControls ? [renderInlineControls(...controlsArgs)] : []),
            ],
          ),
        ],
      ),
      renderAuthored(
        model.authored,
        inputs.settings.theme,
        inputs.settings.accent,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        page.slug,
        inputs.previewReady,
        h,
      ),
      h.section(
        [h.Class(referenceSection), h.AriaLabel('Component source')],
        [
          h.div(
            [h.Class(referenceToolbar)],
            [
              h.h2([h.Class(referenceHeading)], ['Component source']),
              Button(
                {
                  context,
                  variant: 'secondary',
                  buttonSize: 'compact',
                  children: [model.isSourceOpen ? 'Hide source' : 'View source'],
                  attributes: [
                    h.AriaExpanded(model.isSourceOpen),
                    h.OnClick(Message.ToggledSource()),
                  ],
                },
                h,
              ),
            ],
          ),
          ...(model.isSourceOpen && data !== undefined
            ? [
                h.div(
                  [
                    h.Class('flex max-h-[180px] flex-wrap gap-1 overflow-auto py-3'),
                    h.Role('group'),
                    h.AriaLabel('Source file'),
                  ],
                  data.files.map((file) =>
                    Button(
                      {
                        context,
                        variant: source?.path === file.path ? 'secondary' : 'ghost',
                        buttonSize: 'compact',
                        children: [
                          h.span(
                            [
                              h.Class(
                                'font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[11px]',
                              ),
                            ],
                            [file.path],
                          ),
                        ],
                        attributes: [
                          h.AriaPressed(String(source?.path === file.path)),
                          h.OnClick(Message.PickedFile({ path: file.path })),
                        ],
                      },
                      h,
                    ),
                  ),
                ),
                codeBlock(
                  {
                    code: source?.content ?? '',
                    filename: source?.path ?? 'source.ts',
                    label: 'Native component source',
                    context,
                  },
                  h,
                ),
              ]
            : []),
        ],
      ),
      renderApi(
        inputs.reference,
        model.path,
        model.apiScrolls,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        h,
      ),
      pageNavigation(model.path, h),
    ],
  )
}
