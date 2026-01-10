# Database Operations

Manage the PostgreSQL database via Prisma.

## Usage

```
/db <command>
```

## Commands

- `push`: Push schema changes to database
- `migrate`: Create and run migrations
- `studio`: Open Prisma Studio GUI
- `generate`: Regenerate Prisma client
- `seed`: Run database seed script
- `status`: Show migration status

## Instructions

1. Parse the command argument
2. Run the appropriate npm script:
   - `push`: `npm run db:push`
   - `migrate`: `npm run db:migrate`
   - `studio`: `npm run db:studio`
   - `generate`: `npm run db:generate`
   - `seed`: `npm run db:seed`
   - `status`: `npx prisma migrate status`
3. Report the result
4. For errors, explain the issue and suggest fixes

## Environment Requirements

- `DATABASE_URL`: Pooled connection string (for queries)
- `DIRECT_URL`: Direct connection string (for migrations)

## Examples

- `/db push` - Push schema to database
- `/db migrate` - Create and apply migration
- `/db studio` - Open Prisma Studio
- `/db seed` - Seed the database

## Common Issues

- Connection errors: Check DATABASE_URL is set correctly
- Migration conflicts: May need to reset with `npx prisma migrate reset`
- Schema drift: Use `db push` for development, `db migrate` for production
