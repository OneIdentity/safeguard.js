import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PkceNonInteractiveAuth } from '../../../src/auth/pkce-noninteractive.js';
import { MemoryStorage } from '../../../src/storage/memory.js';
import type { HttpClient } from '../../../src/http/types.js';

const mocks = vi.hoisted(() => ({
  listen: vi.fn(),
  close: vi.fn(),
  server: undefined as unknown as EventEmitter & { listen: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> },
}));

vi.mock('node:http', async () => {
  const { EventEmitter: EE } = await import('node:events');
  return {
    createServer: () => {
      const s = new EE() as EventEmitter & {
        listen: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
      };
      s.listen = mocks.listen;
      s.close = mocks.close;
      mocks.server = s;
      return s;
    },
  };
});

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

describe('PkceNonInteractiveAuth — loopback bind', () => {
  it('binds the callback server to 127.0.0.1 (not 0.0.0.0 / all interfaces)', async () => {
    const auth = new PkceNonInteractiveAuth({ callbackPort: 18400 });
    const httpClient: HttpClient = { request: vi.fn() } as unknown as HttpClient;
    const storage = new MemoryStorage();

    const promise = auth.authenticate('host.example', httpClient, storage).catch(() => {
      /* expected: we abort the flow below */
    });

    // Wait for listen() to be invoked. The authenticate() flow performs
    // several dynamic imports + async crypto operations before binding.
    for (let i = 0; i < 50 && mocks.listen.mock.calls.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }

    expect(mocks.listen).toHaveBeenCalledTimes(1);
    const callArgs = mocks.listen.mock.calls[0]!;
    expect(callArgs[0]).toBe(18400);
    // The hostname argument MUST be the loopback literal — not undefined,
    // not '0.0.0.0', not '::', not 'localhost' (which can resolve to a
    // non-loopback address on misconfigured hosts).
    expect(callArgs[1]).toBe('127.0.0.1');

    // Abort the flow so the promise settles and the test exits cleanly.
    mocks.server.emit('error', new Error('test abort'));
    await promise;
  });
});
