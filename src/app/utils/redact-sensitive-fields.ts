const SENSITIVE_FIELD_NAMES = new Set([
  'recent_feelings_other',
  'trip_prompt_other',
]);

export const REDACTED_VALUE = '[REDACTED]';

/** Returns a deep redacted copy suitable for logs and error-tracking metadata. */
export function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveFields(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(
      ([key, nestedValue]) => [
        key,
        SENSITIVE_FIELD_NAMES.has(key)
          ? REDACTED_VALUE
          : redactSensitiveFields(nestedValue),
      ],
    ),
  );
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : 'Unknown error';
}
