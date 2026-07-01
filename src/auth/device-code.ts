import type { HttpClient } from '../http/types.js';
import type { StorageProvider } from '../storage/types.js';
import type { Auth, TokenSet } from './types.js';
import { ApiError, ConfigurationError, SafeguardError } from '../errors.js';
import { SecretValue } from '../secret.js';

/**
 * Public device-code details handed to the caller for display.
 *
 * The raw `device_code` is intentionally NOT exposed — the library owns
 * polling and the caller only needs to render the verification URL and code.
 */
export interface DeviceCodeInfo {
  /** URL the user opens to authenticate (e.g. shown as a QR target or link). */
  verificationUri: string;
  /** Short code the user enters at the verification URL. */
  userCode: string;
  /** Verification URL with the user code pre-filled (RFC 8628 §3.3.1). */
  verificationUriComplete: string;
  /** Seconds until the device code expires. */
  expiresIn: number;
  /** Suggested minimum seconds between poll attempts. */
  interval: number;
}

/**
 * Options for {@link DeviceCodeAuth}.
 */
export interface DeviceCodeAuthOptions {
  /**
   * REQUIRED callback that receives the {@link DeviceCodeInfo} for display.
   * The library performs no display I/O; the caller renders the URL + code
   * (console, DOM, log). May be async; it is awaited before polling begins.
   */
  onDeviceCode: (info: DeviceCodeInfo) => void | Promise<void>;
  /** Identity provider name. Default: 'local'. */
  provider?: string;
  /** OAuth client id. Default: '' (matches other Safeguard SDKs). */
  clientId?: string;
  /** Starting poll interval in seconds. Default: 5. Auto-bumps on `slow_down`. */
  pollingIntervalSeconds?: number;
  /** Cancellation signal applied to HTTP requests and inter-poll delays. */
  signal?: AbortSignal;
}

/** Number of seconds to add to the poll interval on each `slow_down`. */
const SLOW_DOWN_INCREMENT_SECONDS = 5;

interface DeviceLoginResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface TokenPollResponse {
  access_token?: string;
  error?: string;
}

/** Error whose `name` is `AbortError`, matching standard web cancellation. */
class AbortError extends Error {
  constructor(message = 'The operation was aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

/** Reject promptly if the signal is already aborted. */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AbortError();
}

/** Abortable sleep that rejects with an `AbortError` if the signal fires. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError());
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new AbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * OAuth 2.0 Device Authorization Grant (RFC 8628) for Safeguard.
 *
 * Headless display-and-poll only: it requests a device code, hands the public
 * verification details to the required `onDeviceCode` callback, then polls the
 * token endpoint until the user authenticates in their own browser. It never
 * spawns or opens a browser and performs no display I/O. Platform-agnostic, so
 * it is exported from both the Node and browser entry points.
 */
export class DeviceCodeAuth implements Auth {
  readonly #onDeviceCode: (info: DeviceCodeInfo) => void | Promise<void>;
  readonly #provider: string;
  readonly #clientId: string;
  readonly #pollingIntervalSeconds: number;
  readonly #signal: AbortSignal | undefined;

  constructor(options: DeviceCodeAuthOptions) {
    if (typeof options?.onDeviceCode !== 'function') {
      throw new ConfigurationError('DeviceCodeAuth requires an onDeviceCode callback');
    }
    if (options.pollingIntervalSeconds !== undefined && options.pollingIntervalSeconds <= 0) {
      throw new ConfigurationError('pollingIntervalSeconds must be greater than 0');
    }
    this.#onDeviceCode = options.onDeviceCode;
    this.#provider = options.provider ?? 'local';
    this.#clientId = options.clientId ?? '';
    this.#pollingIntervalSeconds = options.pollingIntervalSeconds ?? 5;
    this.#signal = options.signal;
  }

  get description(): string {
    return 'DeviceCodeAuth';
  }

