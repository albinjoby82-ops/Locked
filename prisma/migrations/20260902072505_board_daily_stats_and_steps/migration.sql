-- CreateEnum
CREATE TYPE "StepSource" AS ENUM ('manual');

-- CreateTable
CREATE TABLE "daily_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "tonnageKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sets" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "steps" INTEGER NOT NULL,
    "source" "StepSource" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_stats_day_idx" ON "daily_stats"("day");

-- CreateIndex
CREATE UNIQUE INDEX "daily_stats_userId_day_key" ON "daily_stats"("userId", "day");

-- CreateIndex
CREATE INDEX "step_entries_day_idx" ON "step_entries"("day");

-- CreateIndex
CREATE UNIQUE INDEX "step_entries_userId_day_key" ON "step_entries"("userId", "day");

-- AddForeignKey
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_entries" ADD CONSTRAINT "step_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
