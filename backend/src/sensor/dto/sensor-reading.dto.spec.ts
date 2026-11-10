import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SensorReadingDto } from './sensor-reading.dto';

async function errorsFor(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(SensorReadingDto, payload);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property);
}

describe('SensorReadingDto (contrato do sensor)', () => {
  it('aceita o payload do contrato', async () => {
    expect(await errorsFor({ sensorId: 'COI-DEMO-01', level: 85 })).toEqual([]);
  });

  it('aceita nível enviado como texto numérico', async () => {
    const dto = plainToInstance(SensorReadingDto, {
      sensorId: 'COI-DEMO-01',
      level: '72.5',
    });
    expect(dto.level).toBe(72.5);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejeita nível fora de 0–100', async () => {
    expect(await errorsFor({ sensorId: 'COI-DEMO-01', level: 101 })).toEqual([
      'level',
    ]);
    expect(await errorsFor({ sensorId: 'COI-DEMO-01', level: -1 })).toEqual([
      'level',
    ]);
  });

  it('exige sensorId', async () => {
    expect(await errorsFor({ level: 50 })).toEqual(['sensorId']);
  });

  it('rejeita campos fora do contrato', async () => {
    expect(
      await errorsFor({ sensorId: 'COI-DEMO-01', level: 50, extra: true }),
    ).toEqual(['extra']);
  });
});
