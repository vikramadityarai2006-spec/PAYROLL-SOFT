import { PrismaClient } from "@prisma/client";

/**
 * Standard Prisma Client singleton for a local SQLite database.
 * The database file location is controlled by DATABASE_URL in .env
 * (default: file:./dev.db, resolved relative to the prisma/ directory).
 *
 * A single instance is reused across hot-reloads in development to avoid
 * exhausting database connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
