# PhysiScaffold - The Socratic Physics Engine

**Active Decomposition: We don't give answers; we give the framework for the answer.**

PhysiScaffold is an AI-powered physics tutoring platform that uses a unique "Socratic Engine" approach. Instead of providing solutions, it generates structured solution scaffolds that guide students through the reasoning process with adaptive learning features.

## Quick Start (30 seconds)

```bash
# Clone and install
git clone https://github.com/caneesh/fremont-v2.git
cd fremont-v2
npm install

# Add your API key
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and paste any physics problem!

---

## Documentation

| Document | Description |
|----------|-------------|
| [Features](./docs/FEATURES.md) | Complete feature inventory with UI locations and success criteria |
| [User Guide](./docs/USER_GUIDE.md) | Step-by-step usage instructions for testers and new users |
| [QA Happy Path](./docs/QA_HAPPY_PATH_E2E.md) | End-to-end test scenario with copy-paste inputs |

---

## Features

### Core Learning System

| Feature | Description |
|---------|-------------|
| **Two-Pass AI Architecture** | Hidden solver + visible scaffolder ensures accurate guidance |
| **Socratic Questioning** | Guides reasoning without revealing answers |
| **Concept Inventory** | Right-panel with formulas, definitions, and explanations |
| **Solution Roadmap** | Step-by-step accordion with progressive unlocking |
| **Sanity Check Module** | Limiting cases, dimensional analysis, symmetry checks |

### Adaptive Learning Features

| Feature | Description |
|---------|-------------|
| **Micro-Task Mode** | MCQs and fill-in-blanks instead of open hints |
| **Reveal-Reconstruct-Validate** | 3-stage reading mode for passive learners |
| **Confidence-Weighted SRS** | Spaced repetition adjusted by self-reported confidence |
| **Mistake Notebook** | Tracks errors for targeted review |
| **Error Anticipator** | Predicts common mistakes with warning beacons |
| **Adaptive Preflight** | Auto-inserts checks on high-risk steps |

### Exam Strategy Training

| Feature | Description |
|---------|-------------|
| **Pattern-First Mode** | Timed pattern identification before solving |
| **Skip-or-Commit Gate** | Forces triage decisions at T=25s (exam strategy) |
| **Study Plan v2** | Pattern-driven curriculum with meta-skills |

### Interactive Features

| Feature | Description |
|---------|-------------|
| **Socratic Tutor Chat** | Live chat with AI professor after each step |
| **Socratic Rewind** | "I'm stuck" button triggers guided recovery |
| **Why This Step** | On-demand explanation of step importance |
| **Step Confidence Heatmap** | Visual overview of understanding gaps |
| **Boundary Case Builder** | Interactive equation stress-testing |

### Problem Management

| Feature | Description |
|---------|-------------|
| **Problem History** | Track all attempts with status (in-progress/solved/skipped) |
| **Draft Autosave** | Auto-saves every 30 seconds |
| **Progress Restoration** | Resume exactly where you left off |
| **Review Flagging** | Mark problems for later review |
| **PDF Import** | Extract questions from PDF files using Claude Vision |

---

## Detailed Setup Guide

### Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Anthropic API Key** ([Get one here](https://console.anthropic.com/))

### Step 1: Clone Repository

```bash
git clone https://github.com/caneesh/fremont-v2.git
cd fremont-v2
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

Create a `.env` file in the project root:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Optional - Feature Flags
NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR=true
NEXT_PUBLIC_FEATURE_PATTERN_FIRST=true
NEXT_PUBLIC_FEATURE_SKIP_COMMIT=true
NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2=true
```

### Step 4: Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Step 5: Build for Production

```bash
npm run build
npm start
```

---

## Usage Guide

### Basic Workflow

1. **Enter a Problem**: Paste physics problem text or select a sample
2. **Generate Scaffold**: AI creates a step-by-step solution framework
3. **Work Through Steps**: Expand each step, answer questions, use hints if needed
4. **Complete Sanity Check**: Verify your solution with limiting cases
5. **Review & Save**: Mark as solved or flag for review

### Learning Modes

| Mode | Best For | How to Use |
|------|----------|------------|
| **Active (Micro-Tasks)** | Building skills | Answer MCQs/fill-blanks for each step |
| **Reading (Reveal)** | Understanding solutions | Click "Reveal" then answer comprehension questions |
| **Exam Practice** | Timed drills | Enable Pattern-First + Skip-Commit gates |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit answer |
| `Tab` | Next step |
| `Shift+Tab` | Previous step |
| `H` | Show hint (when focused on step) |

---

## Feature Flags

Enable/disable features via environment variables:

```bash
# Core Features
NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR=true    # Live chat after steps
NEXT_PUBLIC_FEATURE_PATTERN_FIRST=true      # Pattern identification gate
NEXT_PUBLIC_FEATURE_SKIP_COMMIT=true        # Triage decision training
NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2=true      # Pattern-driven study plan

