import { chartStyleText } from '../../cartesian/style'
import { inertHtml as h } from 'foldkit/html'
import { formatToData } from 'number-flow/lite'
import { numberServerView } from '../../gauge/number-server'
import { defaultCenterStatFormat } from './center'
import type { CenterOptions } from './center'

export function polarServerView(
  family: 'pie' | 'ring',
  size: number | undefined,
  className: string | undefined,
  centers: ReadonlyArray<{
    readonly options: CenterOptions
    readonly radius: number
    readonly value: number
  }>,
  style: Readonly<Record<string, string | number>> = {},
  contents = false,
) {
  const fixed = size !== undefined && size !== 0

  return h.div(
    [
      h.Class(
        [
          contents ? 'contents' : 'items-center flex justify-center relative',
          fixed ? '' : '[aspect-ratio:1_/_1] w-full',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' '),
      ),
      h.DataAttribute('bkm-chart', family),
      h.DataAttribute('slot', 'chart'),
      h.Attribute(
        'style',
        chartStyleText(
          contents
            ? {}
            : {
                ...(fixed ? { width: `${size}px`, height: `${size}px` } : {}),
                ...style,
              },
        ),
      ),
    ],
    [
      h.div(
        [
          h.Class(
            contents
              ? 'contents'
              : 'items-center flex inset-0 justify-center pointer-events-none absolute',
          ),
        ],
        centers.map(({ options, radius, value }) => {
          const side = radius * 2 - 16

          return h.div(
            [
              h.Class(
                [
                  'items-center flex justify-center flex-col text-center',
                  [
                    'ts-bkm-center-stat [[data-bkm-chart]_&]:[width:var(--bkm-center-side,100%)] [[data-bkm-chart]_&]:[height:var(--bkm-center-side,100%)]',
                    options.className ?? '',
                  ]
                    .filter(Boolean)
                    .join(' '),
                ]
                  .filter(Boolean)
                  .join(' '),
              ),
              h.DataAttribute('slot', 'center-stat'),
              h.Style({
                '--bkm-center-side': Number.isFinite(side) && side >= 0 ? `${side}px` : '100%',
              }),
            ],
            [
              h.span(
                [h.Class(options.valueClassName ?? 'ts-bkm-center-stat-value')],
                [
                  numberServerView(
                    h,
                    formatToData(
                      value,
                      new Intl.NumberFormat(
                        undefined,
                        options.formatOptions ?? defaultCenterStatFormat,
                      ),
                      options.prefix,
                      options.suffix,
                    ),
                  ),
                ],
              ),
              h.span(
                [h.Class(options.labelClassName ?? 'ts-bkm-center-stat-label')],
                [options.defaultLabel ?? 'Total'],
              ),
            ],
          )
        }),
      ),
    ],
  )
}
