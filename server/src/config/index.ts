export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mirror',
  },
  minimax: {
    baseUrl: process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.chat/v1',
    apiKey: process.env.MINIMAX_API_KEY ?? '',
    defaultModel: process.env.MINIMAX_DEFAULT_MODEL ?? 'mini-max-01',
    timeoutMs: parseInt(process.env.MINIMAX_TIMEOUT_MS ?? '5000', 10),
  },
  claimDiscovery: {
    enabled: process.env.CLAIM_SCRAPE_ENABLED !== 'false',
    cron: process.env.CLAIM_SCRAPE_CRON ?? '*/120 * * * *',
    maxClaimsPerRun: parseInt(process.env.MAX_CLAIMS_PER_RUN ?? '20', 10),
  },
};
