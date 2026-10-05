export type CorsSettings = {
  origin: string | string[];
  credentials: boolean;
};

/**
 * Credentialed browser requests cannot use a wildcard origin. Until specific
 * frontend origins are configured, this API accepts any origin using its
 * bearer-token authentication flow (not cookies).
 */
export function getCorsSettings(
  configuredOrigins = process.env.CORS_ALLOW_ORIGINS,
): CorsSettings {
  const origins = (configuredOrigins || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length
    ? { origin: origins, credentials: true }
    : { origin: '*', credentials: false };
}
