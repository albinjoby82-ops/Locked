/**
 * Transactional email removed — private two-user app with no SMTP configured.
 *
 * Kept as a logging no-op rather than deleted, because better-auth's password
 * reset path still wants a sender. If we ever need a password reset we'll read
 * the link out of the server log.
 */
interface EmailPayload {
  from?: string;
  to: string;
  subject: string;
  text?: string;
  react?: unknown;
}

export const sendEmail = async ({ to, subject, text }: EmailPayload) => {
  console.info(`[email disabled] to=${to} subject=${subject}\n${text ?? ""}`);
  return { skipped: true as const };
};
