# Lint and Type Check

Run ESLint and TypeScript type checking.

## Usage

```
/lint [options]
```

## Options

- No args: Run both lint and typecheck
- `fix`: Run lint with auto-fix
- `types`: Run only TypeScript type checking

## Instructions

1. Parse the argument to determine the mode
2. Run the appropriate commands:
   - No args: Run `npm run lint` then `npx tsc --noEmit`
   - `fix`: Run `npm run lint -- --fix`
   - `types`: Run `npx tsc --noEmit` only
3. Report any errors found
4. For lint errors, suggest fixes
5. For type errors, explain the issue and how to resolve it

## Examples

- `/lint` - Run full lint + type check
- `/lint fix` - Auto-fix lint issues
- `/lint types` - Type check only
