import { Option } from 'effect'
import { Update } from 'foldkit'
import {
  breadcrumbChoices,
  dropdownIndex,
  visibleItems,
  type Configuration,
} from '../../playground/configs/breadcrumb'
import { FluidGalleryBlock } from './block'
import { Breadcrumb, CrumbMenu } from './details-bindings'
export const reconcileBreadcrumb = (configuration: Configuration) =>
  FluidGalleryBlock.makeStep((model) => {
    const items = visibleItems(configuration)
    const item = items[dropdownIndex(configuration)]
    const index = item === undefined ? -1 : breadcrumbChoices.indexOf(item.label)
    const selection = index < 0 ? null : index
    return Update.combineSteps([
      ...(model.breadcrumb.count === items.length
        ? []
        : [Breadcrumb.requestCount({ count: items.length })]),
      ...(model.breadcrumb.collapse === configuration.collapse
        ? []
        : [
            Breadcrumb.requestExpanded({ expanded: false }),
            Breadcrumb.requestCollapse({ collapse: configuration.collapse }),
          ]),
      ...(model.crumbSection === selection
        ? []
        : [
            FluidGalleryBlock.makeFieldsStep(() => ({ crumbSection: () => selection })),
            CrumbMenu.requestSelection({
              selection: {
                checkedIndex: Option.fromNullOr(selection),
                checkedIndices: Option.none(),
              },
            }),
          ]),
    ])
  })
