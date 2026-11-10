import { buildDatabaseOptions } from './database.config';
import { envFlag, resolvePort } from './env';

describe('configuração por variáveis de ambiente', () => {
  it('usa DATABASE_URL quando informada (cloud)', () => {
    const options = buildDatabaseOptions({
      DATABASE_URL: 'postgres://u:p@host:5432/db',
      DATABASE_SSL: 'true',
    }) as any;
    expect(options.url).toBe('postgres://u:p@host:5432/db');
    expect(options.host).toBeUndefined();
    expect(options.ssl).toEqual({ rejectUnauthorized: false });
    expect(options.synchronize).toBe(true);
  });

  it('usa DATABASE_* sem DATABASE_URL (docker-compose/local)', () => {
    const options = buildDatabaseOptions({
      DATABASE_HOST: 'db',
      DATABASE_PORT: '5432',
      DATABASE_USER: 'postgres',
      DATABASE_PASSWORD: 'postgres',
      DATABASE_NAME: 'app_db',
      DATABASE_SYNC: 'false',
    }) as any;
    expect(options).toMatchObject({
      type: 'postgres',
      host: 'db',
      port: 5432,
      username: 'postgres',
      database: 'app_db',
      synchronize: false,
      ssl: false,
    });
  });

  it('lê PORT da plataforma e usa 3000 como padrão', () => {
    expect(resolvePort({ PORT: '10000' })).toBe(10000);
    expect(resolvePort({})).toBe(3000);
    expect(resolvePort({ PORT: 'abc' })).toBe(3000);
  });

  it('interpreta flags booleanas', () => {
    expect(envFlag('true', false)).toBe(true);
    expect(envFlag('1', false)).toBe(true);
    expect(envFlag('false', true)).toBe(false);
    expect(envFlag(undefined, true)).toBe(true);
    expect(envFlag('', false)).toBe(false);
  });
});
