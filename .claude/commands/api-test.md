# Test API Endpoint

Test any API endpoint in the application.

## Usage

```
/api-test <method> <endpoint> [body]
```

## Arguments

- `<method>`: HTTP method (GET, POST, PUT, DELETE)
- `<endpoint>`: API endpoint path (e.g., /api/scaffold/outline)
- `[body]`: Optional JSON body for POST/PUT requests

## Instructions

1. Ensure development server is running on localhost:3000
2. Construct the full URL: `http://localhost:3000<endpoint>`
3. Send the HTTP request with appropriate headers
4. Display the response (status, headers, body)
5. For errors, analyze and suggest fixes

## Common Endpoints

### Scaffold Generation
- `POST /api/scaffold/outline` - Generate scaffold outline
- `POST /api/scaffold/step` - Expand a step

### Socratic Tutor
- `POST /api/socratic-tutor` - Chat with tutor

### Pattern Track
- `GET /api/pattern-track/patterns` - List patterns
- `GET /api/pattern-track/progress` - Get user progress

### Warm-up
- `POST /api/warmup/start` - Start warm-up session
- `POST /api/warmup/submit` - Submit answers

## Examples

- `/api-test GET /api/pattern-track/patterns`
- `/api-test POST /api/scaffold/outline {"problem": "A 5kg block..."}`
- `/api-test POST /api/socratic-tutor {"stepContext": {...}, "userMessage": "..."}`
