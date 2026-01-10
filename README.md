# PhysiScaffold

An AI-powered physics tutoring platform designed for IIT-JEE level problem-solving. PhysiScaffold implements a "Socratic Engine" approach - instead of providing direct answers, it generates structured solution scaffolds that guide students through the reasoning process with adaptive learning features.

**Philosophy**: We don't give answers; we give the framework for the answer.

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

### Phased Scaffold Delivery

Scaffolds are delivered in phases to minimize latency:

| Phase | Content | Timing |
|-------|---------|--------|
| **Phase A** | Step outline with minimal info | ~10-20 seconds |
| **Phase B** | Detailed step content with micro-tasks | On-demand per step |
| **Phase C** | Full solution reveal | Optional |

### Data Flow

```
User submits problem
  -> POST /api/scaffold/outline (Phase A)
  -> Render step list
  -> User expands step
  -> POST /api/scaffold/step (Phase B)
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

## Project Structure

```
fremont-v2/
├── app/                           # Next.js App Router
│   ├── api/                       # API routes (60+ endpoints)
│   │   ├── scaffold/              # Scaffold generation (outline, step, hint)
│   │   ├── socratic-tutor/        # Socratic chat endpoints
│   │   ├── pattern-track/         # Pattern learning system
│   │   ├── warmup/                # Warm-up drill system
│   │   ├── pivot/                 # Pivot injection system
│   │   ├── paper-solution/        # Handwritten solution analysis
│   │   ├── spot-mistake/          # Spot the mistake mode
│   │   └── question/              # Question lifecycle management
│   ├── solve/                     # Main solver page
│   ├── study-path/                # Learning curriculum (v1 + v2)
│   ├── pattern-track/             # Pattern management & practice
│   ├── mistake-notebook/          # Spaced repetition review
│   ├── drills/                    # Drill practice mode
│   ├── history/                   # Problem history tracking
│   └── spot-mistake/              # Spot mistake exercises
│
├── components/                    # React components (100+)
│   ├── solve/                     # Main solver UI
│   ├── dashboard/                 # Dashboard v3 components
│   ├── micro-tasks/               # MCQ/fill-blank components
│   ├── paper-solution/            # Image upload & analysis
│   ├── warmup/                    # Warm-up protocol UI
│   ├── shell/                     # AppShell, layouts, navigation
│   └── ui/                        # Base UI components
│
├── lib/                           # Core services (60+ modules)
│   ├── featureFlags.ts            # Feature flag configuration
│   ├── anthropic.ts               # Claude API integration
│   ├── db.ts                      # Prisma client
│   ├── phasedScaffold.ts          # 3-phase scaffold generation
│   ├── hintEngine.ts              # 5-level hint system
│   ├── mistakeNotebook.ts         # Error tracking & SRS
│   ├── constraintCollisionEngine.ts # Physics constraint validation
│   └── ...                        # 50+ additional services
│
├── types/                         # TypeScript definitions (60+)
├── data/                          # Static data & JSON schemas
│   ├── questions.json             # Sample questions
│   ├── topics.json                # Curriculum hierarchy
│   ├── warmup-drills.json         # Warm-up drill bank
│   └── studyPlanV2/               # Pattern definitions (27 patterns)
├── prisma/                        # Database schema & migrations
├── e2e/                           # End-to-end tests (Playwright)
└── hooks/                         # React custom hooks
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

### Optional

| Variable | Description |
|----------|-------------|
| `MATHPIX_APP_ID` | MathPix app ID for PDF extraction |
| `MATHPIX_APP_KEY` | MathPix API key |

### Feature Flags

Most features are ON by default. Key flags:

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_FEATURE_DASHBOARD_V3` | ON | New dashboard layout |
| `NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR` | ON | Post-step Socratic chat |
| `NEXT_PUBLIC_FEATURE_PATTERN_FIRST` | ON | Pattern identification gate |
| `NEXT_PUBLIC_FEATURE_SKIP_COMMIT` | ON | Triage decision training |
| `NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS` | ON | Confidence-weighted SRS |
| `NEXT_PUBLIC_FEATURE_WARMUP_PROTOCOL` | ON | Session warm-up drills |
| `NEXT_PUBLIC_FEATURE_PIVOT_INJECTION` | ON | Help questions during solving |
| `NEXT_PUBLIC_ENABLE_FBD` | OFF | Free Body Diagram canvas |

See `.env.example` for the complete list with descriptions.

## Database Schema

The PostgreSQL database (via Neon serverless) uses Prisma ORM with these core tables:

| Table | Purpose |
|-------|---------|
| `questions` | Problem storage with JSONB payloads |
| `question_edges` | Relationships (prerequisites, variations) |
| `question_tags` | Normalized tags (topics, patterns, traps) |
| `user_question_history` | Attempt tracking and progress |
| `patterns` | Problem-solving pattern registry |
| `pattern_progress` | User mastery per pattern |
| `lesson_progress` | Lesson completion tracking |
| `track_progress` | Overall user progress (denormalized) |
| `precomputed_scaffold_outlines` | Cached Phase A outlines |
| `precomputed_step_expansions` | Cached Phase B step details |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (includes Prisma generate) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations (dev) |
| `npm run db:migrate:prod` | Run database migrations (prod) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database with sample data |

## Key Features

### Core Learning System
- **Two-Pass AI Architecture**: Hidden solver + visible scaffolder
- **Micro-Task Mode**: MCQs and fill-in-blanks for active learning
- **5-Level Hint System**: Progressive hints from concept to full solution
- **Socratic Tutor Chat**: AI professor validation after steps
- **Solution Roadmap**: Step-by-step accordion with progressive unlocking

### Adaptive Learning
- **Confidence-Weighted SRS**: Spaced repetition adjusted by self-reported confidence
- **Mistake Notebook**: Tracks errors for targeted review
- **Error Anticipator**: Warning beacons for common mistakes
- **Adaptive Preflight**: Auto-inserts checks on high-risk steps
- **Cognitive Load Governor**: Reduces UI complexity for struggling students

### Exam Strategy Training
- **Pattern-First Mode**: Timed pattern identification before solving (~12s)
- **Skip-or-Commit Gate**: Forces triage decisions at T=25s
- **Warm-Up Protocol**: 2-5 minute micro-drills before sessions

### Interactive Features
- **Boundary Case Builder**: Interactive equation stress-testing
- **Concept Contrast Challenge**: Explain why similar concepts don't apply
- **Socratic Rewind**: "I'm stuck" triggers guided recovery
- **Paper Solution Upload**: OCR + analysis of handwritten work
- **Constraint Collision Detection**: Real-time physics law violation detection

## Current Limitations

Based on the current implementation:

1. **FBD Canvas**: Interactive Free Body Diagram drawing is disabled - causes step completion issues (`FEATURE_FLAGS.FBD_CANVAS = false`)
2. **Phased Scaffold UI**: The phased loading flag is disabled due to UI issues (`FEATURE_FLAGS.PHASED_SCAFFOLD = false`)
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
