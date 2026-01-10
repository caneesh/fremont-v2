# Release Notes: Feature Registry & Explorer

## Summary

This release introduces a Feature Registry as the single source of truth for all features in PhysiScaffold. It includes in-app pages to explore features and understand their status, along with a Feature Flags dashboard to see why features are enabled or hidden.

## New Features

### Feature Registry (`lib/featureRegistry.ts`)
- **Single source of truth** for all 35+ features in the app
- Tracks for each feature:
  - Implementation status (IMPLEMENTED, PARTIAL, STUB, DISABLED, DEV_ONLY)
  - Route information and navigation visibility
  - Required feature flags
  - Related components and API routes
  - Documentation links
- Provides utility functions for:
  - Getting features by category/status
  - Checking if a feature is active
  - Getting navigation items for primary/secondary/mobile nav

### Feature Explorer (`/features`)
- Browse all features with filterable grid view
- Status badges show implementation state at a glance
- Filter by:
  - Category (Core Learning, Adaptive, Exam Strategy, etc.)
  - Status (Implemented, Partial, Stub, Disabled, Dev Only)
  - Routes Only toggle
  - Free-text search
- Click on implemented features to navigate directly to them
- Links to documentation for each feature

### Feature Flags Dashboard (`/features/flags`)
- View all feature flags and their effective values
- Understand why a feature is ON or OFF:
  - **Hardcoded**: Set in code, cannot be changed via env
  - **Environment**: Value set via environment variable
  - **Default**: Using default value, can be overridden
- See which features depend on each flag
- Copy-paste environment variable syntax for configuration

### Navigation Updates
- Added "Features" link to sidebar secondary navigation (desktop)
- Added "Features" link to More menu (mobile)
- Blue accent color for Features navigation item

## Technical Details

### Files Added
- `lib/featureRegistry.ts` - Feature registry with 35+ feature definitions
- `app/features/page.tsx` - Feature Explorer page
- `app/features/flags/page.tsx` - Feature Flags dashboard
- `e2e/features.spec.ts` - Playwright smoke tests
- `docs/RELEASE_NOTES_FEATURE_REGISTRY.md` - This file

### Files Modified
- `components/shell/Sidebar.tsx` - Added Features nav item + blue color support
- `components/shell/MoreMenu.tsx` - Added Features nav item + blue color support

### New Routes
| Route | Description |
|-------|-------------|
| `/features` | Feature Explorer with filterable grid |
| `/features/flags` | Feature Flags dashboard |

## Smoke Tests

New Playwright tests added in `e2e/features.spec.ts`:
- Feature Explorer page loads
- Feature Flags dashboard loads
- Navigation between pages works
- Filtering functionality works
- All 11 core feature routes return 200

Run tests with:
```bash
npx playwright test e2e/features.spec.ts
```

## Environment Variables Checklist

No new environment variables required. All existing feature flags are documented in the Feature Flags dashboard.

To configure flags, add to `.env.local` or Vercel environment:
```bash
# Example: Enable a feature
NEXT_PUBLIC_FEATURE_BOUNDARY_CASE=true

# Example: Disable a feature
NEXT_PUBLIC_FEATURE_SKIP_COMMIT=false
```

## Breaking Changes

None. All changes are additive.

## Migration Notes

- No migration required
- Feature Registry is informational - it doesn't change how features work
- Navigation items added will appear automatically in sidebar and more menu

## Gap Analysis

During this implementation, the following gaps were identified between documentation and implementation:

### Features in Docs but Hidden from Navigation
All documented features exist and are accessible, but some were not prominently discoverable:
- `/drills` - Micro-pattern drills (accessible from study path)
- `/pattern-track/lessons` - Pattern lessons (accessible from pattern track)
- `/pattern-track/practice` - Pattern practice (accessible from pattern track)

### Features Marked as DISABLED
- `FBD_CANVAS` - Free Body Diagram canvas (causes step completion issues)
- `PHASED_SCAFFOLD` - 3-phase scaffold loading (UI issues)

These are correctly marked as DISABLED in the Feature Registry.

### DEV_ONLY Features
Development testing pages exist but are correctly hidden from production:
- `/latex-demo`
- `/dev/time-pressure`
- `/dev/events`
- `/dev/progress-test`
- `/demo/question-engine`
