import { test, expect } from '@playwright/test'

test.describe('Solution Roadmap Questions', () => {
  test('should show Socratic questions when step is active', async ({ page }) => {
    // Go to solve page with a specific question
    await page.goto('/solve?question=mech-rot-002')

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})

    // Check if we need to enter access code
    const accessCodeInput = await page.locator('input[placeholder*="PILOT"]').isVisible().catch(() => false)
    if (accessCodeInput) {
      await page.locator('input[placeholder*="PILOT"]').fill('PILOT-ALPHA-001')
      await page.getByRole('button', { name: 'Access PhysiScaffold' }).click()
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    }

    // Handle welcome modal if it appears
    const solveButton = await page.getByRole('button', { name: 'Solve a Custom Problem' }).isVisible().catch(() => false)
    if (solveButton) {
      await page.getByRole('button', { name: 'Solve a Custom Problem' }).click()
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    }

    // Handle prerequisite check - skip it to get to Solution Roadmap faster
    // Wait for the page to render, then look for any skip button
    await page.waitForTimeout(3000)

    // Keep trying to click skip buttons until Solution Roadmap appears
    for (let attempt = 0; attempt < 5; attempt++) {
      // Check if we already have Solution Roadmap
      const hasRoadmap = await page.getByText('Solution Roadmap').isVisible().catch(() => false)
      if (hasRoadmap) {
        console.log('Solution Roadmap already visible')
        break
      }

      // Try to click any skip button that appears
      const skipCheckButton = page.getByRole('button', { name: 'Skip Check' })
      const skipThisCheckButton = page.getByRole('button', { name: 'Skip This Check' })

      if (await skipCheckButton.isVisible().catch(() => false)) {
        console.log('Clicking Skip Check button')
        await skipCheckButton.click()
        await page.waitForTimeout(2000)
      } else if (await skipThisCheckButton.isVisible().catch(() => false)) {
        console.log('Clicking Skip This Check button')
        await skipThisCheckButton.click()
        await page.waitForTimeout(2000)
      } else {
        console.log(`Attempt ${attempt + 1}: No skip button found, waiting...`)
        await page.waitForTimeout(2000)
      }
    }

    // Wait for Solution Roadmap to appear
    await expect(page.getByText('Solution Roadmap')).toBeVisible({ timeout: 60000 })

    // Take screenshot to see what's rendered
    await page.screenshot({ path: 'test-results/solve-roadmap.png', fullPage: true })

    // Click on Step 1 to expand it (look for button containing "Step 1")
    const step1Button = page.getByRole('button', { name: /Step 1/i })
    if (await step1Button.isVisible().catch(() => false)) {
      console.log('Clicking Step 1 to expand')
      await step1Button.click()
    }

    // Wait for the Socratic questions to load from API (this can take 5-10+ seconds)
    console.log('Waiting for Socratic questions to load...')
    const letsThink = page.getByText("Let's Think Together")

    try {
      // Wait for "Let's Think Together" which indicates questions have loaded
      await expect(letsThink).toBeVisible({ timeout: 30000 })
      console.log('Questions loaded successfully!')
    } catch {
      // If questions don't load, take a screenshot and check what's visible
      console.log('Questions did not load in time, checking current state...')
      await page.screenshot({ path: 'test-results/solve-step-timeout.png', fullPage: true })
    }

    // Take screenshot after questions load
    await page.screenshot({ path: 'test-results/solve-step-expanded.png', fullPage: true })

    // Check what's on the page now
    const thinkPrompt = page.getByText('Think About This')
    const preparingPrompt = page.getByText('Preparing your thinking prompt')

    const hasThinkPrompt = await thinkPrompt.isVisible().catch(() => false)
    const hasLetsThink = await letsThink.isVisible().catch(() => false)
    const hasPreparing = await preparingPrompt.isVisible().catch(() => false)

    console.log('Think About This visible:', hasThinkPrompt)
    console.log('Lets Think Together visible:', hasLetsThink)
    console.log('Preparing prompt visible:', hasPreparing)

    // "Let's Think Together" should be visible when questions are loaded
    expect(hasLetsThink).toBe(true)
  })
})
