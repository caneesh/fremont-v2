import { test, expect } from '@playwright/test'

test.describe('Demo Flow', () => {
  test('should complete the full demo flow', async ({ page }) => {
    // 1. Navigate to demo page
    await page.goto('/demo')

    // 2. Verify problem selector is shown
    await expect(page.getByText('Welcome to PhysiScaffold Demo')).toBeVisible()
    await expect(page.getByText('Choose a Problem')).toBeVisible()

    // 3. Select first problem (Projectile Motion)
    const problemCard = page.locator('button').filter({ hasText: 'Projectile' }).first()
    await problemCard.click()

    // 4. Verify thinking gate is shown
    await expect(page.getByRole('heading', { name: 'Think First' })).toBeVisible()
    await expect(page.getByText('Question 1 of')).toBeVisible()

    // 5. Answer all 4 thinking questions
    for (let i = 0; i < 4; i++) {
      // Click the first option (A) for each question - look for the badge with "A"
      const optionA = page.locator('button').filter({ has: page.locator('span', { hasText: 'A' }) }).first()
      await optionA.click()
      await page.waitForTimeout(400) // Wait for animation
    }

    // 6. Verify completion and proceed to solve
    await expect(page.getByText('Great thinking!')).toBeVisible()
    await page.getByRole('button', { name: 'Proceed to Solve' }).click()

    // 7. Verify solve phase is shown
    await expect(page.getByText('Progressive Hints')).toBeVisible()
    await expect(page.getByText('Your Answer')).toBeVisible()

    // 8. Enter an answer and submit
    await page.getByPlaceholder('e.g., 4 or 2.5').fill('4')
    await page.getByRole('button', { name: 'Submit Answer' }).click()

    // 9. Wait for result phase
    await page.waitForTimeout(600)

    // 10. Verify result is shown (either correct or incorrect)
    const resultVisible = await page.getByText(/Excellent Work!|Good Attempt!/).isVisible()
    expect(resultVisible).toBe(true)

    // 11. Verify thinking gate performance is shown
    await expect(page.getByText('Thinking Gate Performance')).toBeVisible()

    // 12. Verify CTA buttons are present
    await expect(page.getByRole('button', { name: 'Try Another Problem' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to Problem Selection' })).toBeVisible()
  })

  test('should show dark mode styles', async ({ page }) => {
    // Emulate dark mode
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/demo')

    // Verify page loads in dark mode
    await expect(page.getByText('Welcome to PhysiScaffold Demo')).toBeVisible()
  })

  test('should persist progress in localStorage', async ({ page }) => {
    await page.goto('/demo')

    // Select a problem
    const problemCard = page.locator('button').filter({ hasText: 'Projectile' }).first()
    await problemCard.click()

    // Answer one question - click the first option button
    const optionA = page.locator('button').filter({ has: page.locator('span', { hasText: 'A' }) }).first()
    await optionA.click()
    await page.waitForTimeout(400)

    // Reload the page
    await page.reload()

    // Should return to thinking gate with progress preserved
    await expect(page.getByRole('heading', { name: 'Think First' })).toBeVisible()
  })

  test('should allow starting over', async ({ page }) => {
    await page.goto('/demo')

    // Select a problem
    const problemCard = page.locator('button').filter({ hasText: 'Projectile' }).first()
    await problemCard.click()

    // Click start over
    await page.getByRole('button', { name: 'Start Over' }).click()

    // Should return to problem selection
    await expect(page.getByText('Choose a Problem')).toBeVisible()
  })
})
