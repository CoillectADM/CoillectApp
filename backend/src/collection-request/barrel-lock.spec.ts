import { KeyedLock } from './barrel-lock';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('KeyedLock (uma operação por vez por barril)', () => {
  it('executa em sequência as tarefas da mesma chave, na ordem de chegada', async () => {
    const lock = new KeyedLock();
    let running = 0;
    let maxRunning = 0;
    const order: number[] = [];
    await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        lock.run('barril:1', async () => {
          running += 1;
          maxRunning = Math.max(maxRunning, running);
          await pause(5);
          order.push(n);
          running -= 1;
        }),
      ),
    );
    expect(maxRunning).toBe(1);
    expect(order).toEqual([1, 2, 3, 4, 5]);
    expect(lock.pending).toBe(0);
  });

  it('simula "há coleta aberta? se não, cria": só a primeira cria', async () => {
    const lock = new KeyedLock();
    let open: number | null = null;
    let created = 0;
    const reading = () =>
      lock.run('barril:7', async () => {
        const existing = open;
        await pause(2); // consulta ao banco
        if (existing !== null) return existing;
        created += 1;
        open = created;
        return open;
      });
    const ids = await Promise.all([reading(), reading(), reading(), reading()]);
    expect(created).toBe(1);
    expect(new Set(ids)).toEqual(new Set([1]));
  });

  it('chaves diferentes não esperam umas pelas outras', async () => {
    const lock = new KeyedLock();
    let running = 0;
    let maxRunning = 0;
    await Promise.all(
      ['barril:1', 'barril:2', 'barril:3'].map((key) =>
        lock.run(key, async () => {
          running += 1;
          maxRunning = Math.max(maxRunning, running);
          await pause(5);
          running -= 1;
        }),
      ),
    );
    expect(maxRunning).toBe(3);
  });

  it('erro numa tarefa libera a trava para a próxima', async () => {
    const lock = new KeyedLock();
    const failing = lock.run('barril:9', async () => {
      throw new Error('falhou');
    });
    const next = lock.run('barril:9', async () => 'ok');
    await expect(failing).rejects.toThrow('falhou');
    await expect(next).resolves.toBe('ok');
    expect(lock.pending).toBe(0);
  });
});
