# PhysiScaffold - Claude Context

This file provides context for Claude Code when working with this codebase.

## Project Overview

PhysiScaffold is an AI-powered physics tutoring platform for IIT-JEE level problem-solving. It uses a "Socratic Engine" approach - guiding students through reasoning rather than providing direct answers.

## Tech Stack

- **Framework**: Next.js 15.5, React 18.3, TypeScript 5.7
- **Database**: PostgreSQL via Neon (serverless), Prisma ORM
- **AI**: Anthropic Claude API
- **Caching**: Vercel KV (Redis)
- **Testing**: Vitest (unit), Playwright (E2E)

## Key Architectural Patterns

### Two-Pass AI Generation
1. Pass 1 (Hidden): Generate complete solution internally
2. Pass 2 (Visible): Create student-facing scaffold without revealing answers

### Phased Scaffold Delivery
- Phase A: Outline only (~10-20s) - `/api/scaffold/outline`
- Phase B: Step expansion (on-demand) - `/api/scaffold/step`
- Phase C: Full solution reveal (optional)

## Directory Structure

```
app/api/          # API routes (60+ endpoints)
components/       # React components (100+)
lib/              # Core services (60+ modules)
types/            # TypeScript definitions
data/             # Static data, JSON schemas
prisma/           # Database schema
e2e/              # Playwright E2E tests
```

## Key Files

- `lib/featureFlags.ts` - All feature flag definitions
- `lib/anthropic.ts` - Claude API integration
- `prisma/schema.prisma` - Database schema
- `components/solve/SolvePage.tsx` - Main solver UI
- `app/page.tsx` - Home page routing

## Common Commands

```bash
npm run dev          # Start development server
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
npm run build        # Build for production
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

## Feature Flags

Most features default to ON. Key flags:
- `DASHBOARD_V3`: New dashboard layout (hardcoded ON)
- `SOCRATIC_FIRST_MODE`: Socratic questioning UI (hardcoded ON)
- `FBD_CANVAS`: Free body diagram (hardcoded OFF - has issues)
- `PHASED_SCAFFOLD`: Phased loading (hardcoded OFF - has issues)

See `lib/featureFlags.ts` for complete list.

## Database

PostgreSQL via Neon with Prisma ORM. Key tables:
- `questions` - Problem storage with JSONB payloads
- `user_question_history` - Attempt tracking
- `pattern_progress` - User mastery per pattern
- `precomputed_scaffold_outlines` - Cached scaffolds

## Testing

- Unit tests: `npm run test` (Vitest)
- E2E tests: `npm run test:e2e` (Playwright)
- Test files: `*.test.ts`, `*.spec.ts`

## Environment Variables

Required:
- `ANTHROPIC_API_KEY` - Claude API key
- `DATABASE_URL` - PostgreSQL connection (pooled)
- `DIRECT_URL` - PostgreSQL connection (direct, for migrations)

Optional:
- `REDIS_URL` - Vercel KV
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob

## Code Style

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use Tailwind CSS for styling
- Follow existing patterns in codebase

## Common Tasks

### Adding a new API endpoint
1. Create route in `app/api/[endpoint]/route.ts`
2. Add types in `types/`
3. Implement service logic in `lib/`

### Adding a new feature flag
1. Add to `FEATURE_FLAGS` object in `lib/featureFlags.ts`
2. Add environment variable if configurable
3. Document in `.env.example`

### Running specific tests
```bash
npm run test -- scaffold     # Match pattern
npm run test:e2e -- --headed # See browser
```

## Gotchas

1. **Prisma client**: Run `npm run db:generate` after schema changes
2. **Feature flags**: Client-side flags need `NEXT_PUBLIC_` prefix
3. **API routes**: Use Next.js 15 App Router format (`route.ts`)
4. **Math rendering**: Use KaTeX for LaTeX equations
