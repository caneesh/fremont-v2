import { test, expect } from '@playwright/test'

/**
 * Smoke tests for Feature Explorer and implemented feature routes.
 * These tests ensure:
 * 1. Feature Explorer page loads and displays features
 * 2. Feature Flags dashboard loads
 * 3. All implemented feature routes return 200
 */

test.describe('Feature Explorer', () => {
  test.beforeEach(async ({ page }) => {
    // Set up auth to bypass login
    await page.addInitScript(() => {
      localStorage.setItem('physiscaffold_session', JSON.stringify({
        userId: 'user-001',
        code: 'PILOT-ALPHA-001',
        authenticatedAt: new Date().toISOString(),
      }))
    })
  })

  test('Feature Explorer page loads and displays features', async ({ page }) => {
    await page.goto('/features')

    // Check page title is present
    await expect(page.getByRole('heading', { name: 'Feature Explorer' })).toBeVisible()

    // Check that stats cards are visible
    await expect(page.getByText('Total Features')).toBeVisible()
    await expect(page.getByText('Implemented')).toBeVisible()

    // Check that at least one feature card is visible
    await expect(page.getByText('Problem Solver')).toBeVisible()
  })

  test('Feature Flags dashboard loads and displays flags', async ({ page }) => {
    await page.goto('/features/flags')

    // Check page title is present
    await expect(page.getByRole('heading', { name: 'Feature Flags Dashboard' })).toBeVisible()

    // Check that stats cards are visible
    await expect(page.getByText('Total Flags')).toBeVisible()
    await expect(page.getByText('Enabled')).toBeVisible()

    // Check that at least one flag is visible
    await expect(page.getByText('DASHBOARD_V3')).toBeVisible()
  })

  test('Feature Explorer links to Feature Flags', async ({ page }) => {
    await page.goto('/features')

    // Click on Feature Flags link
    await page.getByRole('link', { name: 'View Feature Flags' }).click()

    // Verify we navigated to flags page
    await expect(page).toHaveURL('/features/flags')
    await expect(page.getByRole('heading', { name: 'Feature Flags Dashboard' })).toBeVisible()
  })

  test('Feature Flags links back to Feature Explorer', async ({ page }) => {
    await page.goto('/features/flags')

    // Click on Feature Explorer link
    await page.getByRole('link', { name: 'Feature Explorer' }).click()

    // Verify we navigated to features page
    await expect(page).toHaveURL('/features')
    await expect(page.getByRole('heading', { name: 'Feature Explorer' })).toBeVisible()
  })
})

test.describe('Feature Routes Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('physiscaffold_session', JSON.stringify({
        userId: 'user-001',
        code: 'PILOT-ALPHA-001',
        authenticatedAt: new Date().toISOString(),
      }))
    })
  })

  // Core routes that should always load
  const implementedRoutes = [
    { path: '/features', name: 'Feature Explorer' },
    { path: '/features/flags', name: 'Feature Flags' },
    { path: '/debug/features', name: 'Debug Feature Flags' },
    { path: '/solve', name: 'Problem Solver' },
    { path: '/study-path', name: 'Dashboard' },
    { path: '/history', name: 'History' },
    { path: '/mistake-notebook', name: 'Mistake Notebook' },
    { path: '/concept-network', name: 'Concept Network' },
    { path: '/pattern-track', name: 'Pattern Track' },
    { path: '/spot-mistake', name: 'Spot Mistake' },
    { path: '/error-patterns', name: 'Error Patterns' },
    { path: '/drills', name: 'Drills' },
  ]

  for (const route of implementedRoutes) {
    test(`${route.name} (${route.path}) returns 200`, async ({ page }) => {
      const response = await page.goto(route.path)
      expect(response?.status()).toBe(200)
    })
  }
})

test.describe('Debug Feature Flags', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('physiscaffold_session', JSON.stringify({
        userId: 'user-001',
        code: 'PILOT-ALPHA-001',
        authenticatedAt: new Date().toISOString(),
      }))
    })
  })

  test('Debug Feature Flags page loads', async ({ page }) => {
    await page.goto('/debug/features')

    // Check page title is present
    await expect(page.getByRole('heading', { name: 'Debug: Feature Flags' })).toBeVisible()

    // Check DEV ONLY badge is visible
    await expect(page.getByText('DEV ONLY')).toBeVisible()

    // Check that stats cards are visible
    await expect(page.getByText('Total Flags')).toBeVisible()
    await expect(page.getByText('Overridden')).toBeVisible()
    await expect(page.getByText('Missing Env')).toBeVisible()
  })

  test('can toggle feature flag override', async ({ page }) => {
    await page.goto('/debug/features')

    // Find the first flag and toggle it
    const firstFlagCard = page.locator('[class*="rounded-lg shadow-md"]').first()

    // Click ON button to override
    await firstFlagCard.getByRole('button', { name: 'ON' }).click()

    // Verify the Overridden badge appears
    await expect(page.getByText('Overridden').first()).toBeVisible()
  })

  test('can clear all overrides', async ({ page }) => {
    await page.goto('/debug/features')

    // First set an override
    const firstFlagCard = page.locator('[class*="rounded-lg shadow-md"]').first()
    await firstFlagCard.getByRole('button', { name: 'ON' }).click()

    // Clear all overrides
    await page.getByRole('button', { name: /Clear All Overrides/ }).click()

    // Verify no overridden badge exists (stats should show 0)
    const overriddenStat = page.locator('text=Overridden').locator('..').locator('p').first()
    await expect(overriddenStat).toContainText('0')
  })
})

test.describe('Feature Explorer Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('physiscaffold_session', JSON.stringify({
        userId: 'user-001',
        code: 'PILOT-ALPHA-001',
        authenticatedAt: new Date().toISOString(),
      }))
    })
  })

  test('can filter by category', async ({ page }) => {
    await page.goto('/features')

    // Select "Core Learning" category
    await page.getByLabel('Category').selectOption('core')

    // Verify Problem Solver is still visible (it's a core feature)
    await expect(page.getByText('Problem Solver')).toBeVisible()
  })

  test('can filter by status', async ({ page }) => {
    await page.goto('/features')

    // Select "Implemented" status
    await page.getByLabel('Status').selectOption('IMPLEMENTED')

    // Verify implemented features are visible
    await expect(page.getByText('Problem Solver')).toBeVisible()
  })

  test('can toggle Routes Only filter', async ({ page }) => {
    await page.goto('/features')

    // Click Routes Only button
    await page.getByRole('button', { name: 'Routes Only' }).click()

    // Verify the button is now active (has the accent color)
    const button = page.getByRole('button', { name: 'Routes Only' })
    await expect(button).toHaveClass(/bg-accent/)
  })

  test('can search features', async ({ page }) => {
    await page.goto('/features')

    // Type in search box
    await page.getByPlaceholder('Search features...').fill('mistake')

    // Verify Mistake Notebook is visible
    await expect(page.getByText('Mistake Notebook')).toBeVisible()
  })
})
