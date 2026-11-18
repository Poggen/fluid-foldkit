import { expect, test } from '@playwright/test'
import { expectUpstreamHomeTable } from './component-delta-home-fixture'

test('CodeBlock keeps exact clipboard text through live line, wrapping and header changes', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          sessionStorage.setItem('delta-code-copy', text)
          return Promise.resolve()
        },
      },
    })
  })
  await page.goto('/components/code-block')
  const playground = page.getByRole('region', { name: 'Playground', exact: true })
  const preview = playground.locator('.reference-preview')
  const props = page.getByRole('complementary', { name: 'CodeBlock props' })
  const code = `const value = '<img src=x onerror=alert(1)>' ${'// long line '.repeat(24)}`
  await props.getByRole('textbox', { name: /^Code(?: text)?$/i }).fill(code)
  await expect(preview.locator('pre')).toContainText(code)
  await expect(preview.locator('img')).toHaveCount(0)
  await preview.getByRole('button', { name: 'Copy code', exact: true }).click()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('delta-code-copy'))).toBe(code)
  await expect(preview.getByRole('status')).toHaveText('Copied')
  await props.getByRole('switch', { name: 'Wrap', exact: true }).click()
  await expect
    .poll(() =>
      preview.locator('pre').evaluate((element) => {
        const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight)
        return element.getBoundingClientRect().height / lineHeight
      }),
    )
    .toBeGreaterThan(2)
  await props.getByRole('switch', { name: 'Hide header', exact: true }).click()
  await expect(preview.locator('.code-block-filename')).toHaveCount(0)
  const updated = `${code} // copied after header change`
  await props.getByRole('textbox', { name: /^Code(?: text)?$/i }).fill(updated)
  await expect(preview.locator('pre')).toContainText(updated)
  await preview.getByRole('button', { name: 'Copy code', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('delta-code-copy')))
    .toBe(updated)
  await props.getByRole('switch', { name: 'Line numbers', exact: true }).click()
  await expect(preview.locator('[data-code-line]')).toHaveCount(0)
  await expect(preview.locator('pre')).toHaveText(updated)
})

