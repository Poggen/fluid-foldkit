import type { E2EConfig } from 'e2e'
import base from './e2e.config.ts'

const pageUrl = process.env.FORM_PAGE_URL

if (pageUrl === undefined) {
  throw new Error('FORM_PAGE_URL is required for a form-control page charter')
}

export default {
  ...base,
  targets: base.targets.map((target) => ({
    ...target,
    app: { ...target.app, url: pageUrl },
  })),
} satisfies E2EConfig
