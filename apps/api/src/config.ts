/**
 * CodeZone · 环境配置
 */
export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: parseInt(process.env.API_PORT ?? process.env.PORT ?? "3001", 10),
  jwtSecret: process.env.JWT_SECRET ?? "codezone-dev-secret-change-in-prod",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
} as const;
