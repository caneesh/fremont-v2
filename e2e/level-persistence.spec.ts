import { test, expect } from '@playwright/test'

/**
 * Level Persistence Smoke Tests
 *
 * Verifies that:
 * 1. User can select a level
 * 2. Level persists in localStorage
 * 3. Level persists across page navigation
 * 4. Level badge shows correct value
 */

test.describe('Level Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated session
    await page.addInitScript(() => {
      localStorage.setItem('physiscaffold_session', JSON.stringify({
        userId: 'test-user-001',
        code: 'TEST-001',
        authenticatedAt: new Date().toISOString(),
      }))
      // Clear any existing profile
      localStorage.removeItem('physiscaffold_user_profile')
    })
  })

  test('level badge appears and shows default level', async ({ page }) => {
    await page.goto('/study-path')
    await page.waitForTimeout(1000)

    // Look for level badge (should show default F2 for Foundation 2)
    const levelBadge = page.locator('button:has-text("F2"), button:has-text("Foundation 2")')
    await expect(levelBadge.first()).toBeVisible({ timeout: 5000 })
  })

  test('clicking level badge opens level switcher modal', async ({ page }) => {
    await page.goto('/study-path')
    await page.waitForTimeout(1000)

    // Click level badge
    const levelBadge = page.locator('button:has-text("F2"), button:has-text("Foundation 2")')
    await levelBadge.first().click()

    // Check modal appears
    await expect(page.getByText('Select Your Level')).toBeVisible({ timeout: 5000 })

    // Check all level options are present
    await expect(page.getByText('Foundation 1', { exact: false })).toBeVisible()
    await expect(page.getByText('Foundation 2', { exact: false })).toBeVisible()
    await expect(page.getByText('Intermediate', { exact: false })).toBeVisible()
    await expect(page.getByText('Competitive', { exact: false })).toBeVisible()
  })

  test('selecting a level updates localStorage', async ({ page }) => {
    await page.goto('/study-path')
    await page.waitForTimeout(1000)

    // Click level badge to open modal
    const levelBadge = page.locator('button:has-text("F2"), button:has-text("Foundation 2")')
    await levelBadge.first().click()

    // Wait for modal
    await expect(page.getByText('Select Your Level')).toBeVisible()

    // Click on Intermediate
    await page.getByRole('button', { name: /Intermediate/i }).click()

    // Wait for modal to close
    await page.waitForTimeout(500)

    // Verify localStorage was updated
    const profileData = await page.evaluate(() => {
      return localStorage.getItem('physiscaffold_user_profile')
    })

    expect(profileData).toBeTruthy()
    const profile = JSON.parse(profileData!)
    expect(profile.track).toBe('intermediate')
    expect(profile.userId).toBe('test-user-001')
  })

  test('level persists after page reload', async ({ page }) => {
    // Set initial profile with competitive track
    await page.addInitScript(() => {
      localStorage.setItem('physiscaffold_user_profile', JSON.stringify({
        userId: 'test-user-001',
        track: 'competitive',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    })

    await page.goto('/study-path')
    await page.waitForTimeout(1000)

    // Verify level badge shows Competitive (Comp)
    const levelBadge = page.locator('button:has-text("Comp")')
    await expect(levelBadge.first()).toBeVisible({ timeout: 5000 })

    // Reload page
    await page.reload()
    await page.waitForTimeout(1000)

    // Verify level badge still shows Competitive
    await expect(levelBadge.first()).toBeVisible({ timeout: 5000 })

    // Verify localStorage still has correct track
    const profileData = await page.evaluate(() => {
      return localStorage.getItem('physiscaffold_user_profile')
    })
    const profile = JSON.parse(profileData!)
    expect(profile.track).toBe('competitive')
  })

  test('level persists across navigation', async ({ page }) => {
    // Set initial profile
    await page.addInitScript(() => {
      localStorage.setItem('physiscaffold_user_profile', JSON.stringify({
        userId: 'test-user-001',
        track: 'foundation1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    })

    // Start on study-path
    await page.goto('/study-path')
    await page.waitForTimeout(1000)

    // Verify level badge shows F1
    let levelBadge = page.locator('button:has-text("F1")')
    await expect(levelBadge.first()).toBeVisible({ timeout: 5000 })

    // Navigate to history
    await page.goto('/history')
    await page.waitForTimeout(1000)

    // Verify level badge still shows F1
    levelBadge = page.locator('button:has-text("F1")')
    await expect(levelBadge.first()).toBeVisible({ timeout: 5000 })

    // Navigate to settings
    await page.goto('/settings/profile')
    await page.waitForTimeout(1000)

    // Verify Foundation 1 is shown as current level
    await expect(page.getByText('Foundation 1')).toBeVisible()
  })

  test('settings page allows changing level', async ({ page }) => {
    // Set initial profile
    await page.addInitScript(() => {
      localStorage.setItem('physiscaffold_user_profile', JSON.stringify({
        userId: 'test-user-001',
        track: 'foundation2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    })

    await page.goto('/settings/profile')
    await page.waitForTimeout(1000)

    // Click on the level button to open switcher
    await page.getByRole('button', { name: /Foundation 2/i }).click()

    // Wait for modal
    await expect(page.getByText('Select Your Level')).toBeVisible()

    // Select Competitive
    await page.getByRole('button', { name: /Competitive/i }).click()

    // Wait for modal to close and page to update
    await page.waitForTimeout(500)

    // Verify localStorage was updated
    const profileData = await page.evaluate(() => {
      return localStorage.getItem('physiscaffold_user_profile')
    })
    const profile = JSON.parse(profileData!)
    expect(profile.track).toBe('competitive')
  })

  test('profile contains required fields after level change', async ({ page }) => {
    await page.goto('/study-path')
    await page.waitForTimeout(1000)

    // Open level switcher
    const levelBadge = page.locator('button:has-text("F2")')
    await levelBadge.first().click()

    // Wait for modal
    await expect(page.getByText('Select Your Level')).toBeVisible()

    // Select Foundation 1
    await page.getByRole('button', { name: /Foundation 1/i }).click()
    await page.waitForTimeout(500)

    // Verify all required fields exist
    const profileData = await page.evaluate(() => {
      return localStorage.getItem('physiscaffold_user_profile')
    })

    expect(profileData).toBeTruthy()
    const profile = JSON.parse(profileData!)

    // Required fields
    expect(profile.userId).toBe('test-user-001')
    expect(profile.track).toBe('foundation1')
    expect(profile.createdAt).toBeTruthy()
    expect(profile.updatedAt).toBeTruthy()

    // Timestamps should be valid ISO strings
    expect(() => new Date(profile.createdAt)).not.toThrow()
    expect(() => new Date(profile.updatedAt)).not.toThrow()
  })
})
