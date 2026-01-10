# PhysiScaffold

An AI-powered physics tutoring platform designed for IIT-JEE level problem-solving. PhysiScaffold implements a "Socratic Engine" approach - instead of providing direct answers, it generates structured solution scaffolds that guide students through the reasoning process with adaptive learning features.

**Philosophy**: We don't give answers; we give the framework for the answer.

> **Tip**: Visit `/features` in the app to explore all 45+ features interactively.

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd fremont-v2
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Set up database
npm run db:push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start solving physics problems.

## Documentation

| Document | Description |
|----------|-------------|
| [Features](./docs/FEATURES.md) | Complete feature inventory with implementation status |
| [User Guide](./docs/USER_GUIDE.md) | Step-by-step usage instructions for users |
| [Testing Guide](./docs/TESTING_GUIDE.md) | QA happy path and test scenarios |
| [Architecture](./docs/ARCHITECTURE.md) | System design and technical architecture |

## Core Architecture

### Two-Pass AI System

The platform uses a two-pass AI generation model:

1. **Pass 1 (Hidden Solver)**: Generates a complete, verified solution internally
2. **Pass 2 (Visible Scaffolder)**: Creates student-facing step-by-step guidance based on the verified solution

This ensures pedagogically sound guidance without spoiling solutions.

### Data Flow

```
User submits problem
  -> POST /api/scaffold/outline (generate steps)
  -> Render step list
  -> User expands step
  -> POST /api/scaffold/step (expand content)
  -> Display micro-tasks + hints
  -> User completes step
  -> POST /api/socratic-tutor (comprehension check)
  -> Rate confidence
  -> Store progress in database
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15.5.8, React 18.3.1 |
| **Language** | TypeScript 5.7.2 |
| **Styling** | Tailwind CSS 3.4.17 |
| **Math Rendering** | KaTeX 0.16.11 |
| **Diagrams** | ReactFlow 11.11.4 |
| **AI** | Anthropic Claude (SDK 0.32.1) |
| **Database** | PostgreSQL via Neon (serverless) |
| **ORM** | Prisma 6.19.1 |
| **Caching** | Vercel KV (Redis) |
| **Storage** | Vercel Blob |
| **Testing** | Vitest 4.0.16, Playwright 1.57.0 |
| **Deployment** | Vercel |

## Key Features

All features are tracked in the [Feature Registry](/lib/featureRegistry.ts). Visit `/features` in the app to explore interactively.

### Core Learning System (IMPLEMENTED)

| Feature | Route | Description |
|---------|-------|-------------|
| Problem Solver | `/solve` | AI-generated solution scaffolds |
| Micro-Task Mode | `/solve` | MCQs and fill-in-blanks for active learning |
| 5-Level Hint System | `/solve` | Progressive hints from concept to full solution |
| Socratic Tutor Chat | `/solve` | AI professor validation after steps |
| Solution Roadmap | `/solve` | Step-by-step accordion with progressive unlocking |

### Adaptive Learning (IMPLEMENTED)

| Feature | Route | Description |
|---------|-------|-------------|
| Mistake Notebook | `/mistake-notebook` | Tracks errors for targeted SRS review |
| Confidence-Weighted SRS | embedded | Spaced repetition adjusted by self-reported confidence |
| Error Anticipator | embedded | Warning beacons for common mistakes |
| Adaptive Preflight | embedded | Auto-inserts checks on high-risk steps |
| Cognitive Load Governor | embedded | Reduces UI complexity for struggling students |

### Exam Strategy Training (IMPLEMENTED)

| Feature | Route | Description |
|---------|-------|-------------|
| Pattern-First Mode | modal | Timed pattern identification before solving (~12s) |
| Skip-or-Commit Gate | modal | Forces triage decisions at T=25s |
| Warm-Up Protocol | `/study-path` | 2-5 minute micro-drills before sessions |
| Pattern Track | `/pattern-track` | Pattern-driven curriculum (27 patterns) |
| Micro-Pattern Drills | `/drills` | Rapid-fire timed practice |

### Interactive Features (IMPLEMENTED)

| Feature | Route | Description |
|---------|-------|-------------|
| Concept Network | `/concept-network` | Visual concept mastery map |
| Spot the Mistake | `/spot-mistake` | Critical thinking - find errors in solutions |
| Boundary Case Builder | embedded | Interactive equation stress-testing |
| Paper Solution Upload | embedded | OCR + analysis of handwritten work |
| Constraint Collision Detection | embedded | Real-time physics law violation detection |

### Navigation (IMPLEMENTED)

| Feature | Route | Description |
|---------|-------|-------------|
| Dashboard | `/study-path` | Progress tracking and daily plan |
| Problem History | `/history` | Track all attempts with resume capability |
| Feature Explorer | `/features` | Browse all features with status badges |
| Feature Flags Dashboard | `/features/flags` | View effective flag values |

### Disabled Features

| Feature | Reason |
|---------|--------|
| FBD Canvas | Causes step completion issues |
| Phased Scaffold Loading | UI state issues |

## Project Structure

```
fremont-v2/
├── app/                           # Next.js App Router
│   ├── api/                       # API routes (60+ endpoints)
│   ├── solve/                     # Main solver page
│   ├── study-path/                # Dashboard
│   ├── pattern-track/             # Pattern management & practice
│   ├── mistake-notebook/          # Spaced repetition review
│   ├── drills/                    # Drill practice mode
│   ├── history/                   # Problem history tracking
│   ├── features/                  # Feature Explorer + Flags Dashboard
│   └── debug/                     # Development tools
│
├── components/                    # React components (100+)
│   ├── solve/                     # Main solver UI
│   ├── dashboard/                 # Dashboard v3 components
│   ├── micro-tasks/               # MCQ/fill-blank components
│   ├── shell/                     # AppShell, layouts, navigation
│   └── ui/                        # Base UI components
│
├── lib/                           # Core services (60+ modules)
│   ├── featureRegistry.ts         # Single source of truth for features
│   ├── featureFlags.ts            # Feature flag configuration
│   ├── featureOverrides.ts        # localStorage override utilities
│   └── ...                        # 50+ additional services
│
├── docs/                          # Documentation
│   ├── FEATURES.md                # Complete feature inventory
│   ├── USER_GUIDE.md              # User documentation
│   └── ...
│
├── e2e/                           # End-to-end tests (Playwright)
└── prisma/                        # Database schema & migrations
```

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude AI |
| `DATABASE_URL` | PostgreSQL connection URL (pooled, for Neon) |
| `DIRECT_URL` | PostgreSQL direct connection (for migrations) |
| `REDIS_URL` | Vercel KV Redis URL |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |

### Feature Flags

Most features are ON by default. Key configurable flags:

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR` | ON | Post-step Socratic chat |
| `NEXT_PUBLIC_FEATURE_PATTERN_FIRST` | ON | Pattern identification gate |
| `NEXT_PUBLIC_FEATURE_SKIP_COMMIT` | ON | Triage decision training |
| `NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS` | ON | Confidence-weighted SRS |
| `NEXT_PUBLIC_FEATURE_WARMUP_PROTOCOL` | ON | Session warm-up drills |
| `NEXT_PUBLIC_FEATURE_PIVOT_INJECTION` | ON | Help questions during solving |

