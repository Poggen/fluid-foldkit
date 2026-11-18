import type { Html, HtmlBuilder } from 'foldkit/html'

/** Native presentation uses the actual parent's builder, including its message scope. */
export const ChartLoadingLabel: <Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  argument1?: ChartLoadingLabelProps,
) => Html = function ChartLoadingLabel<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  { text = 'Loading', className, exiting = false }: ChartLoadingLabelProps = {},
) {
  if (!text.trim()) {
    return h.empty satisfies Html
  }

  return h.output(
    [
      h.Class(
        className === undefined
          ? 'ts-bkm-loading-label-wrap [transition:transform_0.45s_cubic-bezier(0.85,_0,_0.15,_1),_opacity_0.45s_cubic-bezier(0.85,_0,_0.15,_1),_filter_0.45s_cubic-bezier(0.85,_0,_0.15,_1)] data-[hidden]:hidden data-[exiting]:[transform:translateY(30px)] data-[exiting]:opacity-0 data-[exiting]:[filter:blur(2px)]'
          : `ts-bkm-loading-label-wrap [transition:transform_0.45s_cubic-bezier(0.85,_0,_0.15,_1),_opacity_0.45s_cubic-bezier(0.85,_0,_0.15,_1),_filter_0.45s_cubic-bezier(0.85,_0,_0.15,_1)] data-[hidden]:hidden data-[exiting]:[transform:translateY(30px)] data-[exiting]:opacity-0 data-[exiting]:[filter:blur(2px)] ${className}`,
      ),
      h.DataAttribute('slot', 'loading-label'),
      h.Attribute('aria-live', 'polite'),
      ...(exiting ? [h.DataAttribute('exiting', '')] : []),
    ],
    [
      h.style([], [charKeyframes(text.length)]),
      h.span(
        [h.Class('ts-bkm-loading-label-text select-none')],
        [
          ...text.split('').map((char, index) =>
            h.span(
              [
                h.Attribute('aria-hidden', 'true'),
                h.Class(
                  'ts-bkm-loading-label-char [animation:var(--bkm-label-animation)] [animation-delay:var(--bkm-label-delay)]',
                ),
                h.Style({
                  '--bkm-label-animation': `bkm-label-char-${text.length} ${1 + text.length * 0.05}s infinite`,
                  '--bkm-label-delay': `${index / text.length}s`,
                }),
              ],
              [char],
            ),
          ),
          h.span(
            [
              h.Class(
                'absolute [width:1px] [height:1px] [margin:-1px] [padding:0] overflow-hidden [clip-path:inset(50%)] whitespace-nowrap [border:0]',
              ),
            ],
            [text],
          ),
        ],
      ),
    ],
  ) satisfies Html
}

const charKeyframes: (length: number) => string = function charKeyframes(length: number) {
  const cycle = 1 + length * 0.05
  const end = (1 / cycle) * 100

  return `@keyframes bkm-label-char-${length}{0%{color:var(--bkm-label-color);animation-timing-function:ease-in-out}${end / 2}%{color:var(--bkm-shimmer-color);animation-timing-function:ease-in-out}${end}%,100%{color:var(--bkm-label-color)}}`
}

export interface ChartLoadingLabelProps {
  readonly text?: string
  readonly className?: string
  readonly exiting?: boolean
}
