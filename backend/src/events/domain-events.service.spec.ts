import { DomainEventsService } from './domain-events.service';

describe('DomainEventsService', () => {
  it('executa os listeners em ordem e devolve os resultados', async () => {
    const events = new DomainEventsService();
    const calls: string[] = [];
    events.on<number>('x', async (n) => {
      calls.push(`a${n}`);
      return 'A';
    });
    events.on<number>('x', (n) => {
      calls.push(`b${n}`);
      return 'B';
    });
    await expect(events.emit('x', 1)).resolves.toEqual(['A', 'B']);
    expect(calls).toEqual(['a1', 'b1']);
  });

  it('evento sem listeners não falha', async () => {
    await expect(new DomainEventsService().emit('nada', {})).resolves.toEqual([]);
  });

  it('propaga erro do listener para quem emitiu', async () => {
    const events = new DomainEventsService();
    events.on('x', () => {
      throw new Error('falhou');
    });
    await expect(events.emit('x', {})).rejects.toThrow('falhou');
  });
});
