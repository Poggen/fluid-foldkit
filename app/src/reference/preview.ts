import { dataComponentCode } from '../playground/configs/data-components-code'
import { Match } from 'effect'
import type { ComponentPage } from '../../../lib/catalogue'
import type { PlaygroundConfiguration } from '../playground/configuration'
import { breadcrumbCode } from '../playground/configs/breadcrumb-code'
import { simpleCode } from '../playground/configs/simple-code'
import { cardCode } from '../playground/configs/card-code'
import { bannerCode } from '../playground/configs/banner-code'
import { comboboxCode } from '../playground/configs/combobox-code'
import { commandMenuCode } from '../playground/configs/command-menu-code'
import { inputMessageCode } from '../playground/configs/input-message-code'
import { dropdownCode } from '../playground/configs/dropdown-code'
import { calendarCode } from '../playground/configs/calendar-code'
import { datePickerCode } from '../playground/configs/date-picker-code'
import { askUserQuestionsCode } from '../playground/configs/ask-user-questions-code'
import { sidebarCode } from '../playground/configs/sidebar-code'

export const previewCode = (_page: ComponentPage, configuration: PlaygroundConfiguration): string =>
  Match.value(configuration).pipe(
    Match.tag('none', () => ''),
    Match.tag('code-block', 'context-menu', 'data-table', dataComponentCode),
    Match.tag('chart', (c) => `const previewOptions = ${JSON.stringify(c.options, null, 2)}`),
    Match.tag('breadcrumb', breadcrumbCode),
    Match.tag('card', cardCode),
    Match.tag('banner', bannerCode),
    Match.tag('combobox', comboboxCode),
    Match.tag('command-menu', commandMenuCode),
    Match.tag('input-message', inputMessageCode),
    Match.tag('dropdown', dropdownCode),
    Match.tag('calendar', calendarCode),
    Match.tag('date-picker', datePickerCode),
    Match.tag('ask-user-questions', askUserQuestionsCode),
    Match.tag('sidebar', sidebarCode),
    Match.orElse((c) => simpleCode(c) ?? ''),
  )