# Learning Enhancements
NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS=true     # Confidence-weighted review
NEXT_PUBLIC_FEATURE_BOUNDARY_CASE=true      # Equation stress-testing
NEXT_PUBLIC_FEATURE_ADAPTIVE_PREFLIGHT=true # Auto-inserted checks
NEXT_PUBLIC_FEATURE_WHY_THIS_STEP=true      # Step importance explanations

# Experimental
NEXT_PUBLIC_FEATURE_PAPER_SOLUTION=true     # Upload handwritten solutions
NEXT_PUBLIC_FEATURE_CONSTRAINT_COLLISION=true # Real-time constraint checking
```

---

## PDF Question Import

Extract questions from PDF files (JEE, NEET, textbooks):

### CLI Usage

```bash
# Single PDF
npx ts-node scripts/pdf-to-questions.ts problems.pdf -o questions.json

# With source metadata
npx ts-node scripts/pdf-to-questions.ts jee-2023.pdf \
  --source jee-2023 \
  --source-kind jee \
  -o output.json

# Batch process folder
npx ts-node scripts/pdf-to-questions.ts --batch ./pdfs -o ./questions.json
```

### API Usage

```typescript
const formData = new FormData()
formData.append('file', pdfFile)
formData.append('sourceType', 'jee')

const response = await fetch('/api/questions/extract', {
  method: 'POST',
  body: formData
})
```

---

## Project Structure

```
fremont-v2/
├── app/
│   ├── api/
│   │   ├── scaffold/           # Scaffold generation APIs
│   │   ├── socratic-tutor/     # Chat API
│   │   ├── questions/extract/  # PDF extraction API
│   │   └── solve/              # Legacy solve API
│   ├── history/                # Problem history page
│   ├── study-plan/             # Study plan pages
│   └── page.tsx                # Main app
├── components/
│   ├── SolutionScaffold.tsx    # Main scaffold UI
│   ├── StepAccordion.tsx       # Step component
│   ├── SocraticTutorChat.tsx   # AI chat component
│   ├── PatternFirstModal.tsx   # Pattern selection
│   ├── SkipCommitGateModal.tsx # Triage decision modal
│   └── ...
├── lib/
│   ├── featureFlags.ts         # Feature flag configuration
│   ├── problemHistory.ts       # LocalStorage service
│   ├── prompts/                # AI prompt templates
│   └── ...
├── types/
│   ├── scaffold.ts             # Scaffold interfaces
│   ├── history.ts              # History interfaces
│   └── ...
├── data/
│   ├── schemas/                # JSON schemas
│   ├── questions.json          # Sample questions
│   └── studyPlanV2/            # Pattern/skill definitions
└── scripts/
    └── pdf-to-questions.ts     # PDF extraction script
```

---

## API Reference

### POST /api/scaffold/outline
Generate scaffold outline from problem text.

```typescript
// Request
{ "problem": "A 5kg block slides down..." }

// Response
{ "steps": [...], "concepts": [...] }
```

### POST /api/scaffold/step
Expand a single step with detailed content.

```typescript
// Request
{ "scaffold_id": "xxx", "step_id": "s1", "problem": "..." }

// Response
{ "tasks": [...], "explanations": {...} }
```

### POST /api/socratic-tutor/chat
Chat with AI tutor about a step.

```typescript
// Request
{ "stepContext": {...}, "messages": [...], "userMessage": "..." }

// Response
{ "response": "...", "isComplete": false }
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS |
| Math Rendering | KaTeX |
| AI | Anthropic Claude (Sonnet 4) |
| Storage | LocalStorage (client), Vercel KV (optional) |
| Deployment | Vercel |

---

## Development

### Run Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

### Lint & Format

```bash
npm run lint          # ESLint
npm run lint:fix      # Auto-fix
```

### Type Check

```bash
npx tsc --noEmit
```

---

## Roadmap

### Completed
- Two-pass AI architecture
- Micro-task learning mode
- Socratic Tutor chat
- Pattern-First mode
- Skip-or-Commit gate
- Study Plan v2
- PDF question extraction
- Mistake tracking
- Confidence-weighted SRS

### In Progress
- Handwriting recognition for paper solutions
- Real-time constraint collision detection
- Question bank management UI

### Planned
- User authentication & cloud sync
- Mobile app
- Multiplayer problem-solving
- Teacher dashboard
- LMS integration (Canvas, Blackboard)

---

## Contributing

Contributions welcome! Key areas:

1. **Prompt Engineering**: Improve AI scaffolding quality
2. **UI/UX**: Enhance learning experience
3. **Question Bank**: Curate physics problems
4. **Testing**: Add test coverage

---

## License

MIT

---

## Acknowledgments

Inspired by:
- I.E. Irodov - "Problems in General Physics"
- Kleppner & Kolenkow - "An Introduction to Mechanics"
- David Morin - "Introduction to Classical Mechanics"

Built with Claude by Anthropic.
