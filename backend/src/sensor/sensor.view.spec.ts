import { Sensor } from './entities/sensor.entity';
import { toSensorView } from './sensor.view';

describe('toSensorView', () => {
  const now = new Date('2026-11-10T10:10:00Z');
  const sensor = {
    id: 1,
    code: 'CLT-8472-A',
    level: 85,
    lastReadingAt: new Date('2026-11-10T10:00:00Z'),
    barrel: {
      id: 5,
      code: 'BRL-8472',
      capacityLiters: 200,
      alertThreshold: 80,
      lastCollectionAt: null,
      condominium: {
        id: 2,
        name: 'Residencial Aurora',
        address: 'Rua das Acácias, 120',
        neighborhood: 'Jardim Paulista',
        company: { id: 3, name: 'EcoColeta Ambiental' },
        sindico: { id: 4, name: 'Leonardo Costa' },
      },
    },
  } as unknown as Sensor;

  it('monta os campos usados por sensor/mine, sensor/company e admin/overview', () => {
    const view = toSensorView(sensor, null, now);
    expect(view).toMatchObject({
      sensorId: 'CLT-8472-A',
      barrelId: 5,
      barrelCode: 'BRL-8472',
      condominiumName: 'Residencial Aurora',
      condominiumNeighborhood: 'Jardim Paulista',
      companyName: 'EcoColeta Ambiental',
      sindicoName: 'Leonardo Costa',
      level: 85,
      threshold: 80,
      capacityLiters: 200,
      estimatedLiters: 170,
      needsCollection: true,
      online: true,
      openRequest: null,
    });
  });

  it('sensor sem leitura recente fica offline', () => {
    const later = new Date('2026-11-10T12:00:00Z');
    expect(toSensorView(sensor, null, later).online).toBe(false);
    expect(
      toSensorView({ ...sensor, lastReadingAt: null } as Sensor, null, now).online,
    ).toBe(false);
  });

  it('funciona com o sensor ainda não instalado em um barril', () => {
    const view = toSensorView(
      { ...sensor, barrel: null, level: 10 } as Sensor,
      null,
      now,
    );
    expect(view.barrelCode).toBeNull();
    expect(view.condominiumName).toBeNull();
    expect(view.threshold).toBe(80);
    expect(view.estimatedLiters).toBeNull();
    expect(view.needsCollection).toBe(false);
  });
});
