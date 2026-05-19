import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafeguardEventListener } from '../../../src/events/listener.js';
import { PersistentSafeguardEventListener } from '../../../src/events/persistent.js';
import type { EventListenerState } from '../../../src/events/types.js';
import type { Auth, TokenSet } from '../../../src/auth/types.js';
import type { HttpClient, HttpResponse } from '../../../src/http/types.js';
import { SecretValue } from '../../../src/secret.js';
import { MemoryStorage } from '../../../src/storage/memory.js';

// Minimal mock of SignalR HubConnection
function createMockConnection() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const closeCallbacks: (() => void)[] = [];
  const reconnectingCallbacks: (() => void)[] = [];
  const reconnectedCallbacks: (() => void)[] = [];

  return {
    on: vi.fn((method: string, handler: (...args: unknown[]) => void) => {
      handlers[method] = handler;
    }),
    onclose: vi.fn((cb: () => void) => { closeCallbacks.push(cb); }),
    onreconnecting: vi.fn((cb: () => void) => { reconnectingCallbacks.push(cb); }),
    onreconnected: vi.fn((cb: () => void) => { reconnectedCallbacks.push(cb); }),
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    // Test helpers
    _emit(method: string, ...args: unknown[]) { handlers[method]?.(...args); },
    _triggerClose() { closeCallbacks.forEach(cb => cb()); },
    _triggerReconnecting() { reconnectingCallbacks.forEach(cb => cb()); },
    _triggerReconnected() { reconnectedCallbacks.forEach(cb => cb()); },
  };
}

function createMockAuth(): Auth {
  return {
    description: 'MockAuth',
    authenticate: vi.fn(async (): Promise<TokenSet> => ({
      accessToken: new SecretValue('tok'),
      expiresIn: 3600,
      acquiredAt: Date.now(),
    })),
    refreshToken: vi.fn(async (): Promise<TokenSet | null> => ({
      accessToken: new SecretValue('refreshed-tok'),
      expiresIn: 3600,
      acquiredAt: Date.now(),
    })),
  };
}

function createMockHttpClient(): HttpClient {
  return {
    request: vi.fn(async (): Promise<HttpResponse> => ({
      status: 200,
      headers: {},
      body: '{}',
    })),
  };
}

describe('SafeguardEventListener', () => {
  let conn: ReturnType<typeof createMockConnection>;
  let listener: SafeguardEventListener;

  beforeEach(() => {
    conn = createMockConnection();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener = new SafeguardEventListener(conn as any);
  });

  it('starts in stopped state', () => {
    expect(listener.state).toBe('stopped');
  });

  it('transitions to starting then connected on start()', async () => {
    // We can't observe intermediate state from outside without a handler,
    // but we can verify final state
    await listener.start();
    expect(listener.state).toBe('connected');
    expect(conn.start).toHaveBeenCalledOnce();
  });

  it('transitions to stopped on stop()', async () => {
    await listener.start();
    await listener.stop();
    expect(listener.state).toBe('stopped');
    expect(conn.stop).toHaveBeenCalledOnce();
  });

  it('transitions to disconnected on connection close', async () => {
    await listener.start();
    conn._triggerClose();
    expect(listener.state).toBe('disconnected');
  });

  it('transitions to reconnecting when SignalR is reconnecting', async () => {
    await listener.start();
    conn._triggerReconnecting();
    expect(listener.state).toBe('reconnecting');
  });

  it('transitions back to connected on reconnected', async () => {
    await listener.start();
    conn._triggerReconnecting();
    conn._triggerReconnected();
    expect(listener.state).toBe('connected');
  });

  it('dispatches events to registered handlers', async () => {
    const handler = vi.fn();
    listener.on('NotifyEventAsync', handler);
    await listener.start();
    conn._emit('NotifyEventAsync', { EventName: 'UserCreated', UserId: 42 });
    expect(handler).toHaveBeenCalledWith({ EventName: 'UserCreated', UserId: 42 });
  });

  it('supports multiple handlers', async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    listener.on('NotifyEventAsync', h1).on('NotifyEventAsync', h2);
    await listener.start();
    conn._emit('NotifyEventAsync', { EventName: 'Test' });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });
});

