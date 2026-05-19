/**
 * Integration tests — Event listener (SignalR).
 *
 * Tests the SafeguardEventListener against a live appliance.
 * Uses a short-lived connection to verify handshake and state transitions.
 *
 * NOTE: These tests verify connection establishment and graceful disconnect.
 * Triggering actual events would require changing passwords/running tasks
 * which is too invasive for a smoke-level integration test.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as signalR from '@microsoft/signalr';
import { requireAppliance } from './setup.js';
import { SafeguardEventListener } from '../../src/events/index.js';
import { PasswordAuth } from '../../src/auth/password.js';
import { NodeHttpClient } from '../../src/http/node.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { IntegrationEnv } from './setup.js';

const env = requireAppliance();

/** The correct SignalR hub URL for Safeguard event notifications. */
const SIGNALR_HUB_PATH = '/service/event/signalr';

/**
 * Build a SignalR HubConnection to the Safeguard event hub.
 */
function buildSignalRConnection(host: string, accessToken: string): signalR.HubConnection {
  // Disable TLS verification for self-signed certs in test
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const url = `https://${host}${SIGNALR_HUB_PATH}`;
  return new signalR.HubConnectionBuilder()
    .withUrl(url, {
      accessTokenFactory: () => accessToken,
    })
    .configureLogging(signalR.LogLevel.None)
    .build();
}

async function getAccessToken(e: IntegrationEnv): Promise<string> {
  const auth = new PasswordAuth({
    username: e.username,
    password: e.password,
    provider: e.provider,
  });
  const httpClient = new NodeHttpClient({ rejectUnauthorized: e.verify });
  const storage = new MemoryStorage();
  const tokenSet = await auth.authenticate(e.host, httpClient, storage);
  httpClient.dispose?.();
  return tokenSet.accessToken;
}

describe('Event Listener', () => {
  let accessToken: string;

  beforeAll(async () => {
    accessToken = await getAccessToken(env);
  });

  it('creates a listener in stopped state', () => {
    const connection = buildSignalRConnection(env.host, accessToken);
    const listener = new SafeguardEventListener(connection);
    expect(listener.state).toBe('stopped');
  });

  it('connects to SignalR and transitions to connected state', async () => {
    const connection = buildSignalRConnection(env.host, accessToken);
    const listener = new SafeguardEventListener(connection);

    await listener.start();
    expect(listener.state).toBe('connected');

    await listener.stop();
    expect(listener.state).toBe('stopped');
  }, 15_000);

  it('stops cleanly after connection', async () => {
    const connection = buildSignalRConnection(env.host, accessToken);
    const listener = new SafeguardEventListener(connection);

    await listener.start();
    expect(listener.state).toBe('connected');

    await listener.stop();
    expect(listener.state).toBe('stopped');
  }, 15_000);
});
