import { Injectable, Logger } from '@nestjs/common';

export type DomainEventHandler<T = unknown> = (
  payload: T,
) => unknown | Promise<unknown>;

/**
 * Barramento de eventos em memória (sem filas, sem dependências novas).
 *
 * Os listeners se registram com on(); emit() executa cada listener em ordem,
 * aguarda o término e devolve os resultados. Assim a requisição do sensor só
 * responde depois que o listener decidiu se cria ou não a solicitação de coleta.
 */
@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);
  private readonly handlers = new Map<string, DomainEventHandler[]>();

  on<T>(event: string, handler: DomainEventHandler<T>): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as DomainEventHandler);
    this.handlers.set(event, list);
  }

  async emit<T>(event: string, payload: T): Promise<unknown[]> {
    const list = this.handlers.get(event) ?? [];
    this.logger.debug(`${event} → ${list.length} listener(s)`);
    const results: unknown[] = [];
    for (const handler of list) {
      results.push(await handler(payload));
    }
    return results;
  }

  listenerCount(event: string): number {
    return this.handlers.get(event)?.length ?? 0;
  }
}
