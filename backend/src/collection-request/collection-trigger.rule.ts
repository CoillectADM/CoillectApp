import { CollectionTriggerReason } from '../events/domain-events';

export interface CollectionTriggerInput {
  /** Nível recebido do sensor (%). */
  level: number;
  /** Limite configurado no sensor (%). */
  threshold: number;
  /** Já existe solicitação PENDING/SCHEDULED para o sensor? */
  hasOpenRequest: boolean;
  /** O condomínio do sensor tem empresa coletora vinculada? */
  hasCompany: boolean;
}

export interface CollectionTriggerDecision {
  create: boolean;
  reason: CollectionTriggerReason;
}

/**
 * Regra de disparo da coleta (única para sensor físico e virtual):
 * cria UMA solicitação quando o nível atinge o limite e não há outra aberta.
 */
export function evaluateCollectionTrigger(
  input: CollectionTriggerInput,
): CollectionTriggerDecision {
  if (input.level < input.threshold) {
    return { create: false, reason: 'BELOW_THRESHOLD' };
  }
  if (input.hasOpenRequest) {
    return { create: false, reason: 'REQUEST_ALREADY_OPEN' };
  }
  if (!input.hasCompany) {
    return { create: false, reason: 'NO_COMPANY_LINKED' };
  }
  return { create: true, reason: 'THRESHOLD_REACHED' };
}
