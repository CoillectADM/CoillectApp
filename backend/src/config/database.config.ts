import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { envFlag } from './env';

/**
 * Conexão com o PostgreSQL a partir de variáveis de ambiente.
 *
 * - DATABASE_URL (formato usado por Render, Railway, Neon, Supabase...) tem prioridade.
 * - Sem DATABASE_URL, usa DATABASE_HOST/PORT/USER/PASSWORD/NAME (docker-compose e ambiente local).
 * - DATABASE_SSL=true liga SSL sem validar certificado (bancos gerenciados com acesso externo).
 * - DATABASE_SYNC=false desliga a criação automática das tabelas (padrão: ligada, como já era).
 */
export function buildDatabaseOptions(
  env: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions {
  const common = {
    type: 'postgres' as const,
    autoLoadEntities: true,
    synchronize: envFlag(env.DATABASE_SYNC, true),
    ssl: envFlag(env.DATABASE_SSL, false) ? { rejectUnauthorized: false } : false,
    retryAttempts: Number(env.DATABASE_RETRY_ATTEMPTS || 10),
    retryDelay: 3000,
  };

  if (env.DATABASE_URL) {
    return { ...common, url: env.DATABASE_URL };
  }

  return {
    ...common,
    host: env.DATABASE_HOST || 'localhost',
    port: Number(env.DATABASE_PORT || 5432),
    username: env.DATABASE_USER || 'postgres',
    password: env.DATABASE_PASSWORD ?? 'postgres',
    database: env.DATABASE_NAME || 'app_db',
  };
}
