import { formatEvent, telemetryEnabled } from './telemetry';

describe('eventos JSON para o monitoramento', () => {
  it('uma linha JSON com app, evento, dados e horário', () => {
    const line = formatEvent(
      'leitura_sensor',
      { sensorId: 'CLT-8472-A', percentual: 85 },
      new Date('2026-11-10T06:00:00Z'),
    );
    expect(line).not.toContain('\n');
    expect(JSON.parse(line)).toEqual({
      app: 'coillect-api',
      evento: 'leitura_sensor',
      sensorId: 'CLT-8472-A',
      percentual: 85,
      em: '2026-11-10T06:00:00.000Z',
    });
    expect(line.startsWith('{"app":"coillect-api"')).toBe(true);
  });

  it('ligado por padrão, desligado nos testes ou com LOG_EVENTS=false', () => {
    expect(telemetryEnabled({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(true);
    expect(telemetryEnabled({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(false);
    expect(telemetryEnabled({ NODE_ENV: 'test', LOG_EVENTS: 'true' } as NodeJS.ProcessEnv)).toBe(true);
    expect(telemetryEnabled({ LOG_EVENTS: 'false' } as NodeJS.ProcessEnv)).toBe(false);
  });
});
