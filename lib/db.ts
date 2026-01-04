import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

// Connection string for Neon (use pooled URL for serverless)
const connectionString = process.env.DATABASE_URL!

// Create Prisma adapter for Neon
const adapter = new PrismaNeon({ connectionString })

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
}

// Re-export types for convenience
export type { PrismaClient } from '@prisma/client'
