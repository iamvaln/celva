/**
 * Polls an async producer until it yields a truthy value or the timeout
 * elapses, returning the value (or null on timeout).
 *
 * Purpose-built for asserting on fire-and-forget side effects. The
 * @AuditLog interceptor records audit rows *after* the HTTP response is
 * sent (`void this.auditLogs.record(...).catch(...)`), so reading the row
 * once, immediately after the response, races the insert — fine at idle,
 * flaky under the full-suite DB load. Polling makes the assertion tolerant
 * of that intentional asynchrony without masking a genuinely missing write.
 */
export async function waitFor<T>(
  produce: () => Promise<T | null | undefined>,
  { timeoutMs = 2000, intervalMs = 25 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await produce();
    if (value) return value;
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
