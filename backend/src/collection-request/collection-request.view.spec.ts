import { CollectionRequest } from './collection-request.entity';
import { toRequestView } from './collection-request.view';

describe('toRequestView', () => {
  const condominium = {
    id: 4,
    name: 'Residencial Aurora',
    neighborhood: 'Jardim Paulista',
  };
  const barrel = {
    id: 5,
    code: 'BRL-8472',
    capacityLiters: 200,
    alertThreshold: 80,
    condominium,
  };
  const request = {
    id: 7,
    status: 'PENDING',
    origin: 'SENSOR',
    levelAtRequest: 85,
    requestedAt: new Date('2026-11-10T10:00:00Z'),
    scheduledDate: null,
    completedAt: null,
    updatedAt: new Date('2026-11-10T10:00:00Z'),
    user: { id: 1, name: 'Leonardo Costa', email: 's@x.com', password: 'hash' },
    company: {
      id: 2,
      name: 'EcoColeta Ambiental',
      email: 'e@x.com',
      password: 'hash',
      iconeUrl: null,
    },
    barrel,
    sensor: { id: 3, code: 'CLT-8472-A', level: 90, barrel },
  } as unknown as CollectionRequest;

  it('expõe o barril e o sensor no formato usado pelos apps', () => {
    const view = toRequestView(request);
    expect(view.barrel).toEqual({
      id: 5,
      code: 'BRL-8472',
      capacityLiters: 200,
      threshold: 80,
    });
    expect(view.sensor).toEqual({
      id: 3,
      sensorId: 'CLT-8472-A',
      condominiumId: 4,
      condominiumName: 'Residencial Aurora',
      level: 90,
      threshold: 80,
    });
    expect(view.condominiumName).toBe('Residencial Aurora');
    expect(view.condominiumNeighborhood).toBe('Jardim Paulista');
    expect(view.company?.name).toBe('EcoColeta Ambiental');
    expect(view.user?.name).toBe('Leonardo Costa');
  });

  it('não devolve senhas/hashes', () => {
    const json = JSON.stringify(toRequestView(request));
    expect(json).not.toContain('password');
    expect(json).not.toContain('hash');
  });

  it('usa o barril do sensor quando a solicitação não guardou o barril', () => {
    const view = toRequestView({ ...request, barrel: null } as CollectionRequest);
    expect(view.barrel?.code).toBe('BRL-8472');
    expect(view.condominiumName).toBe('Residencial Aurora');
  });

  it('aceita solicitações antigas sem barril nem sensor', () => {
    const view = toRequestView({
      ...request,
      barrel: null,
      sensor: null,
    } as CollectionRequest);
    expect(view.sensor).toBeNull();
    expect(view.barrel).toBeNull();
    expect(view.condominiumName).toBeNull();
  });
});
