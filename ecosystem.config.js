module.exports = {
  apps: [
    {
      name: 'codezone-backend',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 10101,
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      },
      // Socket.IO 需要 sticky session；未配置负载均衡粘性时保持单实例
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      watch: false,
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'codezone-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 12321,
      },
      max_memory_restart: '512M',
    },
  ],
};
