import { CollectionTriggerReason } from '../events/domain-events';

export interface CollectionTriggerInput {
  /** Nível recebido do sensor (%). */
  level: number;
  /** limiteAlerta do barril (%). */
  threshold: number;
  /** O sensor está instalado em um barril? */
  hasBarrel: boolean;
  /** Já existe solicitação PENDING/SCHEDULED para o barril? */
  hasOpenRequest: boolean;
  /** O condomínio do barril tem empresa coletora vinculada? */
  hasCompany: boolean;
  /**
   * Houve coleta concluída e o sensor ainda não leu o barril abaixo do limite?
   * (padrão: false)
   */
  awaitingEmptyReading?: boolean;
}

export interface CollectionTriggerDecision {
  create: boolean;
  reason: CollectionTriggerReason;
}

/**
 * Regra de disparo da coleta (única para sensor físico e virtual):
 * cria UMA solicitação por barril quando o nível atinge o limite
 * (`FillLevelCalculator.atingiuLimite` do diagrama) e não há outra aberta.
 * Depois de uma coleta concluída, só volta a disparar quando o sensor já leu
 * o barril abaixo do limite (o barril foi esvaziado de fato).
 */
export function evaluateCollectionTrigger(
  input: CollectionTriggerInput,
): CollectionTriggerDecision {
  if (input.level < input.threshold) {
    return { create: false, reason: 'BELOW_THRESHOLD' };
  }
  if (!input.hasBarrel) {
    return { create: false, reason: 'SENSOR_NOT_INSTALLED' };
  }
  if (input.hasOpenRequest) {
    return { create: false, reason: 'REQUEST_ALREADY_OPEN' };
  }
  if (input.awaitingEmptyReading) {
    return { create: false, reason: 'AWAITING_EMPTY_READING' };
  }
  if (!input.hasCompany) {
    return { create: false, reason: 'NO_COMPANY_LINKED' };
  }
  return { create: true, reason: 'THRESHOLD_REACHED' };
}
