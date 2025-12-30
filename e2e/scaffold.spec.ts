import { test, expect } from '@playwright/test'

const outlineResponse = {
  success: true,
  data: {
    scaffold_id: 'scaffold-1',
    schema_version: 'v1',
    problem: 'A block slides down an incline.',
    tags: {
      domain: 'mechanics',
      subdomain: 'dynamics',
      patterns: [],
      difficulty: 'basic',
    },
    concepts: [
      { id: 'c1', name: 'Newton\'s Laws' },
    ],
    steps: [
      {
        step_id: 's1',
        title: 'Define forces',
        goal: 'List the forces acting on the block.',
        minimal_task: 'Which forces act on the block?',
        step_type: 'concept',
      },
    ],
    estimated_time_mins: 10,
  },
}

const stepExpansionResponse = {
  success: true,
  data: {
    scaffold_id: 'scaffold-1',
    step_id: 's1',
    micro_tasks: [
      {
        task_id: 't1',
        type: 'MCQ',
        question: 'What is the block\'s weight?',
        options: ['mg', 'ma', 'N', 'T'],
        correct_index: 0,
        reasoning: 'Weight equals mg.',
        difficulty: 'easy',
      },
    ],
    explanation: 'Identify the forces before writing equations.',
    traps: [],
    gating: {
      min_correct_tasks: 1,
      pass_on_explanation: false,
      allow_skip_after_attempts: 2,
    },
    hints: [
      { level: 1, content: 'Draw the free body diagram first.' },
    ],
  },
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('physiscaffold_session', JSON.stringify({
      userId: 'user-001',
      code: 'PILOT-ALPHA-001',
      authenticatedAt: new Date().toISOString(),
    }))
  })
})

test('renders the scaffold after a problem is submitted', async ({ page }) => {
  await page.route('**/api/scaffold/outline', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(outlineResponse),
    })
  })

  await page.route('**/api/scaffold/step', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stepExpansionResponse),
    })
  })

  await page.goto('/')

  await page.locator('#problem').fill('A block slides down an incline.')
  await page.getByRole('button', { name: 'Generate Solution Scaffold' }).click()

  await expect(page.getByText('Solution Roadmap')).toBeVisible()
  await expect(page.getByText('Define forces')).toBeVisible()
})
