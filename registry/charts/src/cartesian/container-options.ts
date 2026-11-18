import type { CartesianViewInputs } from './block'

export const containerOptions: (props: ContainerOptions) => ContainerOptions =
  function containerOptions(props: ContainerOptions) {
    let options: ContainerOptions = {}

    if (props.ariaDescription !== undefined) {
      options = { ...options, ariaDescription: props.ariaDescription }
    }

    if (props.className !== undefined) {
      options = { ...options, className: props.className }
    }

    if (props.width !== undefined) {
      options = { ...options, width: props.width }
    }

    if (props.height !== undefined) {
      options = { ...options, height: props.height }
    }

    return options
  }

type ContainerOptions = Pick<
  CartesianViewInputs<never>,
  'ariaDescription' | 'className' | 'width' | 'height'
>

export function drawingStyle(inputs: Pick<CartesianViewInputs<never>, 'width' | 'height'>) {
  return {
    ...(inputs.width === undefined ? {} : { '--bkm-drawing-width': `${inputs.width}px` }),
    ...(inputs.height === undefined ? {} : { '--bkm-drawing-height': `${inputs.height}px` }),
  }
}
