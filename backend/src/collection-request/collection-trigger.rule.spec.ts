import { evaluateCollectionTrigger } from './collection-trigger.rule';

describe('evaluateCollectionTrigger (regra de disparo da coleta)', () => {
  const base = {
    threshold: 80,
    hasBarrel: true,
    hasOpenRequest: false,
    hasCompany: true,
  };

  it('não dispara abaixo do limite', () => {
    expect(evaluateCollectionTrigger({ ...base, level: 79 })).toEqual({
      create: false,
      reason: 'BELOW_THRESHOLD',
    });
  });

  it('dispara exatamente no limite', () => {
    expect(evaluateCollectionTrigger({ ...base, level: 80 })).toEqual({
      create: true,
      reason: 'THRESHOLD_REACHED',
    });
  });

  it('dispara acima do limite', () => {
    expect(evaluateCollectionTrigger({ ...base, level: 100 }).create).toBe(true);
  });

  it('não duplica quando já existe solicitação aberta', () => {
    expect(
      evaluateCollectionTrigger({ ...base, level: 95, hasOpenRequest: true }),
    ).toEqual({ create: false, reason: 'REQUEST_ALREADY_OPEN' });
  });

  it('não cria quando o sensor não está instalado em um barril', () => {
    expect(
      evaluateCollectionTrigger({ ...base, level: 90, hasBarrel: false }),
    ).toEqual({ create: false, reason: 'SENSOR_NOT_INSTALLED' });
  });

  it('nível abaixo do limite não gera aviso, mesmo sem barril', () => {
    expect(
      evaluateCollectionTrigger({ ...base, level: 30, hasBarrel: false }),
    ).toEqual({ create: false, reason: 'BELOW_THRESHOLD' });
  });

  it('depois de uma coleta, espera o sensor ler o barril vazio', () => {
    expect(
      evaluateCollectionTrigger({ ...base, level: 90, awaitingEmptyReading: true }),
    ).toEqual({ create: false, reason: 'AWAITING_EMPTY_READING' });
  });

  it('leitura abaixo do limite após a coleta é só registrada', () => {
    expect(
      evaluateCollectionTrigger({ ...base, level: 5, awaitingEmptyReading: true }),
    ).toEqual({ create: false, reason: 'BELOW_THRESHOLD' });
  });

  it('solicitação aberta tem prioridade sobre a espera do barril vazio', () => {
    expect(
      evaluateCollectionTrigger({
        ...base,
        level: 90,
        hasOpenRequest: true,
        awaitingEmptyReading: true,
      }),
    ).toEqual({ create: false, reason: 'REQUEST_ALREADY_OPEN' });
  });

  it('não cria sem empresa coletora vinculada', () => {
    expect(
      evaluateCollectionTrigger({ ...base, level: 90, hasCompany: false }),
    ).toEqual({ create: false, reason: 'NO_COMPANY_LINKED' });
  });
});
