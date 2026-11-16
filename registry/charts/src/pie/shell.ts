import { polarServerView } from './private/server'
import { inertHtml as h } from 'foldkit/html'
import type { PolarInputs, PolarHost } from './private/block'
import { polarRecipe } from './private/block'
import { PieData } from './options'
import type { PieCenterShellProps } from './options'
import { createPolarCenter } from './private/center'

class ShellHost implements PolarHost<PieData> {
  readonly #center = createPolarCenter()
  #props: PieCenterShellProps
  #data: ReadonlyArray<PieData>
  #intro: boolean
  readonly #frame: number = 0
  constructor(element: HTMLElement, props: PieCenterShellProps, data: ReadonlyArray<PieData>) {
    this.#props = props
    this.#data = data
    this.#intro = props.animateEntrance !== false
    const host = document.createElement('div')
    host.dataset.bkmChart = 'pie'
    host.dataset.slot = 'chart'
    host.classList.add('contents')
    element.append(host)
    host.append(this.#center.node)
    this.update(data)
    this.#center.commit()

    if (this.#intro) {
      this.#frame = requestAnimationFrame(() => {
        this.#intro = false
        this.update(this.#data)
      })
    }
  }
  configure(props: PieCenterShellProps) {
    this.#props = props
    this.update(this.#data)
  }
  update(data: ReadonlyArray<PieData>) {
    this.#data = data
    this.#center.update(
      this.#props,
      this.#props.innerRadiusPx,
      this.#intro ? 0 : (data[0]?.value ?? this.#props.centerValue),
      this.#props.defaultLabel ?? 'Total',
    )

    if (this.#props.innerRadiusPx <= 0) {
      this.#center.node.classList.add('hidden')
    }
  }
  destroy() {
    cancelAnimationFrame(this.#frame)
    this.#center.node.parentElement?.remove()
    this.#center.destroy()
  }
}

export function PieCenterShell({ name }: { readonly name: string }) {
  return {
    ...polarRecipe({ name, Row: PieData }),
    inputs: (_id: string, props: PieCenterShellProps): PolarInputs<PieData> => ({
      layout: 'contents',
      size: props.contextSize,
      serverContent: (data) =>
        polarServerView(
          'pie',
          undefined,
          undefined,
          props.innerRadiusPx <= 0
            ? []
            : [
                {
                  options: props,
                  radius: props.innerRadiusPx,
                  value:
                    props.animateEntrance === false ? (data[0]?.value ?? props.centerValue) : 0,
                },
              ],
          {},
          true,
        ),
      mount: (element, data) => new ShellHost(element, props, data),
      configure: (host) => {
        if (!(host instanceof ShellHost)) {
          throw new TypeError('Pie shell requires its native host')
        }

        host.configure(props)
      },
      customContent: () => h.empty,
    }),
  }
}
