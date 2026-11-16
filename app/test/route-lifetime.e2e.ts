import { expect, test, type Route } from '@playwright/test'

const referenceData = (contractName: string) => ({
  family: 'fluid',
  name: 'Button',
  entry: 'button.ts',
  contracts: [
    {
      name: contractName,
      props: [
        {
          name: 'enabled',
          type: 'boolean',
          optional: true,
          description: 'Request result evidence',
          defaultValue: null,
        },
      ],
    },
  ],
  files: [{ path: 'button.ts', content: `export interface ${contractName} {}` }],
})

for (const transport of ['native', 'ignores-abort'] as const) {
  test(`an old Reference response cannot populate a later visit (transport=${transport})`, async ({
    page,
  }) => {
    if (transport === 'ignores-abort') {
      await page.addInitScript(() => {
        const nativeFetch = window.fetch.bind(window)
        window.fetch = Object.assign((...args: Parameters<typeof window.fetch>) => {
          const [input, init] = args
          const href =
            typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
          return href.includes('/reference/fluid/button.json')
            ? nativeFetch(input, { ...init, signal: new AbortController().signal })
            : nativeFetch(input, init)
        }, window.fetch)
      })
    }
    const oldRequest = Promise.withResolvers<Route>()
    let buttonRequests = 0
    await page.route('**/reference/fluid/button.json', async (route) => {
      buttonRequests++
      if (buttonRequests === 1) {
        oldRequest.resolve(route)
        return
      }
      await route.fulfill({ json: referenceData('CurrentVisitContract') })
    })
    await page.goto('/components/button')
    const old = await oldRequest.promise
    await page.locator('#site-navigation').getByRole('link', { name: 'Input', exact: true }).click()
    await expect(page).toHaveURL(/\/components\/input(?:\?|$)/u)
    await page
      .locator('#site-navigation')
      .getByRole('link', { name: 'Button', exact: true })
      .click()
    const api = page.getByRole('region', { name: 'API reference', exact: true })
    await expect(api).toContainText('CurrentVisitContract')
    const label = page
      .getByRole('complementary', { name: 'Button props' })
      .getByLabel('Label', { exact: true })
    await label.fill('New visit value')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('props'))
      .toContain('New visit value')
    if (transport === 'native') {
      await expect.poll(() => old.request().failure()?.errorText ?? '').toMatch(/abort|cancel/iu)
      try {
        await old.fulfill({ json: referenceData('RetiredVisitContract') })
      } catch {
        expect(old.request().failure()).not.toBeNull()
      }
    } else {
      expect(old.request().failure()).toBeNull()
      await old.fulfill({ json: referenceData('RetiredVisitContract') })
      const response = await old.request().response()
      if (response === null) throw new Error('Expected the uncancelable old HTTP response')
      expect(await response.finished()).toBeNull()
      expect(response.status()).toBe(200)
    }
    const currentLabel =
      transport === 'ignores-abort' ? 'Post-response live edit' : 'New visit value'
    if (transport === 'ignores-abort') {
      await label.fill(currentLabel)
      await expect.poll(() => new URL(page.url()).searchParams.get('props')).toContain(currentLabel)
    }
    await expect(api).toContainText('CurrentVisitContract')
    await expect(api).not.toContainText('RetiredVisitContract')
    await expect(label).toHaveValue(currentLabel)
    await expect(
      page.locator('.reference-preview').getByRole('button', { name: currentLabel, exact: true }),
    ).toBeVisible()
    expect(buttonRequests).toBe(2)
  })
}

