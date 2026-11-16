import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test(
  'AskUserQuestions validates an email and clears the error on edit',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/ask-user-questions')
    const example = screen.getByRole('region', 'Free text validation')
    const email = example.getByRole('textbox', 'Your work email?')
    await email.fill('invalid-email')
    await example.getByRole('button', 'Finish').tap()
    await expect(example).toContainText('Please enter a valid email so we can reach out.')
    await email.fill('oscar@example.com')
    await expect(example).not.toContainText('Please enter a valid email so we can reach out.')
    await example.getByRole('button', 'Finish').tap()
    await expect(example).not.toContainText('Please enter a valid email so we can reach out.')
  },
)

test(
  'Card selection persists across Code and Preview and dismiss restores',
  { tags: ['bugbash'] },
  async ({ app, screen, browser }) => {
    await app.open('/components/card')
    const selected = screen.getByRole('region', 'Selected')
    const choice = selected.getByRole('button', 'Accessible by default')
    await choice.tap()
    await expect(choice).toHaveAttribute('aria-pressed', 'true')
    await selected.getByRole('button', 'Code').tap()
    await selected.getByRole('button', 'Preview').tap()
    await expect(choice).toHaveAttribute('aria-pressed', 'true')

    const composed = screen.getByRole('region', 'Fully yours — compose anything')
    await browser
      .locator('section[aria-label="Fully yours — compose anything"] [data-slot="card"]')
      .hover()
    await composed.getByRole('button', 'Dismiss').tap()
    await expect(composed.getByRole('button', 'Restore card')).toBeVisible()
    await composed.getByRole('button', 'Restore card').tap()
    await expect(composed.getByRole('button', 'Get started')).toBeVisible()
  },
)

test(
  'Controlled questions advance and return to the first question on completion',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/ask-user-questions')
    const controlled = screen.getByRole('region', 'Controlled')
    await expect(controlled).toContainText("What's your role?")
    await controlled.getByRole('radio', { name: /Designer/ }).tap()
    await expect(controlled).toContainText('Which tool do you use most?')
    await controlled.getByRole('radio', { name: /Figma/ }).tap()
    await expect(controlled).toContainText('How big is your team?')
    await controlled.getByRole('radio', { name: /Just me/ }).tap()
    await expect(controlled).toContainText('How long have you been doing this?')
    await controlled.getByRole('radio', { name: /Less than a year/ }).tap()
    await expect(controlled).toContainText("What's your role?")
  },
)

test(
  'Badge Playground applies choices and text, then Reset restores defaults',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/badge')
    const playground = screen.getByRole('region', 'Playground')
    const variant = screen.getByRole('combobox', 'Variant')
    const color = screen.getByRole('combobox', 'Color')
    await variant.tap()
    await screen.getByRole('option', 'Dot').tap()
    await color.tap()
    await screen.getByRole('option', 'Blue', { exact: true }).tap()
    await screen.getByRole('textbox', 'Label').fill('Audit ready')
    await expect(playground).toContainText('Audit ready')
    await expect(variant).toContainText('Dot')
    await expect(color).toContainText('Blue')
    await screen.getByRole('button', 'Reset').tap()
    await expect(playground).toContainText('Published')
    await expect(variant).toContainText('Solid')
    await expect(color).toContainText('Gray')
  },
)

test(
  'ThinkingSteps nested disclosure toggles with the keyboard',
  { tags: ['bugbash'] },
  async ({ app, screen }) => {
    await app.open('/components/thinking-steps')
    const details = screen.getByRole('region', 'Basic').getByRole('button', 'Explored 6 files')
    await details.press('Enter')
    await expect(details).toHaveAttribute('aria-expanded', 'true')
    await details.press('Space')
    await expect(details).toHaveAttribute('aria-expanded', 'false')
  },
)
