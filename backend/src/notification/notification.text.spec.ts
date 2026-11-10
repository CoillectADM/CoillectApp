import { CollectionRequest } from '../collection-request/collection-request.entity';
import {
  empresaNotificationText,
  formatDate,
  sindicoNotificationText,
  helpNotificationTexts,
  helpTopicLabel,
} from './notification.text';

describe('textos das notificações', () => {
  const barrel = {
    id: 5,
    code: 'BRL-8472',
    condominium: { id: 4, name: 'Residencial Aurora' },
  };
  const request = {
    id: 12,
    origin: 'SENSOR',
    levelAtRequest: 86,
    scheduledDate: new Date('2026-11-12T17:00:00Z'),
    company: { id: 2, name: 'EcoColeta Ambiental' },
    user: { id: 1, name: 'Leonardo Costa' },
    barrel,
    sensor: { id: 3, code: 'CLT-8472-A', level: 86, barrel },
  } as unknown as CollectionRequest;

  it('empresa: aviso igual ao do app ("chegou a 86% de capacidade")', () => {
    expect(empresaNotificationText(request, 'COLLECTION_REQUESTED')).toEqual({
      title: 'Nova solicitação de coleta',
      message: 'Residencial Aurora chegou a 86% de capacidade. Barril BRL-8472.',
    });
  });

  it('síndico: cópia informativa com barril, nível e empresa', () => {
    const text = sindicoNotificationText(request, 'COLLECTION_REQUESTED');
    expect(text.title).toBe('Coleta solicitada automaticamente');
    expect(text.message).toBe(
      'O barril BRL-8472 de Residencial Aurora atingiu 86%. A solicitação #12 foi enviada para EcoColeta Ambiental.',
    );
  });

  it('síndico: coleta agendada mostra a data no fuso de São Paulo', () => {
    const text = sindicoNotificationText(request, 'COLLECTION_SCHEDULED');
    expect(text.message).toContain('EcoColeta Ambiental agendou a coleta do barril BRL-8472');
    expect(text.message).toContain(formatDate(request.scheduledDate));
    expect(formatDate(request.scheduledDate)).toMatch(/^12\/11,? 14:00$/);
  });

  it('empresa: cancelamento pelo síndico (fluxo antigo)', () => {
    expect(
      empresaNotificationText(request, 'COLLECTION_CANCELLED').message,
    ).toBe('A solicitação #12 de Residencial Aurora foi cancelada pelo síndico.');
  });
});

describe('textos do "Precisa de ajuda?"', () => {
  const input = {
    sindico: 'Leonardo Costa',
    condominio: 'Residencial Aurora',
    empresa: 'EcoColeta Ambiental',
    assunto: 'COLETA',
    mensagem: 'O barril está quase transbordando.',
  };

  it('empresa recebe o aviso com condomínio, síndico e assunto', () => {
    const { empresa } = helpNotificationTexts(input);
    expect(empresa.title).toBe('Pedido de ajuda • Residencial Aurora');
    expect(empresa.message).toBe('Leonardo Costa (Coleta): O barril está quase transbordando.');
  });

  it('síndico recebe a confirmação; assunto desconhecido vira "Outro assunto"', () => {
    const { sindico } = helpNotificationTexts({ ...input, assunto: 'XYZ' });
    expect(sindico.title).toBe('Pedido de ajuda enviado');
    expect(sindico.message).toContain('EcoColeta Ambiental (assunto: Outro assunto)');
    expect(helpTopicLabel('SENSOR')).toBe('Sensor');
  });

  it('mensagens longas são cortadas no limite da coluna (300)', () => {
    const { empresa } = helpNotificationTexts({ ...input, mensagem: 'x'.repeat(600) });
    expect(empresa.message).toHaveLength(300);
    expect(empresa.message.endsWith('…')).toBe(true);
  });
});
