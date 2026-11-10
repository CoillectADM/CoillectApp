import { Sensor } from './entities/sensor.entity';
import { Condominium } from './entities/condominium.entity';
import { DEFAULT_ALERT_THRESHOLD } from './entities/barrel.entity';

/**
 * Relações para montar as visões e disparar a coleta:
 * sensor → barril → condomínio → síndico e empresa coletora.
 */
export const SENSOR_RELATIONS = {
  barrel: { condominium: { company: true, sindico: true } },
} as const;

/** Condomínio do sensor (pelo barril em que está instalado). */
export function condominiumOf(
  sensor: Sensor | null | undefined,
): Condominium | null {
  return sensor?.barrel?.condominium ?? null;
}

/** limiteAlerta do barril do sensor (80% enquanto não estiver instalado). */
export function thresholdOf(sensor: Sensor | null | undefined): number {
  return sensor?.barrel?.alertThreshold ?? DEFAULT_ALERT_THRESHOLD;
}

/** Janela (min) em que um sensor que enviou leitura é considerado "ativo". */
export function onlineWindowMinutes(): number {
  const value = Number(process.env.SENSOR_ONLINE_MINUTES);
  return Number.isFinite(value) && value > 0 ? value : 30;
}

export function isOnline(sensor: Sensor, now: Date = new Date()): boolean {
  if (!sensor.lastReadingAt) return false;
  const age = now.getTime() - new Date(sensor.lastReadingAt).getTime();
  return age <= onlineWindowMinutes() * 60_000;
}
