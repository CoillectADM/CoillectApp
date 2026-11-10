import { cloudConfigFromEnv } from './cloud.config';

describe('configuração do armazenamento em nuvem', () => {
  it('sem connection string: modo local', () => {
    const config = cloudConfigFromEnv({} as NodeJS.ProcessEnv);
    expect(config).toMatchObject({
      mode: 'local',
      connectionString: null,
      container: 'comprovantes-coleta',
      queue: 'coillect-notificacoes',
      poisonQueue: 'coillect-notificacoes-poison',
      pollMs: 1000,
      pollMaxMs: 5000,
      maxDequeueCount: 5,
    });
  });

  it('com connection string: modo azure; CLOUD_STORAGE=local força o modo local', () => {
    const env = { AZURE_STORAGE_CONNECTION_STRING: 'UseDevelopmentStorage=true' } as NodeJS.ProcessEnv;
    expect(cloudConfigFromEnv(env).mode).toBe('azure');
    expect(cloudConfigFromEnv({ ...env, CLOUD_STORAGE: 'local' }).mode).toBe('local');
  });

  it('nomes inválidos para o Azure voltam ao padrão', () => {
    const config = cloudConfigFromEnv({
      AZURE_STORAGE_CONTAINER: 'Comprovantes_Coleta',
      AZURE_STORAGE_QUEUE: 'fila-ok',
      QUEUE_POLL_MS: '250',
    } as NodeJS.ProcessEnv);
    expect(config.container).toBe('comprovantes-coleta');
    expect(config.queue).toBe('fila-ok');
    expect(config.pollMs).toBe(250);
  });
});
