import { describe, it, expect, vi, afterEach } from 'vitest';
import { DeviceCodeAuth } from '../../../src/auth/device-code.js';
import type { DeviceCodeInfo, DeviceCodeAuthOptions } from '../../../src/auth/device-code.js';
import { MemoryStorage } from '../../../src/storage/memory.js';
import { SecretValue } from '../../../src/secret.js';
import { ConfigurationError, SafeguardError } from '../../../src/errors.js';
import type { HttpClient, HttpRequestOptions, HttpResponse } from '../../../src/http/types.js';

const storage = new MemoryStorage();

function deviceLoginBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    device_code: 'secret-device-code',
    user_code: 'WDJB-MJHT',
    verification_uri: 'https://appliance.example/RSTS/UserCode',
    verification_uri_complete: 'https://appliance.example/RSTS/UserCode?user_code=WDJB-MJHT',
    expires_in: 300,
    interval: 5,
    ...overrides,
  });
}

function ok(body: string): HttpResponse {
  return { status: 200, headers: {}, body };
}

function err(status: number, body: string): HttpResponse {
  return { status, headers: {}, body };
}

/** Minimal AbortError matching standard web cancellation (name === 'AbortError'). */
function abortError(): Error {
  const e = new Error('aborted');
  e.name = 'AbortError';
  return e;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DeviceCodeAuth — construction', () => {
  it('requires an onDeviceCode callback', () => {
    expect(() => new DeviceCodeAuth({} as unknown as DeviceCodeAuthOptions)).toThrow(
      ConfigurationError,
    );
  });

  it('rejects a non-positive pollingIntervalSeconds', () => {
    expect(
      () => new DeviceCodeAuth({ onDeviceCode: () => undefined, pollingIntervalSeconds: 0 }),
    ).toThrow(ConfigurationError);
  });

  it('exposes a stable description', () => {
    expect(new DeviceCodeAuth({ onDeviceCode: () => undefined }).description).toBe(
      'DeviceCodeAuth',
    );
  });
});

describe('DeviceCodeAuth — disabled grant detection', () => {
  it('throws ConfigurationError on HTML 400 without parsing JSON', async () => {
    const html = '<html><body>OAuth2 device code grant type is not allowed.</body></html>';
    const jsonParse = vi.spyOn(JSON, 'parse');
    const request = vi.fn(async () => err(400, html));
    const auth = new DeviceCodeAuth({ onDeviceCode: vi.fn() });

    await expect(
      auth.authenticate('host', { request } as unknown as HttpClient, storage),
    ).rejects.toBeInstanceOf(ConfigurationError);

    // The DeviceLogin request body is built with JSON.stringify, but the HTML
    // error path must never be JSON.parsed.
    expect(jsonParse).not.toHaveBeenCalledWith(html);
  });
});

