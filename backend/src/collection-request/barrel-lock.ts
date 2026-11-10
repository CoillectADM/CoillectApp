/**
 * Uma operação por vez para a mesma chave (aqui: o barril), nesta instância da API.
 *
 * Com vários clientes ao mesmo tempo (ESP32/Wokwi, sensor virtual, "Simular
 * leitura" do app do síndico e "Agendar coleta" do app da empresa), duas
 * leituras do mesmo barril podiam consultar "há coleta aberta?" juntas e as
 * duas criarem uma solicitação. Com a trava, a segunda espera a primeira
 * terminar e já encontra a solicitação aberta: no máximo UMA por barril.
 *
 * Basta para o MVP (uma instância da API). Com várias instâncias, a garantia
 * teria de vir do banco (índice único parcial por barril em aberto).
 */
export class KeyedLock {
  private readonly tails = new Map<string, Promise<void>>();

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    // As promessas guardadas só resolvem (nunca rejeitam): erro de uma tarefa
    // não trava nem derruba a próxima.
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const mine = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => mine);
    this.tails.set(key, tail);
    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }

  /** Chaves com operação em andamento ou na fila (usado nos testes). */
  get pending(): number {
    return this.tails.size;
  }
}

/** Trava compartilhada pelo listener do sensor e pelo "Agendar coleta" da empresa. */
export const barrelLock = new KeyedLock();

export const barrelKey = (barrelId: number): string => `barril:${barrelId}`;
