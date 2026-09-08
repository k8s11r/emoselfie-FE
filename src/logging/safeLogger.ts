type LogContext = Record<string, string | number | boolean | null | undefined>;

const forbiddenKey = /(image|blob|token|slug|invite|nickname|uuid|cookie|authorization)/i;

function sanitize(context: LogContext): LogContext {
  return Object.fromEntries(Object.entries(context).map(([key, value]) => [key, forbiddenKey.test(key) ? '[redacted]' : value]));
}

export const safeLogger = {
  error(message: string, context: LogContext = {}) {
    console.error(message, sanitize(context));
  },
  warn(message: string, context: LogContext = {}) {
    console.warn(message, sanitize(context));
  },
};

