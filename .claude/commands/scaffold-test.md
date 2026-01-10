# Test Scaffold Generation

Test the scaffold generation API with a sample physics problem.

## Usage

```
/scaffold-test [problem]
```

## Arguments

- No args: Use default test problem (inclined plane)
- `<problem>`: Custom physics problem text

## Instructions

1. Ensure development server is running (start if needed)
2. Send POST request to `/api/scaffold/outline` with the problem
3. Display the scaffold outline (steps, concepts, tags)
4. Optionally test step expansion for the first step
5. Report timing and any errors

## Default Test Problem

```
A 2 kg block is released from rest on a 30° rough incline.
The coefficient of kinetic friction is μk = 0.20.
Take g = 10 m/s². Find the block's acceleration.
```

## Expected Response Structure

```json
{
  "success": true,
  "data": {
    "scaffold_id": "...",
    "steps": [...],
    "concepts": [...],
    "tags": { "domain": "mechanics", ... }
  }
}
```

## API Endpoints Tested

1. `POST /api/scaffold/outline` - Phase A (outline)
2. `POST /api/scaffold/step` - Phase B (step expansion)

## Examples

- `/scaffold-test` - Test with default problem
- `/scaffold-test "A ball is thrown at 20 m/s at 45 degrees..."` - Custom problem
