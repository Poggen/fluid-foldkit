import { Update } from 'foldkit'
import { makeFieldsStep, makeStep } from './block'
import { admitSidebarMenus, SidebarCalloutPresence } from './bindings'
import { ConfiguredSidebarComposition } from './composition'
import { reconcileSidebar, reconcilePresentation } from './reconciliation'

export const update = ConfiguredSidebarComposition.makeUpdate({
  ToggledSidebarSection: makeFieldsStep((model, { id, open }) => ({
    sidebarSections: () => ({ ...model.sidebarSections, [id]: open }),
  })),
  UpdatedSidebarAction: makeFieldsStep.fromMessage(({ action }) => ({
    sidebarAction: () => action,
  })),
  DismissedSidebarCallout: makeStep((model, { id }) =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        sidebarDismissedCallouts: () =>
          model.sidebarDismissedCallouts.includes(id)
            ? model.sidebarDismissedCallouts
            : [...model.sidebarDismissedCallouts, id],
      })),
      SidebarCalloutPresence.requestHide(id),
    ]),
  ),
  MeasuredSidebarCallout: makeFieldsStep((model, { height }) => ({
    sidebarCalloutHeight: () => (height > 0 ? height : model.sidebarCalloutHeight),
  })),
  HoveredSidebarCallouts: makeFieldsStep.fromMessage(({ hovered }) => ({
    sidebarCalloutsHovered: () => hovered,
  })),
  UpdatedThreadSearch: makeFieldsStep((_model, { value }) => ({
    threadSearch: () => value,
  })),
})

const reset = makeStep((model) =>
  Update.combineSteps([
    makeFieldsStep(() => ({
      sidebarDismissedCallouts: () => [],
      sidebarSections: () => ({ primary: true, secondary: true }),
      sidebarExpanded: () => ({}),
      sidebarAction: () => '',
    })),
    ...model.sidebarCalloutPresence.map((item) => SidebarCalloutPresence.requestShow(item.id)),
  ]),
)
export const inMessageUpdate = ConfiguredSidebarComposition.makeInMessageUpdate({
  InformedOfConfiguration: makeStep((_model, { configuration, presentation, edited, intent }) =>
    Update.combineSteps([
      ...(intent === 'reset' ? [reset] : []),
      admitSidebarMenus(configuration),
      reconcileSidebar(configuration, { ...presentation, ...configuration.appearance }, edited),
    ]),
  ),
  InformedOfPresentation: makeStep.fromMessage(({ presentation }) =>
    reconcilePresentation(presentation),
  ),
})
