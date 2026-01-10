# Run Tests

Run the unit test suite using Vitest.

## Usage

```
/test [options]
```

## Options

- No args: Run all tests once
- `watch`: Run in watch mode
- `ui`: Run with Vitest UI
- `coverage`: Run with coverage report
- `<pattern>`: Run tests matching pattern

## Instructions

1. Parse the argument to determine the test mode
2. Run the appropriate test command:
   - No args: `npm run test`
   - `watch`: `npm run test:watch`
   - `ui`: `npm run test:ui`
   - `coverage`: `npm run test -- --coverage`
   - Pattern: `npm run test -- <pattern>`
3. Report the test results summary
4. If tests fail, analyze the failures and suggest fixes

## Examples

- `/test` - Run all tests
- `/test watch` - Run in watch mode
- `/test scaffold` - Run tests matching "scaffold"
- `/test coverage` - Generate coverage report
