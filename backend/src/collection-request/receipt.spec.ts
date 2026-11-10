import { CollectionRequest } from './collection-request.entity';
import { buildReceipt, receiptBlobName, receiptProtocol } from './receipt';

describe('comprovante de coleta (Blob Storage)', () => {
  const barrel = {
    id: 5,
    code: 'BRL-8472',
    capacityLiters: 200,
    alertThreshold: 80,
    condominium: {
      id: 4,
      name: 'Residencial Aurora',
      address: 'Rua das Acácias, 120 - São Paulo/SP',
      neighborhood: 'Jardim Paulista',
    },
  };
  const request = {
    id: 12,
    status: 'COMPLETED',
    origin: 'SENSOR',
    levelAtRequest: 86,
    requestedAt: new Date('2026-11-10T05:00:00Z'),
    scheduledDate: new Date('2026-11-10T05:30:00Z'),
    completedAt: new Date('2026-11-10T06:15:00Z'),
    user: { id: 1, name: 'Leonardo Costa', email: 'sindico@coillect.com' },
    company: { id: 2, name: 'EcoColeta Ambiental', cnpj: '11222333000181' },
    barrel,
    sensor: { id: 3, code: 'CLT-8472-A', level: 0, barrel },
  } as unknown as CollectionRequest;

  it('nome do blob: pastas por data da conclusão (UTC) e id da solicitação', () => {
    expect(receiptBlobName(request)).toBe('2026/11/10/coleta-12-20261110T061500Z.json');
    expect(receiptProtocol(12)).toBe('COL-000012');
  });

  it('conteúdo: condomínio, síndico, empresa, barril, sensor e volume estimado', () => {
    const receipt = buildReceipt(
      request,
      { provider: 'Azure Blob Storage', container: 'comprovantes-coleta', name: 'a.json' },
      new Date('2026-11-10T06:15:01Z'),
    );
    expect(receipt).toEqual({
      tipo: 'comprovante-de-coleta',
      versao: 1,
      protocolo: 'COL-000012',
      solicitacaoId: 12,
      origem: 'SENSOR',
      condominio: {
        nome: 'Residencial Aurora',
        endereco: 'Rua das Acácias, 120 - São Paulo/SP',
        bairro: 'Jardim Paulista',
      },
      sindico: { nome: 'Leonardo Costa', email: 'sindico@coillect.com' },
      empresaColetora: { nome: 'EcoColeta Ambiental', cnpj: '11222333000181' },
      barril: { codigo: 'BRL-8472', capacidadeLitros: 200, limiteAlertaPercentual: 80 },
      sensor: 'CLT-8472-A',
      nivelNoAlertaPercentual: 86,
      volumeEstimadoLitros: 172,
      solicitadaEm: '2026-11-10T05:00:00.000Z',
      agendadaPara: '2026-11-10T05:30:00.000Z',
      concluidaEm: '2026-11-10T06:15:00.000Z',
      emitidoEm: '2026-11-10T06:15:01.000Z',
      armazenamento: { provedor: 'Azure Blob Storage', container: 'comprovantes-coleta', blob: 'a.json' },
    });
  });

  it('sem capacidade ou sem nível no alerta, o volume fica nulo', () => {
    const manual = { ...request, levelAtRequest: null } as unknown as CollectionRequest;
    expect(
      buildReceipt(manual, { provider: 'p', container: 'c', name: 'n' }).volumeEstimadoLitros,
    ).toBeNull();
  });
});
