const TRUE_VALUES = ['1', 'true', 'yes', 'on', 'sim'];

/** Lê uma variável de ambiente booleana ("true", "1", "yes"...) com valor padrão. */
export function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return TRUE_VALUES.includes(value.trim().toLowerCase());
}

/** Porta HTTP: provedores cloud (Render, Railway, Azure...) informam PORT. */
export function resolvePort(env: NodeJS.ProcessEnv = process.env): number {
  const port = Number(env.PORT);
  return Number.isInteger(port) && port > 0 ? port : 3000;
}
