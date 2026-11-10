import { CollectionRequest } from './collection-request.entity';
import { toRequestView } from './collection-request.view';

describe('toRequestView', () => {
  const request = {
    id: 7,
    status: 'PENDING',
    origin: 'SENSOR',
    levelAtRequest: 85,
    requestedAt: new Date('2026-11-10T10:00:00Z'),
    scheduledDate: null,
    completedAt: null,
    updatedAt: new Date('2026-11-10T10:00:00Z'),
    user: { id: 1, name: 'Síndico', email: 's@x.com', password: 'hash' },
    company: { id: 2, name: 'Coleta Verde', email: 'e@x.com', password: 'hash', iconeUrl: null },
    sensor: {
      id: 3,
      code: 'COI-DEMO-01',
      level: 90,
      threshold: 80,
      condominium: { id: 4, name: 'Condomínio Demonstração' },
    },
  } as unknown as CollectionRequest;

  it('expõe o sensor no formato usado pelos apps', () => {
    const view = toRequestView(request);
    expect(view.sensor).toEqual({
      id: 3,
      sensorId: 'COI-DEMO-01',
      condominiumId: 4,
      condominiumName: 'Condomínio Demonstração',
      level: 90,
      threshold: 80,
    });
    expect(view.condominiumName).toBe('Condomínio Demonstração');
    expect(view.company?.name).toBe('Coleta Verde');
    expect(view.user?.name).toBe('Síndico');
  });

  it('não devolve senhas/hashes', () => {
    const json = JSON.stringify(toRequestView(request));
    expect(json).not.toContain('password');
    expect(json).not.toContain('hash');
  });

  it('aceita solicitações antigas sem sensor', () => {
    const view = toRequestView({ ...request, sensor: null } as CollectionRequest);
    expect(view.sensor).toBeNull();
    expect(view.condominiumName).toBeNull();
  });
});
