import type { NativeContent } from './content'
import type { SunburstStableContextValue } from './context'
import type { Focus } from './arcs'
import type { SunburstCarrier } from './carriers'

export interface SunburstBreadcrumbItem {
  id: string
  label: string
  isCurrent: boolean
}

export interface SunburstBreadcrumbProps {
  className?: string
  children: NativeContent | ((context: SunburstStableContextValue) => NativeContent)
}

export const SunburstBreadcrumb = (props: SunburstBreadcrumbProps): SunburstCarrier => ({
  role: 'breadcrumb',
  props,
})

export function useSunburstBreadcrumbItems<Action>(context: SunburstStableContextValue<Action>) {
  const crumbs: Array<Focus> = []
  let current: Focus | undefined = context.focus

  while (current !== undefined) {
    crumbs.unshift(current)
    current = current.parentId === null ? undefined : context.focusById.get(current.parentId)
  }

  return {
    items: crumbs.map((crumb, index): SunburstBreadcrumbItem => ({
      id: crumb.id,
      isCurrent: index === crumbs.length - 1,
      label: crumb.id === context.rootId ? context.data.name : crumb.name,
    })),
    zoomTo: context.zoomTo,
  }
}