Hardcoded flags (cannot change via env):
- `DASHBOARD_V3`: ON
- `SOCRATIC_FIRST_MODE`: ON
- `FBD_CANVAS`: OFF (causes issues)
- `PHASED_SCAFFOLD`: OFF (UI issues)

See `.env.example` for the complete list with descriptions.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |

## Current Limitations

1. **FBD Canvas**: Interactive Free Body Diagram drawing is disabled (`FEATURE_FLAGS.FBD_CANVAS = false`)
2. **Phased Scaffold UI**: The phased loading flag is disabled (`FEATURE_FLAGS.PHASED_SCAFFOLD = false`)
3. **Authentication**: Uses simple session-based authentication stored in localStorage
4. **Offline Support**: No offline capability; requires active internet for AI features
5. **Mobile**: Desktop-first design; some features have limited mobile optimization
6. **Multi-language**: English only

## Deployment

Designed for Vercel deployment:

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

Database migrations:
```bash
npm run db:migrate:prod
```

## Contributing

1. Create a feature branch from `main`
2. Make changes with tests
3. Run `npm run lint` and `npm run test`
4. Submit a pull request

## License

Proprietary - All rights reserved

## Acknowledgments

Inspired by:
- I.E. Irodov - "Problems in General Physics"
- Kleppner & Kolenkow - "An Introduction to Mechanics"
- David Morin - "Introduction to Classical Mechanics"

Built with Claude by Anthropic.
