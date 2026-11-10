import { Sensor } from './entities/sensor.entity';
import { toSensorView } from './sensor.view';

describe('toSensorView', () => {
  const sensor = {
    id: 1,
    code: 'COI-DEMO-01',
    level: 85,
    threshold: 80,
    capacityLiters: 200,
    lastReadingAt: new Date('2026-11-10T10:00:00Z'),
    lastCollectionAt: null,
    condominium: {
      id: 2,
      name: 'Condomínio Demonstração',
      address: 'Rua das Flores, 120',
      company: { id: 3, name: 'Coleta Verde' },
      sindico: { id: 4, name: 'Síndico Demonstração' },
    },
  } as unknown as Sensor;

  it('monta os campos usados por sensor/mine, sensor/company e admin/overview', () => {
    const view = toSensorView(sensor);
    expect(view).toMatchObject({
      sensorId: 'COI-DEMO-01',
      condominiumName: 'Condomínio Demonstração',
      companyName: 'Coleta Verde',
      sindicoName: 'Síndico Demonstração',
      level: 85,
      threshold: 80,
      estimatedLiters: 170,
      needsCollection: true,
      openRequest: null,
    });
  });

  it('funciona sem condomínio e sem capacidade', () => {
    const view = toSensorView({
      ...sensor,
      condominium: null,
      capacityLiters: null,
      level: 10,
    } as Sensor);
    expect(view.condominiumName).toBeNull();
    expect(view.estimatedLiters).toBeNull();
    expect(view.needsCollection).toBe(false);
  });
});
