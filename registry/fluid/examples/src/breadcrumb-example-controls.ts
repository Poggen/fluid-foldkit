import type { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import { BooleanSetting, selectSettings } from './breadcrumb-example-data.js'
import { Button } from '@foldkit-visuals/fluid/button'
import type { BreadcrumbExampleComposition, Model } from './breadcrumb-example-block.js'
import { Message, Selects, Switches, switchMotion, motion } from './breadcrumb-example-block.js'

type Builder = Block.ViewBuilderFor<typeof BreadcrumbExampleComposition>

export const playgroundControls = (model: typeof Model.Type, h: Builder): Html => {
  const toggleLabels = {
    icons: 'Icons',
    dropdownStep: 'Dropdown on a step',
    openOnHover: 'Open menus on hover',
    longName: 'Long step name',
  }

  return h.aside(
    [h.Class('[border:1px_solid_var(--border)] rounded-[12px] p-3 flex flex-col gap-2')],
    [
      h.div(
        [h.Class('flex justify-between items-center gap-2 text-[12px] min-h-7 [&_button]:p-1')],
        [
          h.strong([], ['Trail']),
          Button(
            {
              variant: 'ghost',
              size: 'compact',
              shape: model.shape,
              attributes: [h.AriaLabel('Shuffle'), h.OnClick(Message.ClickedShuffle())],
              children: ['Shuffle'],
            },
            h,
          ),
        ],
      ),
      ...selectSettings.map(({ key, label }) => {
        const child = model.selects[key]
        return child === undefined
          ? h.empty
          : h.div(
              [h.Class('flex justify-between items-center gap-2 text-[12px] min-h-7')],
              [
                h.span([h.Class('text-muted-foreground')], [label]),
                h.block(
                  Selects.embedView({
                    key,
                    slotId: child.id,
                    model: child,
                    viewInputs: {
                      shape: model.shape,
                      size: model.docSize,
                      hoverMode: model.mode,
                      variant: 'borderless',
                      ariaLabel: label,
                      className: 'relative z-10 min-w-0 w-auto px-2 text-body',
                      animate: motion.node,
                    },
                  }),
                ),
              ],
            )
      }),
      h.hr([]),
      h.strong([], ['Steps']),
      ...BooleanSetting.literals.map((key) => {
        const child = model.switches[key]

        if (!child) {
          return h.empty
        }

        return h.block(
          Switches.embedView({
            key,
            slotId: `switch-${key}`,
            model: child,
            viewInputs: {
              label: toggleLabels[key],
              shape: model.shape,
              className: 'w-full min-h-7 flex-row-reverse justify-between px-2',
              animate: switchMotion.node,
            },
          }),
        )
      }),
    ],
  )
}
