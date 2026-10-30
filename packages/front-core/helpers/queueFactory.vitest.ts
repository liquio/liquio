import { describe, expect, it } from 'vitest';
import queueFactory from 'helpers/queueFactory';

describe('queueFactory', () => {
  it('reuses the same queue instance per id', () => {
    const q1 = queueFactory.get('a');
    const q2 = queueFactory.get('a');
    expect(q1).toBe(q2);
  });

  it('creates a fresh queue after the previous one is killed', () => {
    const q1 = queueFactory.get('b');
    queueFactory.kill('b');
    const q2 = queueFactory.get('b');
    expect(q1).not.toBe(q2);
  });

  it('runs pushed jobs', async () => {
    const q = queueFactory.get('c');
    const result = await new Promise((resolve) => {
      q.push((cb?: (error?: Error) => void) => {
        resolve('done');
        cb?.();
      });
    });
    expect(result).toBe('done');
  });
});
