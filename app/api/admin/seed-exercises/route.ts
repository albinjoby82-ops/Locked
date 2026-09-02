import { NextRequest, NextResponse } from "next/server";

import { isOperator } from "@/shared/api/operator-auth";
import { seedExerciseBatch } from "@/features/exercises/lib/seed-exercises";

/**
 * Imports `data/exercises.csv` into the database, so a fresh deployment can be
 * seeded from a browser rather than from a laptop.
 *
 * It works in batches because there are 876 exercises and ~5,100 attribute
 * rows — more than fits in one function invocation. Call it repeatedly with the
 * `nextOffset` it hands back until `done` is true:
 *
 *   /api/admin/seed-exercises            -> first batch
 *   /api/admin/seed-exercises?offset=100 -> the next one
 *
 * Re-running is safe: exercises are matched on their unique slug and their
 * attributes are rewritten rather than appended.
 */

export const dynamic = "force-dynamic";

/** Conservative enough to finish inside a serverless function's time limit. */
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 400;

export async function GET(request: NextRequest) {
  if (!(await isOperator(request))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;

  const offset = Number(searchParams.get("offset") ?? 0);
  if (!Number.isInteger(offset) || offset < 0) {
    return NextResponse.json({ error: "INVALID_PARAMETERS", message: "offset must be a whole number" }, { status: 400 });
  }

  const limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return NextResponse.json({ error: "INVALID_PARAMETERS", message: `limit must be 1-${MAX_LIMIT}` }, { status: 400 });
  }

  try {
    const result = await seedExerciseBatch({ offset, limit });

    return NextResponse.json({
      ok: true,
      ...result,
      next: result.done ? null : `/api/admin/seed-exercises?offset=${result.nextOffset}&limit=${limit}`,
    });
  } catch (error) {
    console.error("Failed to seed exercises:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: String(error) }, { status: 500 });
  }
}
