import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { NodeHttpClient } from '../../../src/http/node.js';
import { TransportError } from '../../../src/errors.js';

/**
 * Regression tests for FP-js-002 — response-body size cap.
 *
 * Uses a real local HTTP server (no mocking of undici) so that the size-cap
 * enforcement is exercised end-to-end through the actual streaming path.
 */
describe('NodeHttpClient — response size cap (FP-js-002)', () => {
  let server: Server;
  let port: number;
  /** Per-request handler set by each test. */
  let handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void = () => undefined;

  beforeAll(async () => {
    server = createServer((req, res) => handler(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => { resolve(); }));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => { resolve(); }));
  });

  const url = (path = '/'): string => `http://127.0.0.1:${String(port)}${path}`;

  it('accepts a normal-sized response under the default 10 MB cap', async () => {
    const payload = JSON.stringify({ hello: 'world' });
    handler = (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Length', String(Buffer.byteLength(payload)));
      res.end(payload);
    };
    const client = new NodeHttpClient();
    try {
      const resp = await client.request({ url: url(), method: 'GET' });
      expect(resp.status).toBe(200);
      expect(JSON.parse(resp.body)).toEqual({ hello: 'world' });
    } finally {
      client.dispose();
    }
  });

  it('rejects up-front when Content-Length exceeds the default 10 MB cap', async () => {
    handler = (_req, res) => {
      // Lie about Content-Length — server will be disconnected before sending real data.
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', String(50 * 1024 * 1024));
      res.write(Buffer.alloc(1024));
      // Do not call res.end(); client should abort.
    };
    const client = new NodeHttpClient();
    try {
      await expect(client.request({ url: url(), method: 'GET' })).rejects.toThrow(TransportError);
      await expect(client.request({ url: url(), method: 'GET' })).rejects.toThrow(/exceeds maximum allowed size/i);
    } finally {
      client.dispose();
    }
  });

  it('rejects when streamed body exceeds the cap without Content-Length', async () => {
    handler = (_req, res) => {
      res.setHeader('Content-Type', 'application/octet-stream');
      // Use chunked transfer (no Content-Length). Write more than the per-request limit.
      const chunk = Buffer.alloc(64 * 1024, 0x41);
      let written = 0;
      const target = 2 * 1024 * 1024; // 2 MB; per-request limit will be 1 MB
      const writeMore = (): void => {
        while (written < target) {
          if (!res.write(chunk)) {
            res.once('drain', writeMore);
            return;
          }
          written += chunk.length;
        }
        res.end();
      };
      writeMore();
    };
    const client = new NodeHttpClient();
    try {
      await expect(
        client.request({ url: url(), method: 'GET', maxResponseSize: 1024 * 1024 }),
      ).rejects.toThrow(TransportError);
    } finally {
      client.dispose();
    }
  });

  it('honors per-request maxResponseSize override (raise above default)', async () => {
    const big = Buffer.alloc(12 * 1024 * 1024, 0x42); // 12 MB
    handler = (_req, res) => {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', String(big.length));
      res.end(big);
    };
    const client = new NodeHttpClient();
    try {
      // Default 10 MB would reject this; raising to 20 MB should accept.
      const resp = await client.request({
        url: url(),
        method: 'GET',
        maxResponseSize: 20 * 1024 * 1024,
      });
      expect(resp.status).toBe(200);
      expect(Buffer.byteLength(resp.body)).toBe(big.length);
    } finally {
      client.dispose();
    }
  });

  it('honors NodeHttpClient constructor default when no per-request override', async () => {
    const payload = Buffer.alloc(200 * 1024, 0x43); // 200 KB
    handler = (_req, res) => {
      res.setHeader('Content-Length', String(payload.length));
      res.end(payload);
    };
    // Set client-wide limit to 100 KB — request should fail.
    const client = new NodeHttpClient(undefined, { maxResponseSize: 100 * 1024 });
    try {
      await expect(client.request({ url: url(), method: 'GET' })).rejects.toThrow(TransportError);
    } finally {
      client.dispose();
    }
  });

  it('clamps configured maxResponseSize to the upper bound (100 MB)', async () => {
    const payload = JSON.stringify({ ok: true });
    handler = (_req, res) => {
      res.setHeader('Content-Length', String(Buffer.byteLength(payload)));
      res.end(payload);
    };
    // Caller tries to set absurdly high value — should be clamped, not thrown.
    const client = new NodeHttpClient(undefined, { maxResponseSize: 10 * 1024 * 1024 * 1024 });
    try {
      const resp = await client.request({ url: url(), method: 'GET' });
      expect(resp.status).toBe(200);
    } finally {
      client.dispose();
    }
  });
});
