# Run E2E Tests

Run end-to-end tests using Playwright.

## Usage

```
/test-e2e [options]
```

## Options

- No args: Run all E2E tests
- `ui`: Run with Playwright UI mode
- `headed`: Run in headed browser mode
- `<file>`: Run specific test file

## Instructions

1. Parse the argument to determine the test mode
2. Run the appropriate Playwright command:
   - No args: `npm run test:e2e`
   - `ui`: `npx playwright test --ui`
   - `headed`: `npx playwright test --headed`
   - File: `npx playwright test e2e/<file>.spec.ts`
3. Report the test results
4. If tests fail, analyze failures and suggest fixes

## Examples

- `/test-e2e` - Run all E2E tests
- `/test-e2e ui` - Run with Playwright UI
- `/test-e2e scaffold` - Run scaffold tests only
- `/test-e2e headed` - Run in visible browser
