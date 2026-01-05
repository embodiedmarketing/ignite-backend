import { sleep } from './sleep';

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  const errorMessage = (error?.message || '').toLowerCase();
  
  return (
    error?.status === 429 || // Rate limit
    error?.status === 502 || // Bad Gateway
    error?.status === 503 || // Service unavailable
    error?.status === 504 || // Gateway timeout
    (error?.status >= 500 && error?.status < 600) || // Any 5xx server error
    error?.code === 'ECONNRESET' || // Connection reset
    error?.code === 'ETIMEDOUT' || // Timeout
    error?.name === 'AbortError' || // Timeout abort
    errorMessage.includes('timeout') ||
    errorMessage.includes('aborted') ||
    errorMessage.includes('fetch failed') || // Network fetch failures
    errorMessage.includes('network') || // General network errors
    errorMessage.includes('invalid email count') || // AI didn't generate expected count
    errorMessage.includes('invalid response format') || // AI returned bad format
    errorMessage.includes('missing required fields') || // AI output missing fields
    errorMessage.includes('no content received') || // AI returned empty response
    errorMessage.includes('unexpected token') || // JSON parse error
    errorMessage.includes('json') || // Other JSON parsing errors
    error instanceof SyntaxError || // JSON.parse failed
    error instanceof TypeError // Fetch/network type errors
  );
}

/**
 * Generic retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    context?: string;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    context = '',
    onRetry
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const isRetryable = isRetryableError(error);
      
      if (onRetry) {
        onRetry(attempt, error);
      } else {
        console.error(`${context ? `[${context}] ` : ''}Attempt ${attempt + 1}/${maxRetries + 1} failed:`, {
          error: error?.message,
          status: error?.status,
          code: error?.code,
          isRetryable
        });
      }
      
      // If this is the last attempt or error is not retryable, throw
      if (attempt === maxRetries || !isRetryable) {
        if (context) {
          console.error(`[${context}] All retries exhausted or non-retryable error`);
        }
        throw lastError;
      }
      
      // Calculate delay with exponential backoff and optional jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), 60000); // Cap at 60 seconds
      const jitter = Math.random() * 2000; // Add up to 2 seconds of random jitter
      const delay = exponentialDelay + jitter;
      
      // Check for retry-after header from Anthropic
      const retryAfterMs = error?.headers?.['retry-after-ms'] 
        ? parseInt(error.headers['retry-after-ms']) 
        : delay;
      
      if (context) {
        console.log(`[${context}] Retrying in ${Math.round(retryAfterMs / 1000)}s (attempt ${attempt + 1}/${maxRetries + 1})...`);
      }
      await sleep(retryAfterMs);
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error("Failed after all retries");
}

