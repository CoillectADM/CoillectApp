import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  normalizeSensorAlert,
  SensorAlertPayload,
} from './sensor-alert.payload';

async function errorsFor(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(SensorAlertPayload, payload);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property).sort();
}

describe('SensorAlertPayload (contrato do sensor: AlertPayload do diagrama)', () => {
  it('aceita o payload do diagrama { sensorId, percentual, dataHora }', async () => {
    expect(
      await errorsFor({
        sensorId: 'CLT-8472-A',
        percentual: 86,
        dataHora: '2026-11-10T14:32:05-03:00',
      }),
    ).toEqual([]);
  });

  it('dataHora é opcional e pode vir como número (ex.: millis do ESP32)', async () => {
    expect(await errorsFor({ sensorId: 'CLT-8472-A', percentual: 40 })).toEqual([]);
    const dto = plainToInstance(SensorAlertPayload, {
      sensorId: 'CLT-8472-A',
      percentual: 40,
      dataHora: 123456,
    });
    expect(dto.dataHora).toBe('123456');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('continua aceitando o formato antigo { sensorId, level }', async () => {
    expect(await errorsFor({ sensorId: 'CLT-8472-A', level: 85 })).toEqual([]);
  });

  it('aceita percentual enviado como texto numérico', async () => {
    const dto = plainToInstance(SensorAlertPayload, {
      sensorId: 'CLT-8472-A',
      percentual: '72.5',
    });
    expect(dto.percentual).toBe(72.5);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('exige percentual (ou level)', async () => {
    expect(await errorsFor({ sensorId: 'CLT-8472-A' })).toEqual(['percentual']);
  });

  it('rejeita percentual fora de 0–100', async () => {
    expect(await errorsFor({ sensorId: 'CLT-8472-A', percentual: 101 })).toEqual([
      'percentual',
    ]);
    expect(await errorsFor({ sensorId: 'CLT-8472-A', percentual: -1 })).toEqual([
      'percentual',
    ]);
  });

  it('exige sensorId', async () => {
    expect(await errorsFor({ percentual: 50 })).toEqual(['sensorId']);
  });

  it('rejeita campos fora do contrato', async () => {
    expect(
      await errorsFor({ sensorId: 'CLT-8472-A', percentual: 50, extra: true }),
    ).toEqual(['extra']);
  });
});

describe('normalizeSensorAlert', () => {
  it('arredonda o percentual e prefere percentual a level', () => {
    expect(
      normalizeSensorAlert({
        sensorId: ' CLT-8472-A ',
        percentual: 85.6,
        level: 10,
        dataHora: ' 2026-11-10T14:32:05-03:00 ',
      }),
    ).toEqual({
      sensorId: 'CLT-8472-A',
      percentual: 86,
      dataHora: '2026-11-10T14:32:05-03:00',
    });
  });

  it('usa level quando percentual não veio e trata dataHora vazia como nula', () => {
    expect(
      normalizeSensorAlert({ sensorId: 'X', level: 40, dataHora: '  ' }),
    ).toEqual({ sensorId: 'X', percentual: 40, dataHora: null });
  });
});
