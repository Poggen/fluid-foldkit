import { ThinkingStepSource, ThinkingStepSources } from '@foldkit-visuals/fluid/thinking-step/parts'
import { motion, target } from '../../motion'
import type { FluidViewBuilder } from './composition'
import { Analysis, Portfolio, PortfolioDetails, Profile, Recent, Steps } from './details-bindings'

import type { FluidGalleryInputs, FluidGalleryModel } from './block'

import { demoPresentation } from './render-presentation'

export const renderThinkingSteps = (
  steps: FluidGalleryModel['steps'],
  profile: FluidGalleryModel['profile'],
  portfolio: FluidGalleryModel['portfolio'],
  portfolioDetails: FluidGalleryModel['portfolioDetails'],
  recent: FluidGalleryModel['recent'],
  analysis: FluidGalleryModel['analysis'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.div(
    [h.Class('w-full max-w-[380px]')],
    [
      h.block(
        Steps.embedView({
          slotId: 'steps',
          model: steps,
          viewInputs: {
            context,
            animate: target.node,
            label: () => 'Research Agent',
            content: () => [
              h.block(
                Profile.embedView({
                  slotId: 'profile',
                  model: profile,
                  viewInputs: {
                    context,
                    animate: target.node,
                    label: 'Searching profiles',
                    icon: 'search',
                    children: () => [
                      ThinkingStepSources(
                        {
                          children: ['x.com', 'github.com'].map((text) =>
                            ThinkingStepSource(
                              { context, animate: motion.node, children: [text] },
                              h,
                            ),
                          ),
                        },
                        h,
                      ),
                    ],
                  },
                }),
              ),
              h.block(
                Portfolio.embedView({
                  slotId: 'portfolio',
                  model: portfolio,
                  viewInputs: {
                    context,
                    animate: target.node,
                    label: 'Reading portfolio',
                    icon: 'globe',
                    children: () => [
                      h.block(
                        PortfolioDetails.embedView({
                          slotId: 'portfolio-details',
                          model: portfolioDetails,
                          viewInputs: {
                            context,
                            animate: target.node,
                            label: () => 'Explored 4 pages',
                            content: () =>
                              ['about.html', 'projects.html', 'resume.pdf', 'contact.html'].map(
                                (text) => h.p([], ['Read ' + text]),
                              ),
                          },
                        }),
                      ),
                    ],
                  },
                }),
              ),
              h.block(
                Recent.embedView({
                  slotId: 'recent',
                  model: recent,
                  viewInputs: {
                    context,
                    animate: target.node,
                    label: 'Searching recent work',
                    icon: 'search',
                    children: () => [
                      ThinkingStepSources(
                        {
                          children: ['figma.com', 'behance.net'].map((text) =>
                            ThinkingStepSource(
                              { context, animate: motion.node, children: [text] },
                              h,
                            ),
                          ),
                        },
                        h,
                      ),
                    ],
                  },
                }),
              ),
              h.block(
                Analysis.embedView({
                  slotId: 'analysis',
                  model: analysis,
                  viewInputs: {
                    context,
                    animate: target.node,
                    label: 'Analyzing results',
                    description: 'Compiling findings into a summary.',
                    icon: 'brain',
                    isLast: true,
                  },
                }),
              ),
            ],
          },
        }),
      ),
    ],
  )
}