test('authored Sidebar tabs survive same-page presentation and reset on a new visit', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.goto('/components/sidebar?accent=green')
  const tabs = page.getByRole('tablist', { name: 'nesting example', exact: true })
  const code = tabs.getByRole('tab', { name: 'Code', exact: true })
  await code.click()
  await expect(code).toHaveAttribute('aria-selected', 'true')
  await code.evaluate((node) => node.setAttribute('data-page-visit', 'first'))
  await page
    .locator('#site-customizer')
    .getByRole('combobox', { name: 'Radius', exact: true })
    .click()
  await page.getByRole('option', { name: 'Rounded', exact: true }).click()
  await expect(code).toHaveAttribute('aria-selected', 'true')
  await expect(code).toHaveAttribute('data-page-visit', 'first')
  await page.goto(`${page.url().split('#')[0]}#content`)
  await page.setViewportSize({ width: 900, height: 900 })
  await expect(code).toHaveAttribute('aria-selected', 'true')
  await expect(code).toHaveAttribute('data-page-visit', 'first')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.locator('#site-navigation').getByRole('link', { name: 'Input', exact: true }).click()
  await expect(page).toHaveURL(/\/components\/input(?:\?|$)/u)
  await page.locator('#site-navigation').getByRole('link', { name: 'Sidebar', exact: true }).click()
  await expect(tabs.getByRole('tab', { name: 'Preview', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(code).not.toHaveAttribute('data-page-visit', 'first')
  expect(new URL(page.url()).searchParams.get('accent')).toBe('green')
  expect(new URL(page.url()).searchParams.get('shape')).toBe('rounded')
})

test('a System page dialog is fresh after visiting another System page', async ({ page }) => {
  await page.goto('/surfaces?theme=light&shape=rounded')
  const trigger = page.getByRole('button', { name: 'Invite to your workspace', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Invite to your workspace', exact: true })
  const role = dialog.getByRole('combobox', { name: 'Workspace role', exact: true })
  await role.click()
  await page.getByRole('option', { name: 'Administrator', exact: true }).click()
  await expect(role).toContainText('Administrator')
  await dialog.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await page
    .locator('#site-navigation')
    .getByRole('link', { name: 'Typography', exact: true })
    .click()
  await expect(page).toHaveURL(/\/typography(?:\?|$)/u)
  await page
    .locator('#site-navigation')
    .getByRole('link', { name: 'Surfaces', exact: true })
    .click()
  await trigger.click()
  await expect(dialog).toBeVisible()
  await expect(role).toContainText('Member')
  expect(new URL(page.url()).searchParams.get('shape')).toBe('rounded')
})

test('Home starts no hidden Reference request while a component visit still loads its API', async ({
  page,
}) => {
  const references: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/reference/')) references.push(request.url())
  })
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  expect(references).toHaveLength(0)
  await page.locator('#site-navigation').getByRole('link', { name: 'Button', exact: true }).click()
  await expect(page.getByRole('region', { name: 'API reference', exact: true })).toContainText(
    'ButtonProps',
  )
  expect(references.some((href) => new URL(href).pathname === '/reference/fluid/button.json')).toBe(
    true,
  )
})

test('accepted cross-page URI facts reset Home state even when rendering batches the return', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.goto('/?accent=green')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const card = page.locator('[data-component="fluid/input-group"]')
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveAttribute('data-deferred', 'false')
  const input = card.getByRole('textbox').first()
  await input.fill('Before accepted departure')
  const before = await input.elementHandle()
  if (before === null) throw new Error('Expected a live Home input')
  const facts = await page.evaluate(
    () =>
      new Promise<{ paths: string[]; sameGrid: boolean; removedGrids: number }>((resolve) => {
        const grid = document.querySelector('.showcase-grid')
        const detail = document.querySelector<HTMLAnchorElement>(
          '[data-component="fluid/input-group"] a[href="/components/input-group"]',
        )
        const home = document.querySelector<HTMLAnchorElement>('#site-navigation a[href="/"]')
        if (grid === null || detail === null || home === null)
          throw new Error('Expected existing Home and component links')
        const paths: string[] = []
        let removedGrids = 0
        const changed = () => paths.push(location.pathname)
        const observer = new MutationObserver((records) => {
          for (const record of records)
            for (const node of record.removedNodes)
              if (node === grid || node.contains(grid)) removedGrids++
        })
        window.addEventListener('foldkit:urlchange', changed)
        observer.observe(document.body, { childList: true, subtree: true })
        requestAnimationFrame(() => {
          detail.click()
          home.click()
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              window.removeEventListener('foldkit:urlchange', changed)
              observer.disconnect()
              resolve({
                paths,
                sameGrid: document.querySelector('.showcase-grid') === grid,
                removedGrids,
              })
            }),
          )
        })
      }),
  )
  await expect(card).toHaveAttribute('data-deferred', 'false')
  // Accepted route membership owns the fresh Model, independently of preserved DOM.
  // Original React retained this programmatic burst draft; this is a disclosed native policy.
  await expect(input).toHaveValue('')
  await test.info().attach('accepted-uri-burst', {
    body: JSON.stringify({
      ...facts,
      originalInputConnected: await before.evaluate((node) => node.isConnected),
    }),
    contentType: 'application/json',
  })
  expect(new URL(page.url()).searchParams.get('accent')).toBe('green')
  // These classify the preserved-DOM/two-RAF experiment, not the URI ownership policy.
  // Evaluate fresh state first, so a coverage failure does not hide its separate outcome.
  expect(facts.paths, 'two-RAF URI trace coverage; incomplete means unqualified timing').toEqual([
    '/components/input-group',
    '/',
  ])
  expect(
    { sameGrid: facts.sameGrid, removedGrids: facts.removedGrids },
    'preserved-DOM coverage precondition; an intervening patch is not a policy rejection',
  ).toEqual({ sameGrid: true, removedGrids: 0 })
})
