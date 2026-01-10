# Start Development Server

Start the Next.js development server.

## Usage

```
/dev [options]
```

## Options

- No args: Start on default port (3000)
- `<port>`: Start on specific port

## Instructions

1. Check if port 3000 (or specified port) is already in use
2. If port is in use, offer to kill the existing process or use a different port
3. Start the development server with `npm run dev`
4. Report the server URL when ready
5. Note: The server runs in the background

## Pre-flight Checks

Before starting:
1. Verify node_modules exists (suggest `npm install` if not)
2. Check for .env.local file with required variables
3. Verify DATABASE_URL is set for Prisma

## Required Environment Variables

- `ANTHROPIC_API_KEY`: Required for AI features
- `DATABASE_URL`: Required for database operations
- `REDIS_URL`: Required for caching (optional in dev)

## Examples

- `/dev` - Start on port 3000
- `/dev 3001` - Start on port 3001

## Stopping the Server

Use Ctrl+C in the terminal or run:
```bash
pkill -f "next dev"
```
