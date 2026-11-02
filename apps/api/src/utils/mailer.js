// Email delivery is not configured yet. Until a provider is chosen, messages are written to the
// server log in development so the reset flow can be tried end to end. Nothing is sent.
export async function sendMail({ to, subject, text }, logger = console) {
  if (process.env.NODE_ENV === "production") {
    logger.warn(`Email provider not configured; dropped "${subject}" for ${to}.`);
    return false;
  }
  logger.info(`[mail] to=${to} subject="${subject}"\n${text}`);
  return true;
}
