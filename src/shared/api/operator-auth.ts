import { NextRequest } from "next/server";

import { env } from "@/env";
import { serverAuth } from "@/entities/user/model/get-server-session-user";

/**
 * Gate for the maintenance routes — the nightly stats rebuild and the exercise
 * seed. Either the `CRON_SECRET` bearer token (how a scheduler or a curl calls
 * them) or a signed-in session (how you run one by hand from a browser).
 *
 * With no CRON_SECRET set only the session path works, so an unconfigured
 * deployment can't be poked by a stranger. And a session is a real gate here:
 * ALLOWED_EMAILS means only the two of us can ever hold one.
 */
export async function isOperator(request: NextRequest): Promise<boolean> {
  const secret = env.CRON_SECRET;

  if (secret && request.headers.get("authorization") === `Bearer ${secret}`) {
    return true;
  }

  return Boolean(await serverAuth());
}
