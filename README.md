# PhysiScaffold - The Socratic Physics Engine

**Active Decomposition: We don't give answers; we give the framework for the answer.**

PhysiScaffold is an AI-powered physics tutoring tool that uses a unique "Socratic Engine" approach. Instead of providing solutions, it generates structured solution scaffolds that guide students through the reasoning process.

## Core Philosophy

Most AI tutors are "Answer Engines." We built a "Reasoning Engine."

- **Input**: A raw physics problem (text or image)
- **Output**: A structured "Solution Skeleton" (The Irodov Recipe)
- **Interaction**: The student fills in the reasoning; the AI validates the logic, not just the final number

## Architecture: The Two-Pass System

### Pass 1: The Solver (Hidden)
- **Role**: Expert Professor
- **Task**: Solve the problem completely with all mathematical steps
- **Output**: A verified, complete solution (kept hidden from the student)

### Pass 2: The Scaffolder (Visible)
- **Role**: Teaching Assistant
- **Input**: Problem + Complete solution from Pass 1
- **Task**: Break down the solution into logical milestones without revealing the answer
- **Output**: A structured JSON scaffold with concepts, steps, and sanity checks

## Features

### 1. Concept Inventory
A right-side panel showing all physics concepts needed for the problem:
- Clear definitions
- Relevant formulas (rendered with LaTeX)
- Clickable/expandable for quick reference

### 2. Solution Roadmap
An accordion-style interface with logical steps:
- Each step unlocks after completing the previous one
- Guiding hints (not full solutions)
- Socratic questions to prompt reasoning
- Required concepts tagged for each step

### 3. Sanity Check Module
Every problem ends with a mandatory "Reality Check":
- Limiting case analysis (e.g., "What if ω → 0?")
- Dimensional analysis
- Symmetry checks

### 4. Problem History & Progress Tracking
Track your learning journey with comprehensive history management:
- **Save Draft**: Store in-progress solutions with all your step-by-step work
- **Mark as Solved**: Mark completed problems with final solution
- **Mark for Review**: Flag problems you want to revisit later
- **Autosave**: Automatic draft saving every 30 seconds
- **History Page**: View, filter, and search all problem attempts
- **Progress Restoration**: Resume problems exactly where you left off
- **Guest Mode**: Works offline using localStorage (no account required)

## Tech Stack

- **Frontend**: Next.js 15 with React 18
- **Styling**: Tailwind CSS
- **Math Rendering**: KaTeX (via react-katex)
- **AI**: Anthropic Claude 3.5 Sonnet
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- An Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. Clone the repository:
   ```bash
   cd fremont-v2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Enter a Problem**: Paste any physics problem text or click one of the sample problems
2. **Generate Scaffold**: The AI analyzes the problem and creates a solution framework
3. **Work Through Steps**: Expand each step, read the hints, and answer Socratic questions
4. **Complete the Sanity Check**: Verify your solution makes physical sense

### Sample Problems Included

- Bead on a Rotating Hoop (Non-inertial frames, effective potential)
- Block on Accelerating Wedge (Non-inertial reference frames)
- Rotating Rod with Bead (Equilibrium in rotating frames)

## Project Structure

```
fremont-v2/
├── app/
│   ├── api/solve/          # API route for problem solving
│   ├── history/            # Problem history page
│   ├── layout.tsx          # Root layout with KaTeX
│   ├── page.tsx            # Main application page
│   └── globals.css         # Global styles
├── components/
│   ├── ConceptPanel.tsx    # Right sidebar with concepts
│   ├── MathRenderer.tsx    # LaTeX rendering component
│   ├── ProblemInput.tsx    # Problem input form
│   ├── SanityCheckStep.tsx # Final reality check step
│   ├── SolutionScaffold.tsx # Main scaffold container
│   └── StepAccordion.tsx   # Individual step component
├── lib/
│   ├── anthropic.ts        # Two-pass LLM logic
│   ├── problemHistory.ts   # localStorage history service
│   └── utils.ts            # Utility functions (hashing, storage checks)
├── types/
│   ├── history.ts          # History data interfaces
│   └── scaffold.ts         # Scaffold data interfaces
└── README.md
```

## How It Works

### The Prompt Engineering

The system uses carefully crafted prompts to ensure:
1. The Solver provides complete, verified solutions
2. The Scaffolder breaks down reasoning without revealing answers
3. Hints guide WHAT to think about, not HOW to calculate
4. Sanity checks teach physics intuition

### Example Scaffold Structure

```json
{
  "problem": "A bead on a rotating hoop...",
  "domain": "Classical Mechanics",
  "subdomain": "Non-Inertial Frames",
  "concepts": [
    {
      "id": "centrifugal-force",
      "name": "Centrifugal Force",
      "definition": "...",
      "formula": "$F_{cf} = m\\omega^2 r$"
    }
  ],
  "steps": [
    {
      "id": 1,
      "title": "Choose Reference Frame",
      "hint": "Consider which frame simplifies the problem...",
      "requiredConcepts": ["non-inertial-frames"],
      "question": "Which frame makes the velocity zero?"
    }
  ],
  "sanityCheck": {
    "question": "What happens when $\\omega \\to 0$?",
    "expectedBehavior": "The bead should behave like a simple pendulum...",
    "type": "limit"
  }
}
```

## Roadmap

### MVP (Current)
- ✅ Two-pass LLM architecture
- ✅ Accordion UI with step-by-step solving
- ✅ Concept panel with definitions
- ✅ LaTeX math rendering
- ✅ Sanity check module
- ✅ Problem history and progress tracking
- ✅ Save/restore drafts with autosave
- ✅ Mark problems as solved or for review

### V2 (Planned)
- Image upload with OCR for problem ingestion
- Handwriting recognition for student answers
- Step validation with AI feedback
- Server-side storage with user authentication
- Cross-device sync
- Expanded problem library (Irodov, Kleppner, Morin)

## Contributing

This is a prototype/MVP. Contributions are welcome! Areas for improvement:

1. **Prompt Engineering**: Fine-tune the Solver and Scaffolder prompts
2. **UI/UX**: Enhance the interactive solving experience
3. **Validation**: Add AI-powered validation of student answers
4. **Problem Bank**: Curate high-quality physics problems

## License

MIT

## Acknowledgments

Inspired by the problem-solving approach in:
- I.E. Irodov - "Problems in General Physics"
- Kleppner & Kolenkow - "An Introduction to Mechanics"
- David Morin - "Introduction to Classical Mechanics"

Built with Claude 3.5 Sonnet by Anthropic.
