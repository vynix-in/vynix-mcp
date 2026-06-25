export interface VynixConfig {
  apiUrl: string;
  token?: string;
  email?: string;
  password?: string;
}

/** Reads connection settings from the environment. */
export function loadConfig(): VynixConfig {
  const apiUrl = (process.env.VYNIX_API_URL || 'https://www.vynix.in').replace(/\/+$/, '');

  return {
    apiUrl,
    token: process.env.VYNIX_API_TOKEN || undefined,
    email: process.env.VYNIX_API_EMAIL || undefined,
    password: process.env.VYNIX_API_PASSWORD || undefined,
  };
}

/**
 * Validate that credentials are present, throwing a clear, actionable error at startup
 * rather than failing on the first tool call. A token alone is enough; otherwise both an
 * email and a password are required for the login + refresh flow.
 */
export function assertConfigured(config: VynixConfig): void {
  if (config.token) {
    return;
  }
  if (config.email && config.password) {
    return;
  }
  throw new Error(
    'Vynix MCP server is not configured. Set VYNIX_API_TOKEN, or both VYNIX_API_EMAIL and ' +
      'VYNIX_API_PASSWORD, in the server environment.',
  );
}
