# Question Scaffolding Engine v1

A production-grade question resolution system with intelligent caching, template-based scaffolding, and cost controls.

## Overview

The Question Scaffolding Engine provides instant access to structured learning scaffolds for physics problems. It uses a multi-tier caching strategy to minimize LLM calls and ensure fast responses.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Request                           │
│            (statement, choices?, topic?, subtopic?)             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Rate Limit Middleware                       │
│                  IP-based: 20 req/min (unauth)                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/question/resolve                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. Compute SHA-256 hash of normalized statement                  │
│ 2. Check KV for exact match → instant reuse                     │
│ 3. Extract fingerprint (LLM-free heuristics)                    │
│ 4. Find similar questions via KV indexes                        │
│ 5. If high similarity → reuse                                   │
│ 6. If medium similarity → adapt via LLM                         │
│ 7. If low similarity → generate via LLM (with guardrails)       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Vercel KV    │     │  Vercel Blob  │     │   Anthropic   │
│  (Indexing)   │     │  (Immutable)  │     │   (Sonnet)    │
└───────────────┘     └───────────────┘     └───────────────┘
```

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Vercel KV (Redis)
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_only_token

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_blob_read_write_token

# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Vercel KV Setup (Step-by-Step)

Vercel KV is required for caching, rate limiting, and quota tracking.

### 1. Create a KV Database

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Storage** tab
4. Click **Create Database** → Select **KV**
5. Choose a name (e.g., `question-engine-kv`)
6. Select a region close to your deployment
7. Click **Create**

### 2. Connect to Your Project

1. After creation, click **Connect to Project**
2. Select your project from the dropdown
3. Choose the environments (Production, Preview, Development)
4. Click **Connect**

### 3. Get Environment Variables

After connecting, Vercel automatically adds these to your project:

```bash
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

### 4. Local Development Setup

Pull the environment variables to your local `.env.local`:

```bash
vercel env pull .env.local
```

Or manually copy from Vercel Dashboard → Settings → Environment Variables.

### 5. Verify Connection

```bash
# Start dev server
npm run dev

# Check health endpoint
curl http://localhost:3000/api/question/health | jq '.services.kv'
```

Expected output:
```json
{
  "available": true,
  "message": "Vercel KV is connected and operational"
}
```

## Vercel Blob Setup

1. Go to your project → **Storage** tab
2. Click **Create Database** → Select **Blob**
3. Create a read-write token
4. Add `BLOB_READ_WRITE_TOKEN` to your environment

## Anthropic API Setup

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an API key
3. Add `ANTHROPIC_API_KEY` to your environment

## Running Locally

```bash
# Install dependencies
npm install

# Ensure environment variables are set in .env.local
# Run the development server
npm run dev
```

Check the health endpoint to verify all services are connected:

```bash
curl http://localhost:3000/api/question/health
```

## KV Key Structure

All indexing is stored in Vercel KV (Redis). **No mutable JSON manifests are used.**

| Key Pattern | Type | Description |
|-------------|------|-------------|
| `q:hash:{sha256}` | String | Maps content hash → Blob URL |
| `q:topic:{topic}` | Set | All question hashes for a topic |
| `q:topic:{topic}:sub:{subtopic}` | Set | Hashes for specific subtopic |
| `q:summary:{sha256}` | JSON String | Small summary for similarity matching |
| `rl:ip:{ip}` | Counter + TTL | Rate limit counter (60s TTL) |
| `quota:user:{userId}` | Counter + TTL | Daily generation quota (24h TTL) |
| `status:{statusId}` | JSON String | Generation progress status (5min TTL) |

## Template Adherence

Templates define the **fixed structure** that all scaffolds must follow. The LLM:

- ✅ CAN fill template slots (variables, text, hints, numeric values)
- ❌ CANNOT add, remove, or reorder steps
- ❌ CANNOT change step IDs or types

### Current Templates (27 total)

**Mechanics (9 templates):**
| Template ID | Steps | Description |
|-------------|-------|-------------|
| `mechanics/incline_frictionless` | 5 | Block on frictionless incline |
| `mechanics/incline_with_friction` | 6 | Block on incline with friction |
| `mechanics/newton_2d_block` | 5 | Generic 2D Newton's laws problem |
| `mechanics/projectile_motion` | 6 | Projectile motion problems |
| `mechanics/circular_motion` | 5 | Circular motion and centripetal force |
| `mechanics/work_energy` | 5 | Work-energy theorem problems |
| `mechanics/momentum_collision` | 5 | Momentum and collision problems |
| `mechanics/pulley_system` | 5 | Pulley and rope tension problems |
| `mechanics/simple_harmonic_motion` | 7 | SHM and oscillation problems |

**Thermodynamics (4 templates):**
| Template ID | Steps | Description |
|-------------|-------|-------------|
| `thermodynamics/ideal_gas` | 5 | Ideal gas law problems |
| `thermodynamics/first_law` | 5 | First law of thermodynamics |
| `thermodynamics/heat_engine` | 5 | Heat engine and Carnot cycle |
| `thermodynamics/calorimetry` | 5 | Heat transfer and mixing |

**Electromagnetism (6 templates):**
| Template ID | Steps | Description |
|-------------|-------|-------------|
| `electromagnetism/coulomb_field` | 5 | Coulomb's law and electric fields |
| `electromagnetism/gauss_law` | 5 | Gauss's law applications |
| `electromagnetism/capacitors` | 5 | Capacitor problems |
| `electromagnetism/dc_circuits` | 5 | DC circuit analysis |
| `electromagnetism/magnetic_force` | 5 | Magnetic force on charges/wires |
| `electromagnetism/em_induction` | 5 | Electromagnetic induction |

