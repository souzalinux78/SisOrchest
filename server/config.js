import dotenv from 'dotenv'

dotenv.config()

const environment = process.env.NODE_ENV ?? 'development'

const resolveDatabaseName = () => {
  if (environment === 'test') return process.env.DB_NAME_TEST
  if (environment === 'production') return process.env.DB_NAME_PROD
  return process.env.DB_NAME_DEV
}

const databaseName = resolveDatabaseName()

if (!databaseName) {
  throw new Error('DB_NAME_DEV/TEST/PROD não definido para o ambiente atual.')
}

export const config = {
  environment,
  port: Number(process.env.PORT ?? 4000),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  },
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: databaseName,
  },
  bootstrapAdmin: process.env.BOOTSTRAP_ADMIN === 'true',
  admin: {
    name: process.env.ADMIN_NAME ?? 'Administrador',
    email: process.env.ADMIN_EMAIL ?? 'admin@sisorchest.com',
    password: process.env.ADMIN_PASSWORD ?? 'SisOrchest@2026',
    phone: process.env.ADMIN_PHONE ?? null,
  },
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
}
