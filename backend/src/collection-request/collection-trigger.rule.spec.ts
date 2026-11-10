import { evaluateCollectionTrigger } from './collection-trigger.rule';

describe('evaluateCollectionTrigger (regra de disparo da coleta)', () => {
  const base = { threshold: 80, hasOpenRequest: false, hasCompany: true };

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

  it('não cria sem empresa coletora vinculada', () => {
    expect(
      evaluateCollectionTrigger({ ...base, level: 90, hasCompany: false }),
    ).toEqual({ create: false, reason: 'NO_COMPANY_LINKED' });
  });
});