**Optics (3 templates):**
| Template ID | Steps | Description |
|-------------|-------|-------------|
| `optics/mirrors` | 5 | Mirror problems |
| `optics/lenses` | 5 | Lens problems |
| `optics/interference` | 5 | Wave interference |

**Waves (2 templates):**
| Template ID | Steps | Description |
|-------------|-------|-------------|
| `waves/standing_waves` | 5 | Standing waves and resonance |
| `waves/doppler` | 5 | Doppler effect |

**Modern Physics (3 templates):**
| Template ID | Steps | Description |
|-------------|-------|-------------|
| `modern/photoelectric` | 5 | Photoelectric effect |
| `modern/bohr_model` | 5 | Bohr model and atomic spectra |
| `modern/nuclear_decay` | 5 | Radioactive decay |

### Validation

Every generated question is validated:

1. **Zod Schema**: Ensures all required fields are present and correctly typed
2. **Template Adherence**: Verifies step IDs match template exactly
3. **Auto-Fix**: On failure, LLM is prompted once to fix the JSON

## API Endpoints

### POST /api/question/resolve

Main endpoint for resolving a question.

**Request:**
```json
{
  "statement": "A 5 kg block slides down a 30° incline...",
  "choices": ["5 m/s²", "4.9 m/s²", "10 m/s²", "2.5 m/s²"],
  "topic": "mechanics",
  "subtopic": "inclined_plane",
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "question": {
    "id": "uuid",
    "statement": "...",
    "templateId": "mechanics/incline_frictionless",
    "steps": [...],
    "finalAnswer": "4.9 m/s²",
    "source": "generated"
  },
  "meta": {
    "source": "generated",
    "cached": false,
    "generationTimeMs": 3500
  }
}
```

### GET /api/question/status?id={statusId}

Polling endpoint for generation status.

**Response:**
```json
{
  "statusId": "uuid",
  "status": "generating",
  "message": "Generating new scaffold...",
  "progress": 50,
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### GET /api/question/status/stream?id={statusId}

SSE endpoint for real-time status updates.

### GET /api/question/health

Health check for all services.

## Cost Controls

| Control | Limit | Description |
|---------|-------|-------------|
| Rate Limit (unauth) | 20 req/min | IP-based sliding window |
| Rate Limit (auth) | 100 req/min | Higher limit for authenticated users |
| Quota (unauth) | 3 generations/day | Unauthenticated users |
| Quota (auth) | 50 generations/day | Authenticated users |
| Full Generation | Auth required | Unauthenticated users can only reuse/adapt |

## React Component

A minimal React component is provided at `components/QuestionResolver.tsx`:

```tsx
import QuestionResolver from '@/components/QuestionResolver'

export default function MyPage() {
  return (
    <QuestionResolver
      initialStatement="A 5 kg block..."
      userId="user_123"
      onResolved={(question) => console.log('Resolved:', question)}
      onError={(error) => console.error('Error:', error)}
    />
  )
}
```

Features:
- Multi-choice input support
- Topic/subtopic selection
- Real-time progress bar during generation
- Expandable step cards with hints/traps/solutions

## File Structure

```
lib/question-engine/
├── index.ts                 # Main exports
├── schemas.ts               # Zod schemas for QuestionDoc, PatternTemplate
├── templates.ts             # Hardcoded physics templates
├── fingerprint.ts           # LLM-free fingerprinting
├── kv-store.ts              # Vercel KV operations
├── blob-store.ts            # Vercel Blob operations
└── anthropic-adapter.ts     # LLM wrapper with template enforcement

app/api/question/
├── resolve/route.ts         # Main resolve endpoint
├── status/route.ts          # Status polling endpoint
├── status/stream/route.ts   # SSE status streaming
└── health/route.ts          # Health check

components/
└── QuestionResolver.tsx     # React UI component

middleware.ts                # Rate limiting middleware
```

## Extending Templates

To add a new template:

1. Add the template definition to `lib/question-engine/templates.ts`
2. Export it and add to `TEMPLATE_REGISTRY`
3. Update subtopic classification in `lib/question-engine/fingerprint.ts`

Example:
```typescript
export const TEMPLATE_PROJECTILE_MOTION: PatternTemplate = {
  templateId: 'mechanics/projectile',
  topic: 'mechanics',
  subtopic: 'projectile',
  description: 'Projectile motion problems',
  rules: 'no add/remove/reorder',
  allowedVariables: ['initial_velocity', 'angle', 'height', 'range', 'time'],
  stepBlueprints: [
    // ... define steps
  ],
}
```

## Troubleshooting

### KV Connection Failed

1. Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set
2. Check that tokens are from the correct project
3. Verify the KV store is not paused in Vercel dashboard

### Blob Storage Failed

1. Verify `BLOB_READ_WRITE_TOKEN` is set
2. Check token has write permissions
3. Ensure Blob storage is enabled for your project

### LLM Generation Failed

1. Verify `ANTHROPIC_API_KEY` is set and valid
2. Check API usage limits on Anthropic dashboard
3. Review server logs for specific error messages

### Rate Limited

Wait 60 seconds or authenticate for higher limits.

### Quota Exceeded

- Unauthenticated: Sign in for more quota
- Authenticated: Wait 24 hours or contact admin
