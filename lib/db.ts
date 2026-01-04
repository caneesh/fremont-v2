import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Configure Neon for serverless
neonConfig.webSocketConstructor = ws

// Connection pool for Neon
const connectionString = process.env.DATABASE_URL!

// Create a connection pool
const pool = new Pool({ connectionString })

// Create Prisma adapter for Neon
const adapter = new PrismaNeon(pool)

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Helper to disconnect (useful for scripts)
export async function disconnect() {
  await prisma.$disconnect()
  await pool.end()
}

// Re-export types for convenience
export type { PrismaClient } from '@prisma/client'
