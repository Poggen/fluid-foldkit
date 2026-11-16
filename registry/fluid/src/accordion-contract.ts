import { HoverMode } from './hover-observation.js'
// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { HoverBlock } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import type { MotionOptions } from './motion.js'
import type { Presentation } from './presentation.js'
import {
  accordionFields,
  AccordionConfig,
  AccordionRootConfig,
  AccordionItemConfig,
} from './accordion-state.js'
import {
  accordionObservationFields,
  observeAccordion,
  AccordionRoots,
  AccordionRootsLayer,
} from './accordion-observer.js'
import type { AccordionContext } from './accordion-parts.js'

const Model = Schema.Struct({
  ...accordionFields,
  hover: HoverBlock.Model,
  highlightChild: HoverHighlightBlock.Model,
})

const Message = defineMessageUnion({
  ...accordionObservationFields,
  ActivatedDisclosure: { value: Schema.String },
  RequestedDisclosure: { value: Schema.String, isOpen: Schema.Boolean },
  CompletedTint: { value: Schema.String, generation: Schema.Natural, hover: Schema.Boolean },
  CompletedFocusTint: { generation: Schema.Natural },
})

const OutMessage = defineMessageUnion({ ValueChanged: { values: Schema.Array(Schema.String) } })

const effects = Block.makeEffectsContract()

const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  InformedOfValue: { value: Schema.Union([Schema.String, Schema.Array(Schema.String)]) },
  InformedOfRoot: { config: AccordionRootConfig },
  InformedOfItems: { items: Schema.Array(AccordionItemConfig) },
})

export const AccordionNamespace = Block.makeNamespace('Accordion')

export const Observe = AccordionNamespace.makeMountStream('ObserveAccordion', {
  messages: [
    Message.ObservedItems,
    Message.ObservedTriggers,
    Message.ObservedTriggerIds,
    Message.ObservedLayout,
    Message.ObservedFocus,
    Message.ObservedPointer,
    Message.CompletedPanel,
    Message.ObservedReducedMotion,
  ],
  *handler() {
    const roots = yield* AccordionRoots

    return ({ element, viewStateChanges }) => observeAccordion(element, viewStateChanges, roots)
  },
})

export const accordionContract = {
  Model,
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([AccordionConfig]),
  ChildInitContext: AccordionConfig,
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<AccordionViewInputs>(),
    mounts: [Observe],
  } satisfies {
    readonly kind: 'Element'
    readonly Inputs: unknown
    readonly mounts: readonly [typeof Observe]
  },
  effects,
}

export interface AccordionViewInputs extends Presentation {
  readonly content: (
    context: AccordionContext<ChildAttribute<Mount.RequirementsOf<typeof Observe>>>,
  ) => ReadonlyArray<Html>
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly animateHighlight: HoverHighlightViewInputs['animate']
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

export const AccordionEffectsLayer = Observe.layer.pipe(Layer.provide(AccordionRootsLayer))
