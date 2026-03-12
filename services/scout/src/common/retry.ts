const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isRetryable(err: unknown): boolean {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { status?: number } }).response;
    const status = res?.status;
    if (status === 429 || (status != null && status >= 500)) return true;
    if (status === 404 || status === 400) return false;
  }
  return true;
}

export interface IRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  /** Called when a retry is about to happen. attempt is 1-based. */
  onRetry?: (attempt: number, maxRetries: number, err: unknown) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: IRetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries && isRetryable(err)) {
        options.onRetry?.(attempt + 1, maxRetries, err);
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await sleep(delayMs);
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}
