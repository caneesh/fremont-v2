import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('physiscaffold_session', JSON.stringify({
      userId: 'user-001',
      code: 'PILOT-ALPHA-001',
      authenticatedAt: new Date().toISOString(),
    }))
  })
})

test('loads the home page and enables submit when a sample is selected', async ({ page }) => {
  await page.goto('/')

  const sampleButton = page.getByRole('button', { name: 'Bead on a Rotating Hoop' })
  await sampleButton.click()

  await expect(page.locator('#problem')).toHaveValue(/frictionless circular hoop/i)
  await expect(page.getByRole('button', { name: 'Generate Solution Scaffold' })).toBeEnabled()
})
