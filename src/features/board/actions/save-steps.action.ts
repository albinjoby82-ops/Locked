"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { StepSource } from "@prisma/client";

import { prisma } from "@/shared/lib/prisma";
import { actionClient, ActionError } from "@/shared/api/safe-actions";
import { toUtcDay } from "@/features/board/lib/dates";
import { serverAuth } from "@/entities/user/model/get-server-session-user";

/**
 * Type in one step count for one day.
 *
 * PLAN.md keeps steps manual for now — automating them is Step 3 and the
 * Fitbit/Google Health ground is still moving. `source` is stored so a real
 * sync can be added later without anything that reads the table changing.
 */

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** A day's steps. 200k is far past any real walk and catches a fat-fingered paste. */
const saveStepsSchema = z.object({
  day: z.string().regex(DAY_PATTERN, "Expected a YYYY-MM-DD date"),
  steps: z.number().int().min(0).max(200_000),
});

export const saveStepsAction = actionClient.schema(saveStepsSchema).action(async ({ parsedInput: { day, steps } }) => {
  const user = await serverAuth();
  if (!user?.id) throw new ActionError("You need to be signed in to log steps.");

  const parsedDay = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(parsedDay.getTime())) throw new ActionError("That isn't a real date.");

  // No logging steps for next Tuesday.
  if (parsedDay.getTime() > toUtcDay(new Date()).getTime()) {
    throw new ActionError("That day hasn't happened yet.");
  }

  await prisma.stepEntry.upsert({
    where: { userId_day: { userId: user.id, day: parsedDay } },
    update: { steps, source: StepSource.manual },
    create: { userId: user.id, day: parsedDay, steps, source: StepSource.manual },
  });

  revalidatePath("/[locale]/(app)/board", "page");

  return { day, steps };
});
