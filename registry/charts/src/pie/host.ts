import type { PolarHost } from './private/block'
import { mountPolar } from './private/host'
import type { PolarFrame, ConfigurablePolarHost } from './private/host'
import { createSpringDriver } from './private/spring-driver'
import { buildPieCss, createPieHoverSprings, pieHoverVars } from './private/hover'
import type { PieChartProps, PieData } from './options'
import type { PieArcRow } from './arc'
import { createPieEntranceRenderer } from './entrance-renderer'
import { buildPieDefinition, pieGeometry } from './definition'

export class PieHost implements PolarHost<PieData> {
  readonly #host: ConfigurablePolarHost<PieData, PieArcRow>
  readonly #entrance = createPieEntranceRenderer()
  readonly #driver: ReturnType<typeof createSpringDriver>
  #focused: number | null
  #props: PieChartProps
  #hover: PolarFrame<PieData, PieArcRow>['hover'] | undefined
  #style: HTMLStyleElement | undefined
  readonly #containerRef: { current: HTMLDivElement | null }
  readonly #id: string
  constructor(
    element: HTMLElement,
    props: PieChartProps,
    id: string,
    data: ReadonlyArray<PieData>,
    focused: number | null,
    observe: (index: number | null) => void,
    clock: () => number,
    observeSize: (size: number) => void,
    containerRef: { current: HTMLDivElement | null },
  ) {
    this.#driver = createSpringDriver(clock)
    this.#containerRef = containerRef
    this.#props = props
    this.#focused = focused
    this.#id = id
    this.#host = mountPolar(element, data, focused, observe, clock, this.#frame(), observeSize)
  }
  #frame() {
    const props = this.#props
    const id = this.#id

    const frame: PolarFrame<PieData, PieArcRow> = {
      family: 'pie',
      scrubbing: props.geometryScrubbing ?? false,
      indexOf: (r) => r.sliceIndex,
      definition: (data, size) => {
        const definition = {
          definition: buildPieDefinition({ ...props, data }, size, id),
          renderer: this.#entrance.renderer,
          ariaLabel: props.ariaLabel ?? 'Pie chart',
          idPrefix: id,
        }

        return props.ariaDescription === undefined
          ? definition
          : { ...definition, ariaDescription: props.ariaDescription }
      },
      geometry: (root, data, size) => {
        if (root instanceof HTMLDivElement) {
          this.#containerRef.current = root
        }

        const g = pieGeometry({ ...props, data }, size, id)
        this.#entrance.configure(g, props, this.#focused)

        if (this.#style === undefined) {
          this.#style = document.createElement('style')
          root.append(this.#style)
        }

        root.dataset.bkmPieScope = id
        this.#style.textContent = buildPieCss(
          0.4,
          g.rows,
          `[data-bkm-pie-scope="${CSS.escape(id)}"]`,
        )

        const geometry = {
          isDonut: g.innerRadius >= 1,
          outerRadius: g.outerRadius,
          pathAt: g.pathAt,
        }

        const vars = pieHoverVars(g.rows, geometry)

        const previousStyles = [...root.style]

        for (const key of previousStyles) {
          if (
            key.startsWith('--bkm-tf') ||
            key.startsWith('--bkm-gd') ||
            key.startsWith('--bkm-glow')
          ) {
            root.style.removeProperty(key)
          }
        }

        for (const [key, value] of Object.entries(vars.vars)) {
          root.style.setProperty(key, value)
        }

        if (vars.grow) {
          root.dataset.bkmGrow = vars.grow
        } else {
          delete root.dataset.bkmGrow
        }

        this.#hover = createPieHoverSprings(g.rows, this.#driver)
        root.querySelector('[data-polar-resources]')?.remove()
        const resources = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        resources.dataset.polarResources = ''
        resources.setAttribute('aria-hidden', 'true')
        resources.setAttribute('class', 'h-0 overflow-hidden pointer-events-none absolute w-0')
        const defs = document.createElementNS(resources.namespaceURI, 'defs')

        for (const child of props.children) {
          if (child.kind === 'resource') {
            defs.append(child.render(id))
          }
        }

        resources.append(defs)
        root.append(resources)
      },
      hover: (root, previous, next) => {
        this.#hover?.(root, previous, next)
        this.#entrance.hover(next)
      },
      centers: (data, _size, index) =>
        (props.innerRadius ?? 0) <= 0
          ? []
          : props.children.flatMap((child) => {
              if (child.kind !== 'center') {
                return []
              }

              const datum =
                props.geometryScrubbing === true || index === null ? undefined : data[index]

              return [
                {
                  options: child.props,
                  radius: props.innerRadius ?? 0,
                  value: datum?.value ?? data.reduce((a, d) => a + d.value, 0),
                  label: datum?.label ?? child.props.defaultLabel ?? 'Total',
                  custom: datum !== undefined && child.props.children !== undefined,
                },
              ]
            }),
      cleanup: () => {
        this.#containerRef.current = null
        this.#driver.destroy()
      },
    }

    const sized = props.size === undefined ? frame : { ...frame, size: props.size }
    const named = props.className === undefined ? sized : { ...sized, className: props.className }
    const styled = props.style === undefined ? named : { ...named, style: props.style }

    return (
      props.onHoverChange === undefined ? styled : { ...styled, onHoverChange: props.onHoverChange }
    ) satisfies PolarFrame<PieData, PieArcRow>
  }
  configure(props: PieChartProps) {
    if (props === this.#props) {
      return
    }

    this.#props = props
    this.#host.configure(this.#frame())
  }
  update(data: ReadonlyArray<PieData>, focused: number | null) {
    this.#focused = focused
    this.#host.update(data, focused)
  }
  destroy() {
    this.#host.destroy()
  }
}