describe('DeviceCodeAuth — poll loop', () => {
  it('honors intervals 5s, 5s, 10s across pending -> slow_down -> success', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const pollTimes: number[] = [];
    let deviceCodeShown = false;
    const pollResponses = [
      err(400, JSON.stringify({ error: 'authorization_pending' })),
      err(400, JSON.stringify({ error: 'slow_down' })),
      ok(JSON.stringify({ access_token: 'sts-access-token' })),
    ];
    let pollIndex = 0;

    const request = vi.fn(async (opts: HttpRequestOptions): Promise<HttpResponse> => {
      if (opts.url.includes('DeviceLogin')) return ok(deviceLoginBody());
      if (opts.url.includes('oauth2/token')) {
        expect(deviceCodeShown).toBe(true);
        pollTimes.push(Date.now());
        return pollResponses[pollIndex++]!;
      }
      if (opts.url.includes('Token/LoginResponse')) {
        return ok(JSON.stringify({ UserToken: 'user-token', ExpiresIn: 1200 }));
      }
      throw new Error(`unexpected url ${opts.url}`);
    });

    const onDeviceCode = vi.fn(async () => {
      await Promise.resolve();
      deviceCodeShown = true;
    });
    const auth = new DeviceCodeAuth({ onDeviceCode, pollingIntervalSeconds: 5 });

    const promise = auth.authenticate('host', { request } as unknown as HttpClient, storage);
    await vi.advanceTimersByTimeAsync(60_000);
    const tokenSet = await promise;

    expect(pollTimes).toEqual([5_000, 10_000, 20_000]);
    expect(tokenSet.accessToken).toBeInstanceOf(SecretValue);
    expect(tokenSet.accessToken.expose()).toBe('user-token');
    expect(tokenSet.expiresIn).toBe(1200);
    expect(typeof tokenSet.acquiredAt).toBe('number');
  });

  it('invokes onDeviceCode exactly once with only the public fields', async () => {
    vi.useFakeTimers();
    const request = vi.fn(async (opts: HttpRequestOptions): Promise<HttpResponse> => {
      if (opts.url.includes('DeviceLogin')) return ok(deviceLoginBody());
      if (opts.url.includes('oauth2/token')) return ok(JSON.stringify({ access_token: 'sts' }));
      return ok(JSON.stringify({ UserToken: 'user-token' }));
    });
    const onDeviceCode = vi.fn();
    const auth = new DeviceCodeAuth({ onDeviceCode, pollingIntervalSeconds: 5 });

    const promise = auth.authenticate('host', { request } as unknown as HttpClient, storage);
    await vi.advanceTimersByTimeAsync(10_000);
    await promise;

    expect(onDeviceCode).toHaveBeenCalledTimes(1);
    const info = onDeviceCode.mock.calls[0]![0] as DeviceCodeInfo;
    expect(info).toEqual<DeviceCodeInfo>({
      verificationUri: 'https://appliance.example/RSTS/UserCode',
      userCode: 'WDJB-MJHT',
      verificationUriComplete: 'https://appliance.example/RSTS/UserCode?user_code=WDJB-MJHT',
      expiresIn: 300,
      interval: 5,
    });
    expect(info).not.toHaveProperty('device_code');
  });

  it('throws when the user denies the request (access_denied)', async () => {
    vi.useFakeTimers();
    const request = vi.fn(async (opts: HttpRequestOptions): Promise<HttpResponse> => {
      if (opts.url.includes('DeviceLogin')) return ok(deviceLoginBody());
      return err(400, JSON.stringify({ error: 'access_denied' }));
    });
    const auth = new DeviceCodeAuth({ onDeviceCode: vi.fn(), pollingIntervalSeconds: 5 });

    const promise = auth.authenticate('host', { request } as unknown as HttpClient, storage);
    const expectation = expect(promise).rejects.toBeInstanceOf(SafeguardError);
    await vi.advanceTimersByTimeAsync(10_000);
    await expectation;
  });

  it('throws when the device code expires (expired_token)', async () => {
    vi.useFakeTimers();
    const request = vi.fn(async (opts: HttpRequestOptions): Promise<HttpResponse> => {
      if (opts.url.includes('DeviceLogin')) return ok(deviceLoginBody());
      return err(400, JSON.stringify({ error: 'expired_token' }));
    });
    const auth = new DeviceCodeAuth({ onDeviceCode: vi.fn(), pollingIntervalSeconds: 5 });

    const promise = auth.authenticate('host', { request } as unknown as HttpClient, storage);
    const expectation = expect(promise).rejects.toThrow(/expired/i);
    await vi.advanceTimersByTimeAsync(10_000);
    await expectation;
  });

  it('throws when the appliance deadline (expires_in) elapses', async () => {
    vi.useFakeTimers();
    const request = vi.fn(async (opts: HttpRequestOptions): Promise<HttpResponse> => {
      if (opts.url.includes('DeviceLogin')) return ok(deviceLoginBody({ expires_in: 8 }));
      return err(400, JSON.stringify({ error: 'authorization_pending' }));
    });
    const auth = new DeviceCodeAuth({ onDeviceCode: vi.fn(), pollingIntervalSeconds: 5 });

    const promise = auth.authenticate('host', { request } as unknown as HttpClient, storage);
    const expectation = expect(promise).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(30_000);
    await expectation;
  });
});

describe('DeviceCodeAuth — cancellation', () => {
  it('aborts during an inter-poll delay without issuing the poll request', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const request = vi.fn(async (opts: HttpRequestOptions): Promise<HttpResponse> => {
      if (opts.url.includes('DeviceLogin')) return ok(deviceLoginBody());
      throw new Error('poll request should not be issued after abort');
    });
    const auth = new DeviceCodeAuth({
      onDeviceCode: vi.fn(),
      pollingIntervalSeconds: 5,
      signal: controller.signal,
    });

    const promise = auth.authenticate('host', { request } as unknown as HttpClient, storage);
    await vi.advanceTimersByTimeAsync(2_000); // mid-delay, before the 5s poll fires
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    // Only the DeviceLogin request was issued; the poll never fired.
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('aborts during an in-flight poll HTTP request', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const request = vi.fn(async (opts: HttpRequestOptions): Promise<HttpResponse> => {
      if (opts.url.includes('DeviceLogin')) return ok(deviceLoginBody());
      // Poll request hangs until the signal aborts.
      return new Promise<HttpResponse>((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => {
          reject(abortError());
        });
      });
    });
    const auth = new DeviceCodeAuth({
      onDeviceCode: vi.fn(),
      pollingIntervalSeconds: 5,
      signal: controller.signal,
    });

    const promise = auth.authenticate('host', { request } as unknown as HttpClient, storage);
    await vi.advanceTimersByTimeAsync(5_000); // fire the delay -> poll request is now in flight
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