describe('PersistentSafeguardEventListener', () => {
  let conn: ReturnType<typeof createMockConnection>;
  let auth: Auth;
  let persistent: PersistentSafeguardEventListener;

  beforeEach(() => {
    vi.useFakeTimers();
    conn = createMockConnection();
    auth = createMockAuth();
    persistent = new PersistentSafeguardEventListener(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conn as any,
      auth,
      'appliance.example.com',
      createMockHttpClient(),
      new MemoryStorage(),
      { retryIntervalMs: 1000 },
    );
  });

  it('starts in stopped state', () => {
    expect(persistent.state).toBe('stopped');
  });

  it('transitions through starting → connected', async () => {
    const states: EventListenerState[] = [];
    persistent.onStateChange(s => states.push(s));
    await persistent.start();
    expect(states).toEqual(['starting', 'connected']);
  });

  it('emits state changes to handlers', async () => {
    const handler = vi.fn();
    persistent.onStateChange(handler);
    await persistent.start();
    expect(handler).toHaveBeenCalledWith('starting');
    expect(handler).toHaveBeenCalledWith('connected');
  });

  it('manual stop prevents reconnect', async () => {
    await persistent.start();
    await persistent.stop();
    expect(persistent.state).toBe('stopped');
    // Simulate close after stop — should NOT trigger reconnect
    conn._triggerClose();
    await vi.advanceTimersByTimeAsync(5000);
    expect(conn.start).toHaveBeenCalledTimes(1); // only the initial start
  });

  it('auto-reconnects on close (with token refresh)', async () => {
    await persistent.start();
    conn._triggerClose();
    expect(persistent.state).toBe('reconnecting');

    // Advance past retry interval
    await vi.advanceTimersByTimeAsync(1100);
    expect(auth.refreshToken).toHaveBeenCalled();
    expect(conn.start).toHaveBeenCalledTimes(2);
    expect(persistent.state).toBe('connected');
  });

  it('respects maxRetries', async () => {
    const limited = new PersistentSafeguardEventListener(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conn as any,
      auth,
      'h',
      createMockHttpClient(),
      new MemoryStorage(),
      { retryIntervalMs: 100, maxRetries: 2 },
    );

    await limited.start();

    // Now make reconnect attempts fail
    conn.start.mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'));

    conn._triggerClose();

    // First retry — fails
    await vi.advanceTimersByTimeAsync(150);
    // Second retry — fails, hits maxRetries
    await vi.advanceTimersByTimeAsync(150);
    expect(limited.state).toBe('stopped');
  });

  it('dispatches events to handlers', async () => {
    const handler = vi.fn();
    persistent.on('NotifyEventAsync', handler);
    await persistent.start();
    conn._emit('NotifyEventAsync', { EventName: 'PasswordChanged' });
    expect(handler).toHaveBeenCalledWith({ EventName: 'PasswordChanged' });
  });

  it('skips token refresh when token is still valid', async () => {
    const freshToken: TokenSet = {
      accessToken: new SecretValue('still-valid'),
      expiresIn: 3600,
      acquiredAt: Date.now(), // just acquired — won't expire for an hour
    };
    const freshListener = new PersistentSafeguardEventListener(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conn as any,
      auth,
      'h',
      createMockHttpClient(),
      new MemoryStorage(),
      { retryIntervalMs: 100 },
      freshToken,
    );

    await freshListener.start();
    conn._triggerClose();

    // Advance past retry interval
    await vi.advanceTimersByTimeAsync(150);
    // Should NOT have called refreshToken or authenticate — token is still valid
    expect(auth.refreshToken).not.toHaveBeenCalled();
    expect(auth.authenticate).not.toHaveBeenCalled();
    expect(conn.start).toHaveBeenCalledTimes(2);
    expect(freshListener.state).toBe('connected');
  });

  it('refreshes token when near expiry on reconnect', async () => {
    const expiredToken: TokenSet = {
      accessToken: new SecretValue('old'),
      expiresIn: 300, // 5 min lifetime
      acquiredAt: Date.now() - 300_000, // acquired 5 min ago — expired
    };
    const expiredListener = new PersistentSafeguardEventListener(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conn as any,
      auth,
      'h',
      createMockHttpClient(),
      new MemoryStorage(),
      { retryIntervalMs: 100 },
      expiredToken,
    );

    await expiredListener.start();
    conn._triggerClose();

    await vi.advanceTimersByTimeAsync(150);
    // Token was expired — should have refreshed
    expect(auth.refreshToken).toHaveBeenCalled();
    expect(expiredListener.state).toBe('connected');
  });
});
