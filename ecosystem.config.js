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
      },
      instances: 'max',
      exec_mode: 'cluster',
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
