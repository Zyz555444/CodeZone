/**
 * CodeZone · 环境配置
 */
const DEFAULT_JWT_SECRET = "codezone-dev-secret-change-in-prod";

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET;
  if (process.env.NODE_ENV === "production" && secret === DEFAULT_JWT_SECRET) {
    console.error("[CodeZone] 致命：生产环境必须设置 JWT_SECRET 环境变量，禁止使用默认密钥");
    throw new Error("JWT_SECRET must be set in production");
  }
  return secret;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: parseInt(process.env.API_PORT ?? process.env.PORT ?? "3001", 10),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  githubRedirectUri: process.env.GITHUB_REDIRECT_URI ?? "http://localhost:3001/api/auth/github/callback",
  apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:3001",
} as const;
