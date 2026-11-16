export interface ContainerRef {
  current: HTMLDivElement | null
}

export const createContainerRef = (): ContainerRef => ({ current: null })
