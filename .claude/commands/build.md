# Build Project

Build the Next.js application for production.

## Usage

```
/build
```

## Instructions

1. Run `npm run build` which executes `prisma generate && next build`
2. Monitor the build output for errors
3. Report build status:
   - Success: Report bundle sizes and any warnings
   - Failure: Analyze build errors and suggest fixes
4. Common issues to check:
   - TypeScript errors
   - Missing dependencies
   - Invalid imports
   - Environment variable issues

## Build Process

The build command runs:
1. `prisma generate` - Generate Prisma client
2. `next build` - Build Next.js application

## Notes

- Build requires `DATABASE_URL` environment variable for Prisma
- Build output goes to `.next/` directory
- Static assets are optimized during build
