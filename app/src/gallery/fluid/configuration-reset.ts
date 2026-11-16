import { Match } from 'effect'
import { Update } from 'foldkit'
import type { FluidConfiguration } from '../../playground/configuration'
import { buildQuestions } from '../../playground/configs/ask-user-questions'
import { FluidGalleryBlock } from './block'
import { Banner } from './core-bindings'
import { Ask, Composer } from './interactive-bindings'
import { composerConfiguration } from './composer-configuration'
export const resetConfiguration = (configuration: FluidConfiguration) =>
  FluidGalleryBlock.makeStep((model) =>
    Match.value(configuration).pipe(
      Match.tag('banner', () => Banner.requestReset()),
      Match.tag('card', () =>
        FluidGalleryBlock.makeFieldsStep(() => ({
          cardSelectedIndex: () => 0,
          cardDismissedIndices: () => [],
        })),
      ),
      Match.tag('input-message', () =>
        Update.combineSteps([
          FluidGalleryBlock.makeFieldsStep(() => ({
            composerHistory: () => ['Make my input box feel less stiff'],
          })),
          Composer.requestConfigure({
            ...composerConfiguration(model.composer),
            value: '',
            files: [],
            queue: [],
          }),
        ]),
      ),
      Match.tag('ask-user-questions', (c) =>
        Ask.requestReset({ config: { questions: buildQuestions(c) } }),
      ),
      Match.tag('dropdown', () =>
        FluidGalleryBlock.makeFieldsStep(() => ({
          dropdownCreatedItems: () => [],
          dropdownQuery: () => '',
          dropdownTheme: () => 'System',
          dropdownSelectedValues: () => ['Email'],
        })),
      ),
      Match.orElse(() => FluidGalleryBlock.makeNoopStep()),
    ),
  )