  async authenticate(
    host: string,
    httpClient: HttpClient,
    _storage: StorageProvider,
  ): Promise<TokenSet> {
    const signal = this.#signal;
    throwIfAborted(signal);

    const deviceCode = await this.#requestDeviceCode(host, httpClient, signal);

    const info: DeviceCodeInfo = {
      verificationUri: deviceCode.verification_uri,
      userCode: deviceCode.user_code,
      verificationUriComplete: deviceCode.verification_uri_complete,
      expiresIn: deviceCode.expires_in,
      interval: deviceCode.interval,
    };
    await this.#onDeviceCode(info);

    const accessToken = await this.#poll(host, httpClient, deviceCode, signal);
    return this.#exchangeForUserToken(host, httpClient, accessToken, signal);
  }

  async #requestDeviceCode(
    host: string,
    httpClient: HttpClient,
    signal: AbortSignal | undefined,
  ): Promise<DeviceLoginResponse> {
    const requestOptions = {
      url: `https://${host}/RSTS/oauth2/DeviceLogin`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.#clientId,
        scope: `rsts:sts:primaryproviderid:${this.#provider}`,
      }),
      ...(signal ? { signal } : {}),
    };
    const response = await httpClient.request(requestOptions);

    if (response.status !== 200) {
      // The disabled-grant response is HTML, not JSON — substring match only,
      // never JSON.parse this path.
      if (response.body.toLowerCase().includes('device code grant type is not allowed')) {
        throw new ConfigurationError(
          'Device Code grant is not enabled on this appliance. Enable it under ' +
            'Settings -> OAuth 2.0 Grant Types (Allowed OAuth2 Grant Types must include DeviceCode).',
        );
      }
      throw ApiError.fromResponse(response.status, response.body);
    }

    return JSON.parse(response.body) as DeviceLoginResponse;
  }

  async #poll(
    host: string,
    httpClient: HttpClient,
    deviceCode: DeviceLoginResponse,
    signal: AbortSignal | undefined,
  ): Promise<string> {
    const deadline = Date.now() + deviceCode.expires_in * 1000;
    let intervalSeconds = this.#pollingIntervalSeconds;

    for (;;) {
      throwIfAborted(signal);
      if (Date.now() >= deadline) {
        throw new SafeguardError('Device code authorization timed out before approval');
      }

      await delay(intervalSeconds * 1000, signal);
      throwIfAborted(signal);

      const response = await httpClient.request({
        url: `https://${host}/RSTS/oauth2/token`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode.device_code,
          client_id: this.#clientId,
        }),
        ...(signal ? { signal } : {}),
      });

      const data = JSON.parse(response.body) as TokenPollResponse;

      if (response.status === 200 && data.access_token) {
        return data.access_token;
      }

      switch (data.error) {
        case 'authorization_pending':
          continue;
        case 'slow_down':
          intervalSeconds += SLOW_DOWN_INCREMENT_SECONDS;
          continue;
        case 'access_denied':
          throw new SafeguardError('Device code authorization was denied by the user');
        case 'expired_token':
          throw new SafeguardError('Device code expired before authorization was completed');
        default:
          throw ApiError.fromResponse(response.status, response.body);
      }
    }
  }

  async #exchangeForUserToken(
    host: string,
    httpClient: HttpClient,
    stsAccessToken: string,
    signal: AbortSignal | undefined,
  ): Promise<TokenSet> {
    const response = await httpClient.request({
      url: `https://${host}/service/core/v4/Token/LoginResponse`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stsAccessToken}`,
      },
      body: JSON.stringify({ StsAccessToken: stsAccessToken }),
      ...(signal ? { signal } : {}),
    });

    if (response.status !== 200) {
      throw ApiError.fromResponse(response.status, response.body);
    }

    const userData = JSON.parse(response.body) as { UserToken: string; ExpiresIn?: number };
    const tokenSet: TokenSet = {
      accessToken: new SecretValue(userData.UserToken),
      acquiredAt: Date.now(),
    };
    if (userData.ExpiresIn != null) tokenSet.expiresIn = userData.ExpiresIn;
    return tokenSet;
  }
}
