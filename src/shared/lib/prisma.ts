import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Cached in production too, not just dev. On a serverless host each instance
// re-evaluates the module graph on cold start but reuses `globalThis` across
// invocations, so skipping this lets clients — and Postgres connections —
// accumulate per instance.
globalForPrisma.prisma = prisma;
