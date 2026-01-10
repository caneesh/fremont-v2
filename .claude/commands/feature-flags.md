# Feature Flags

View and understand feature flag configuration.

## Usage

```
/feature-flags [flag]
```

## Arguments

- No args: List all feature flags with current status
- `<flag>`: Show details for specific flag

## Instructions

1. Read `lib/featureFlags.ts` to get current flag configuration
2. If no argument:
   - List all flags grouped by status (ON/OFF)
   - Show which are hardcoded vs environment-configurable
3. If flag name provided:
   - Show flag description and purpose
   - Show current value and how to change it
   - Show related files/components that use the flag

## Flag Categories

### Hardcoded (always ON)
- MICRO_TASKS
- MISTAKE_NOTEBOOK
- ERROR_ANTICIPATOR
- DASHBOARD_V3
- SOCRATIC_FIRST_MODE

### Hardcoded (always OFF)
- FBD_CANVAS (disabled: step completion issues)
- PHASED_SCAFFOLD (disabled: UI state issues)

### Environment Configurable
Set via `NEXT_PUBLIC_FEATURE_*` environment variables

## Examples

- `/feature-flags` - List all flags
- `/feature-flags SOCRATIC_TUTOR` - Show details for Socratic Tutor flag
- `/feature-flags PATTERN_FIRST` - Show details for Pattern First mode
