import { expect, test } from 'vitest'
import { Option, Schema } from 'effect'
import ts from 'typescript-api'
import * as Card from './configs/card'
import * as Banner from './configs/banner'
import * as Composer from './configs/input-message'
import * as Command from './configs/command-menu'
import * as Combo from './configs/combobox'
import * as Dropdown from './configs/dropdown'
import { cardCode } from './configs/card-code'
import { bannerCode } from './configs/banner-code'
import { inputMessageCode } from './configs/input-message-code'
import { commandMenuCode } from './configs/command-menu-code'
import { comboboxCode } from './configs/combobox-code'
import { dropdownCode } from './configs/dropdown-code'
import { updateConfiguration, serializeConfiguration, decodeConfiguration } from './configuration'

test('source composition defaults survive edits and URL round trips', () => {
  for (const page of [
    {
      defaults: Card.defaults,
      controls: Card.controlsFor(Card.defaults),
      isValid: Schema.is(Card.Configuration),
    },
    {
      defaults: Banner.defaults,
      controls: Banner.controlsFor(Banner.defaults),
      isValid: Schema.is(Banner.Configuration),
    },
    {
      defaults: Composer.defaults,
      controls: Composer.controlsFor(Composer.defaults),
      isValid: Schema.is(Composer.Configuration),
    },
    {
      defaults: Command.defaults,
      controls: Command.controlsFor(Command.defaults),
      isValid: Schema.is(Command.Configuration),
    },
    {
      defaults: Combo.defaults,
      controls: Combo.controlsFor(Combo.defaults),
      isValid: Schema.is(Combo.Configuration),
    },
    {
      defaults: Dropdown.defaults,
      controls: Dropdown.controlsFor(Dropdown.defaults),
      isValid: Schema.is(Dropdown.Configuration),
    },
  ]) {
    expect(page.isValid(page.defaults)).toBe(true)
    expect(Option.getOrThrow(decodeConfiguration(serializeConfiguration(page.defaults)))).toEqual(
      page.defaults,
    )
    for (const control of page.controls) {
      const candidate =
        control.kind === 'toggle'
          ? !control.initial
          : control.kind === 'choice' || control.kind === 'text'
            ? (control.values.at(-1) ?? control.initial)
            : control.max
      const changed = updateConfiguration(page.defaults, control.prop, candidate)
      expect(page.isValid(changed)).toBe(true)
      expect(Option.getOrThrow(decodeConfiguration(serializeConfiguration(changed)))).toEqual(
        changed,
      )
    }
  }
})
test('card constraints preserve raw settings while changing effective layout', () => {
  const config = {
    ...Card.defaults,
    columns: 3 as const,
    cardOrientation: 'inline' as const,
    media: 'image' as const,
  }
  expect(Card.columnsOf(config)).toBe(1)
  expect(Card.separatedOf(config)).toBe(true)
  expect(Card.controlsFor(config).find((control) => control.prop === 'columns')?.enabled).toBe(
    false,
  )
  expect(Card.controlsFor(config).find((control) => control.prop === 'separated')?.enabled).toBe(
    false,
  )
  expect(config.columns).toBe(3)
  expect(config.separated).toBe(false)
})
test('dropdown search preserves stable row identity and permits only unique creation', () => {
  const config = { ...Dropdown.defaults, search: true, creatable: true }
  const created = [{ value: 'Invoices', label: 'Invoices' }]
  expect(Dropdown.visibleRows(config, created, 'voice').map((row) => row.value)).toEqual([
    'Invoices',
  ])
  expect(Dropdown.canCreate(config, created, '  INVOICES ')).toBe(false)
  expect(Dropdown.canCreate(config, created, 'Projects')).toBe(true)
  expect(Dropdown.canCreate({ ...config, mode: 'inline' }, created, 'Projects')).toBe(false)
})
test('every generated native configuration parses and contains its selected composition', () => {
  const cases = [
    cardCode({ ...Card.defaults, media: 'image', primaryBtn: true }),
    bannerCode({ ...Banner.defaults, variant: 'fixed', ghost: true }),
    inputMessageCode({ ...Composer.defaults, status: 'streaming', rightSlot: true }),
    commandMenuCode({ ...Command.defaults, filters: true }),
    comboboxCode({ ...Combo.defaults, creatable: true, icon: true, error: true }),
    dropdownCode({ ...Dropdown.defaults, search: true, creatable: true, groups: true }),
  ]
  for (const source of cases) {
    const result = ts.transpileModule(source, {
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    })
    expect(
      result.diagnostics?.filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
      ),
    ).toEqual([])
    expect(source).not.toMatch(/from ['"]react['"]|useState|useEffect/)
  }
  expect(cases[0]).toContain('CardImage(')
  expect(cases[1]).toContain("variant: 'fixed'")
  expect(cases[2]).toContain("status: 'streaming'")
  expect(cases[3]).toContain('SelectBlock')
  expect(cases[4]).toContain('requestAcceptCreated')
  expect(cases[5]).toContain('DropdownSearch(')
})

test('command menu composes type, sort, row metadata, and suggestions independently', () => {
  const config = {
    ...Command.defaults,
    filters: true,
    suggestions: false,
    descriptions: false,
    shortcuts: false,
  }
  const rows = Command.commandRows(config, 'all', 'Actions', 'az', '')
  expect(rows.length).toBeGreaterThan(1)
  expect(rows.every((row) => row.group === 'Actions')).toBe(true)
  expect(rows.map((row) => row.label)).toEqual(
    rows.map((row) => row.label).sort((a, b) => a.localeCompare(b)),
  )
  expect(rows.every((row) => row.description === undefined && row.shortcut === undefined)).toBe(
    true,
  )
  const suggested = Command.commandRows(
    { ...config, suggestions: true },
    'all',
    'all',
    'default',
    '',
  )
  expect(suggested[0]?.group).toBe('Suggestions')
  expect(new Set(suggested.map((row) => row.value)).size).toBe(suggested.length)
  expect(
    Command.commandRows({ ...config, suggestions: true }, 'all', 'all', 'default', 'query').every(
      (row) => row.group !== 'Suggestions',
    ),
  ).toBe(true)
})

test('all source rail control families remain represented', () => {
  const properties = (controls: ReadonlyArray<{ readonly prop: string }>) =>
    controls.map((control) => control.prop)
  expect(properties(Card.controls)).toEqual(
    expect.arrayContaining([
      'media',
      'description',
      'primaryBtn',
      'secondaryBtn',
      'ghostBtn',
      'cardOrientation',
      'columns',
      'border',
      'separated',
      'fluidHover',
      'selected',
    ]),
  )
  expect(properties(Banner.controls)).toEqual(
    expect.arrayContaining([
      'variant',
      'status',
      'contrast',
      'description',
      'primary',
      'secondary',
      'ghost',
      'dismissible',
    ]),
  )
  expect(properties(Composer.controls)).toEqual(
    expect.arrayContaining([
      'suggestion',
      'suggestionsOn',
      'historyOn',
      'attachments',
      'minRows',
      'disabled',
      'leftSlot',
      'rightSlot',
      'status',
    ]),
  )
  expect(properties(Command.controls)).toEqual(
    expect.arrayContaining([
      'shortcut',
      'descriptions',
      'shortcuts',
      'suggestions',
      'tabs',
      'filters',
      'footer',
    ]),
  )
  expect(properties(Combo.controls)).toEqual(
    expect.arrayContaining([
      'multiple',
      'creatable',
      'hideSelected',
      'variant',
      'icon',
      'clearable',
      'error',
      'disabled',
    ]),
  )
  expect(properties(Dropdown.controls)).toEqual(
    expect.arrayContaining([
      'mode',
      'selection',
      'search',
      'creatable',
      'icons',
      'groups',
      'disabledRow',
      'submenu',
    ]),
  )
})