test('ContextMenu uses pointer and keyboard origins, returns focus and respects disabled items', async ({
  page,
}) => {
  await page.goto('/components/context-menu')
  const preview = page
    .getByRole('region', { name: 'Playground', exact: true })
    .locator('.reference-preview')
  const trigger = preview.getByText('Right-click here', { exact: true })
  await trigger.scrollIntoViewIfNeeded()
  const origin = await trigger.boundingBox()
  if (origin === null) throw new Error('Context menu trigger has no layout box')
  const pointer = { x: origin.width - 4, y: 8 }
  await trigger.click({ button: 'right', position: pointer })
  const menu = page.getByRole('menu').filter({ has: page.getByRole('menuitem', { name: /^Open/ }) })
  await expect(menu).toBeVisible()
  await expect
    .poll(async () => {
      const box = await menu.boundingBox()
      if (box === null) return Infinity
      const clickX = origin.x + pointer.x
      return Math.min(Math.abs(box.x - clickX), Math.abs(box.x + box.width - clickX))
    })
    .toBeLessThan(32)
  const popup = await menu.boundingBox()
  const viewport = page.viewportSize()
  if (popup === null || viewport === null) throw new Error('Missing popup or viewport dimensions')
  expect(popup.x).toBeGreaterThanOrEqual(0)
  expect(popup.x + popup.width).toBeLessThanOrEqual(viewport.width)
  expect(popup.y + popup.height).toBeLessThanOrEqual(viewport.height)
  await expect(menu.getByRole('menuitem', { name: /^Delete/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await menu.getByRole('menuitem', { name: /^Duplicate/ }).click()
  await expect(preview.getByText('Duplicate selected', { exact: true })).toBeVisible()
  await expect(menu).toHaveCount(0)
  await trigger.focus()
  await trigger.press('Shift+F10')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /^Open/ })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.press('Shift+F10')
  await expect(menu).toBeVisible()
  const open = menu.getByRole('menuitem', { name: /^Open/ })
  await expect(open).toBeFocused()
  await page.keyboard.press('Home')
  await expect(open).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(preview.getByText('Open selected', { exact: true })).toBeVisible()
  await page
    .getByRole('complementary', { name: 'ContextMenu props' })
    .getByRole('switch', { name: 'Disabled', exact: true })
    .click()
  await trigger.click({ button: 'right' })
  await expect(menu).toHaveCount(0)
  await trigger.focus()
  await trigger.press('Shift+F10')
  await expect(menu).toHaveCount(0)
})

test('DataTable applies explicit ascending and descending sorting', async ({ page }) => {
  await page.goto('/components/data-table')
  const sort = page.locator('[data-fluid-data-table]#docs-data-table-sort')
  const firstAmount = sort.locator('tbody tr').first().locator('td[data-grid-column="amount"]')
  await sort.getByRole('button', { name: 'Amount', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sort ascending', exact: true }).click()
  await expect(sort.locator('thead th[data-grid-column="amount"]')).toHaveAttribute(
    'aria-sort',
    'ascending',
  )
  const ascending = await firstAmount.innerText()
  await sort.getByRole('button', { name: 'Amount', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sort descending', exact: true }).click()
  await expect(firstAmount).not.toHaveText(ascending)
})

test('DataTable searches, edits and restores cell history through real keyboard events', async ({
  page,
}) => {
  await page.goto('/components/data-table')
  const search = page.locator('[data-fluid-data-table]#docs-data-table-search')
  await search.getByRole('searchbox').fill('no-such-payment-419')
  await expect(search.getByRole('cell', { name: 'No results', exact: true })).toContainText(
    'No results',
  )
  await search.getByRole('searchbox').fill('')
  await expect(search.locator('tbody tr').first()).toBeVisible()
  const cell = search.locator('tbody tr').first().locator('td[data-grid-column="email"]')
  const original = await cell.innerText()
  await cell.click()
  const editor = search.getByRole('textbox', { name: /^Email for / })
  await editor.fill('changed@example.com')
  await editor.press('Enter')
  await expect(cell).toHaveText('changed@example.com')
  await search.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(cell).toHaveText(original)
  await search.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(cell).toHaveText('changed@example.com')
})

test('DataTable applies, saves, renames and deletes native tab views', async ({ page }) => {
  await page.goto('/components/data-table')
  const views = page.locator('[data-fluid-data-table]#docs-data-table-views')
  await views.getByRole('tab', { name: 'Admins', exact: true }).click()
  await expect(views.locator('tbody tr').first()).toBeVisible()
  await expect
    .poll(async () => {
      const roles = await views.locator('tbody td[data-grid-column="role"]').allTextContents()
      return roles.length > 0 && roles.every((role) => role === 'Admin')
    })
    .toBe(true)
  await views.getByRole('tab', { name: 'Everyone', exact: true }).click()
  await views.getByText('Manage views', { exact: true }).click()
  await views.getByRole('textbox', { name: 'View name', exact: true }).fill('Browser view')
  await views.getByRole('button', { name: 'Save new view', exact: true }).click()
  await expect(views.getByRole('tab', { name: 'Browser view', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await views.getByRole('textbox', { name: 'View name', exact: true }).fill('Renamed browser view')
  await views.getByRole('button', { name: 'Rename view', exact: true }).click()
  await expect(views.getByRole('tab', { name: 'Renamed browser view', exact: true })).toBeVisible()
  await views.getByRole('button', { name: 'Delete view', exact: true }).click()
  await expect(views.getByRole('tab', { name: 'Renamed browser view', exact: true })).toHaveCount(0)
})

test('DataTable Columns menu keeps visibility controls available and reorders them by keyboard', async ({
  page,
}) => {
  await page.goto('/components/data-table')
  const columns = page.locator('[data-fluid-data-table]#docs-data-table-columns')
  await columns.getByRole('button', { name: 'Columns', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Email', exact: true }).click()
  await expect(columns.locator('thead th[data-grid-column="email"]')).toHaveCount(0)
  await expect(page.getByRole('menuitemcheckbox', { name: 'Email', exact: true })).toBeVisible()
  await page.getByRole('menuitemcheckbox', { name: 'Email', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Name', exact: true }).focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect
    .poll(() =>
      columns.locator('thead th[data-grid-column]').first().getAttribute('data-grid-column'),
    )
    .toBe('email')
  await page.keyboard.press('Escape')
})

test('DataTable clears selection and lands loading rows', async ({ page }) => {
  await page.goto('/components/data-table')
  const team = page.locator('[data-fluid-data-table]#docs-data-table-team')
  await expect(team.locator('[data-grid-selection-bar]')).toBeVisible()
  await team.getByRole('button', { name: 'Clear selection', exact: true }).click()
  await expect(team.locator('[role="checkbox"][aria-checked="true"]')).toHaveCount(0)
  const loading = page.locator('[data-fluid-data-table]#docs-data-table-loading')
  await expect(loading).toHaveAttribute('aria-busy', 'true')
  await loading.locator('..').getByRole('button', { name: 'Finish loading', exact: true }).click()
  await expect(loading).toHaveAttribute('aria-busy', 'false')
  await expect(loading.locator('tbody tr').first()).toBeVisible()
})

test('DataTable scopes Ctrl+K selection actions and right-click actions to the active table', async ({
  page,
}) => {
  await page.goto('/components/data-table')
  const team = page.locator('[data-fluid-data-table]#docs-data-table-team')
  const member = team
    .locator('tbody tr')
    .filter({ has: page.getByText('Editor', { exact: true }) })
    .first()
  const memberId = await member.getAttribute('data-grid-row')
  await member.locator('td[data-grid-cell]').first().click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Make admin', exact: true }).click()
  const changedRole = team.locator(
    `[data-grid-body-row][data-grid-row="${memberId}"] td[data-grid-column="role"]`,
  )
  await expect(changedRole).toHaveText('Admin')
  await changedRole.focus()
  await page.keyboard.press('Control+z')
  await expect(changedRole).toHaveText('Editor')
  await team.locator('tbody td[data-grid-cell]').first().focus()
  await page.keyboard.press('Control+k')
  const palette = page.getByRole('dialog', { name: 'Selection actions', exact: true })
  await expect(palette).toBeVisible()
  await palette.getByRole('option', { name: 'Remove from team', exact: true }).click()
  await expect(palette).toHaveCount(0)
  for (const id of ['2', '3', '4'])
    await expect(team.locator(`[data-grid-body-row][data-grid-row="${id}"]`)).toHaveCount(0)
  await expect(team.locator('[role="checkbox"][aria-checked="true"]')).toHaveCount(0)
  const row = team.locator('[data-grid-body-row]').first()
  const rowId = await row.getAttribute('data-grid-row')
  await row.locator('td[data-grid-cell]').first().click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Remove', exact: true }).click()
  await expect(team.locator(`[data-grid-body-row][data-grid-row="${rowId}"]`)).toHaveCount(0)
})

test('DataTable moves rows with pointer and keyboard and confirms removal of sorting', async ({
  page,
}) => {
  await page.goto('/components/data-table')
  const table = page.locator('[data-fluid-data-table]#docs-data-table-reorder')
  const rows = table.locator('[data-grid-body-row]')
  await expect(rows.first()).toBeVisible()
  const initial = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-grid-row')),
  )
  const handle = table.locator('[data-grid-drag="row"]').first()
  await handle.scrollIntoViewIfNeeded()
  const from = await handle.boundingBox()
  const to = await table.locator('[data-grid-drag="row"]').nth(2).boundingBox()
  if (from === null || to === null) throw new Error('Row handles have no geometry')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 4, { steps: 8 })
  await page.mouse.up()
  await expect.poll(() => rows.first().getAttribute('data-grid-row')).not.toBe(initial[0])
  const afterPointer = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-grid-row')),
  )
  expect([...afterPointer].sort()).toEqual([...initial].sort())
  const beforeKeyboard = await rows.first().getAttribute('data-grid-row')
  await rows.first().locator('[data-grid-cell]').first().press('Alt+ArrowDown')
  await expect.poll(() => rows.nth(1).getAttribute('data-grid-row')).toBe(beforeKeyboard)
  await table.getByRole('button', { name: 'Step', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sort ascending', exact: true }).click()
  await expect(table.locator('th[data-grid-column="step"]')).toHaveAttribute(
    'aria-sort',
    'ascending',
  )
  await expect(page.getByRole('menuitem', { name: 'Sort ascending', exact: true })).toHaveCount(0)
  await rows.first().locator('[data-grid-cell]').first().press('Alt+ArrowDown')
  const confirmation = page.getByRole('dialog', { name: 'Remove sorting?', exact: true })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(table.locator('thead th[data-grid-column="step"]')).toHaveAttribute(
    'aria-sort',
    'ascending',
  )
  await rows.first().locator('[data-grid-cell]').first().press('Alt+ArrowDown')
  await confirmation.getByRole('button', { name: 'Remove sorting', exact: true }).click()
  await expect(confirmation).toHaveCount(0)
  await expect(table.locator('thead th[data-grid-column="step"]')).toHaveAttribute(
    'aria-sort',
    'none',
  )
})

test('DataTable native number, select, tags and date editors commit their values', async ({
  page,
}) => {
  await page.goto('/components/data-table')
  const preview = page
    .getByRole('region', { name: 'Playground', exact: true })
    .locator('.reference-preview')
  const row = preview.locator('tbody tr').first()
  const props = row.locator('td[data-grid-column="props"]')
  await props.click()
  const numeric = preview.getByRole('spinbutton', { name: 'Props for accordion', exact: true })
  await numeric.fill('123')
  await numeric.press('Enter')
  await expect(props).toHaveText('123')
  const primitives = row.locator('td[data-grid-column="primitives"]')
  await primitives.click()
  await preview.getByRole('combobox', { name: 'Primitives for accordion', exact: true }).click()
  await page.getByRole('option', { name: 'None', exact: true }).click()
  await expect(primitives).toHaveText('None')
  const tags = row.locator('td[data-grid-column="tags"]')
  await tags.click()
  const tagInput = preview.getByRole('combobox', { name: 'Tags for accordion', exact: true })
  await tagInput.fill('Browser proof')
  await tagInput.press('Enter')
  await preview
    .locator('[data-grid-rich-editor]')
    .getByRole('button', { name: 'Apply', exact: true })
    .click()
  await expect(tags).toContainText('Browser proof')
  await expect(tags).toContainText('Layout')
  const added = row.locator('td[data-grid-column="added"]')
  await added.click()
  await preview.getByRole('button', { name: /^Cell date/ }).click()
  await page.getByRole('button', { name: /February 28.*2026/ }).click()
  await expect(added).toContainText(/Feb(?:ruary)? 28|2026-02-28/)
})

test('DataTable collapsed search supports Escape and ArrowDown into the first row', async ({
  page,
}) => {
  await page.goto('/components/data-table')
  const table = page.locator('[data-fluid-data-table]#docs-data-table-team')
  const trigger = table.getByRole('button', { name: /^Search/ })
  await expect(trigger).toBeVisible()
  await expect(table.getByRole('searchbox')).toHaveCount(0)
  await trigger.click()
  const search = table.getByRole('searchbox')
  await expect(search).toBeFocused()
  await search.fill('no-such-person-419')
  await expect(table.getByRole('cell', { name: 'No results', exact: true })).toBeVisible()
  await search.press('Escape')
  await expect(table.getByRole('searchbox')).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await search.press('ArrowDown')
  await expect(table.locator('tbody [data-grid-cell]').first()).toBeFocused()
})

test('DataTable live controls preserve pagination and apply row and loading options', async ({
  page,
}) => {
  await page.goto('/components/data-table')
  const preview = page
    .getByRole('region', { name: 'Playground', exact: true })
    .locator('.reference-preview')
  const table = preview.locator('[data-fluid-data-table]')
  const props = page.getByRole('complementary', { name: 'DataTable props', exact: true })
  await preview.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(preview).toContainText('Page 2 of 4')
  await props.getByRole('switch', { name: 'Text wrap', exact: true }).click()
  await expect(preview).toContainText('Page 2 of 4')
  await props.getByRole('switch', { name: 'Pagination', exact: true }).click()
  await expect(table.locator('tbody [data-grid-body-row]')).toHaveCount(37)
  await props.getByRole('switch', { name: 'Row selection', exact: true }).click()
  await expect(table.getByRole('checkbox')).toHaveCount(0)
  await props.getByRole('switch', { name: 'Editable cells', exact: true }).click()
  await table.locator('tbody td[data-grid-column="name"]').first().click()
  await expect(table.locator('[data-grid-rich-editor]')).toHaveCount(0)
  await props.getByRole('switch', { name: 'Loading', exact: true }).click()
  await expect(table).toHaveAttribute('aria-busy', 'true')
  await props.getByRole('switch', { name: 'Loading', exact: true }).click()
  await expect(table).toHaveAttribute('aria-busy', 'false')
  await props.getByRole('switch', { name: 'Empty', exact: true }).click()
  await expect(table.getByRole('cell', { name: 'No results', exact: true })).toBeVisible()
})

test('DataTable Columns menu toggles native text wrapping', async ({ page }) => {
  await page.goto('/components/data-table')
  const table = page
    .getByRole('region', { name: 'Playground', exact: true })
    .locator('.reference-preview [data-fluid-data-table]')
  const row = table.locator('tbody [data-grid-body-row]').first()
  await expect(row).toBeVisible()
  const before = await row.boundingBox()
  if (before === null) throw new Error('Wrapped row has no geometry')
  await table.getByRole('button', { name: 'Columns', exact: true }).click()
  const wrap = page.getByRole('switch', { name: 'Wrap text', exact: true })
  await expect(wrap).toHaveAttribute('aria-checked', 'false')
  await wrap.click()
  await expect(wrap).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect
    .poll(async () => (await row.boundingBox())?.height ?? Infinity)
    .toBeGreaterThan(before.height)
})

test('DataTable matches upstream home paging, sorting and name search while docs keep ten rows', async ({
  page,
}) => {
  await page.goto('/components/data-table')
  const preview = page
    .getByRole('region', { name: 'Playground', exact: true })
    .locator('.reference-preview')
  await expect(preview).toContainText(/10\s*\/\s*37 rows/)
  await page.goto('/')
  await expectUpstreamHomeTable(page)
  await page
    .getByRole('complementary', { name: 'Documentation navigation', exact: true })
    .getByRole('link', { name: 'DataTable', exact: true })
    .click()
  await expect(page).toHaveURL(/\/components\/data-table/)
  await expect(preview).toContainText(/10\s*\/\s*37 rows/)
})

test('new component registry payloads are reachable from the served catalogue', async ({
  request,
}) => {
  const response = await request.get('/r/fluid/registry.json')
  expect(response.ok()).toBe(true)
  const catalogue = await response.json()
  for (const name of [
    'code-block',
    'context-menu',
    'data-table',
    'confirmation',
    'message-scroller',
    'key-cap',
  ]) {
    const entry = catalogue.items.find((item: { name: string }) => item.name === name)
    expect(entry, `Published catalogue entry ${name}`).toBeDefined()
    const payload = await request.get(`/r/fluid/${entry.meta.release}/${name}.json`)
    expect(payload.ok(), `Served immutable registry item ${name}`).toBe(true)
    const item = await payload.json()
    expect(item.name).toBe(name)
    expect(
      item.files.some(
        (file: { content?: string }) => typeof file.content === 'string' && file.content.length > 0,
      ),
    ).toBe(true)
  }
})

test('Confirmation accepts approve and deny intents without changing banner height', async ({
  page,
}) => {
  await page.goto('/components/banner')
  const section = page.getByRole('region', { name: 'Confirmation', exact: true })
  const confirmation = section.getByRole('group', { name: 'Run pnpm build?', exact: true })
  await expect(confirmation).toBeVisible()
  await page.waitForFunction(() => document.fonts.status === 'loaded')
  expect(
    await confirmation.getByRole('button', { name: /^(Approve|Deny)$/ }).allTextContents(),
  ).toEqual(['Approve', 'Deny'])
  const before = await confirmation.boundingBox()
  if (before === null) throw new Error('Confirmation has no layout box')
  await confirmation.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(confirmation.getByRole('status')).toHaveText('Approved')
  await expect(confirmation.getByRole('button', { name: /^(Approve|Deny)$/ })).toHaveCount(0)
  await expect
    .poll(async () => Math.abs(((await confirmation.boundingBox())?.height ?? 0) - before.height))
    .toBeLessThan(1)
  await section.getByRole('button', { name: 'Ask again', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Deny', exact: true }).click()
  await expect(confirmation.getByRole('status')).toHaveText('Denied')
})
