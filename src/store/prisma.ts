import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient | undefined;
let activeDatabaseUrl: string | undefined;

export type PrismaClientOptions = {
  databaseUrl?: string | undefined;
};

/**
 * Process-wide Prisma client. MCP servers are created per request, but database
 * connections are shared for the process.
 */
export function getPrismaClient(options: PrismaClientOptions = {}): PrismaClient {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;

  if (prismaClient) {
    if (
      databaseUrl !== undefined &&
      activeDatabaseUrl !== undefined &&
      databaseUrl !== activeDatabaseUrl
    ) {
      throw new Error('Prisma client already initialized with a different DATABASE_URL');
    }
    return prismaClient;
  }

  activeDatabaseUrl = databaseUrl;
  prismaClient = new PrismaClient(
    databaseUrl !== undefined
      ? {
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        }
      : undefined,
  );
  return prismaClient;
}

/**
 * Resets the singleton for focused tests that simulate a process restart.
 */
export async function resetPrismaClientForTests(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
  }
  prismaClient = undefined;
  activeDatabaseUrl = undefined;
}
