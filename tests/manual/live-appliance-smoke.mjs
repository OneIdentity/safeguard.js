/**
 * Live appliance pass-after smoke test for FP-js-002 + FP-js-005.
 * Read-only: only issues a single anonymous GET against the appliance
 * landing endpoint; creates no assets, holds no lease.
 *
 * Run from package root after `npm run build`:
 *   node tests/manual/live-appliance-smoke.mjs
 *
 * Environment:
 *   SPP_HOST (optional, default 192.168.117.15)
 */
import { NodeHttpClient, ApiError, TransportError } from '../../dist/index.js';

const host = process.env.SPP_HOST ?? '192.168.117.15';

async function main() {
  const http = new NodeHttpClient({ rejectUnauthorized: false });
  try {
    console.log(`[smoke] GET https://${host}/  (FP-js-002 happy path under default 10 MB cap)`);
    const resp = await http.request({ url: `https://${host}/`, method: 'GET' });
    console.log(`[smoke]   -> status=${resp.status} bytes=${resp.body.length}`);
    if (resp.body.length > 10 * 1024 * 1024) throw new Error('unexpected: body > 10 MB');

    console.log(`[smoke] GET https://${host}/service/core/v4/__nope__  (FP-js-005 ApiError redaction)`);
    const errResp = await http.request({
      url: `https://${host}/service/core/v4/__nope__`,
      method: 'GET',
    });
    if (errResp.status < 400) {
      console.log(`[smoke]   -> unexpected status ${errResp.status}; skipping FP-005 check`);
    } else {
      const apiErr = ApiError.fromResponse(errResp.status, errResp.body);
      const serialized = JSON.stringify(apiErr);
      console.log(`[smoke]   -> status=${errResp.status} serialized=${serialized}`);
      const parsed = JSON.parse(serialized);
      if (Object.prototype.hasOwnProperty.call(parsed, 'body')) {
        throw new Error('FP-js-005 regression: serialized ApiError contains body');
      }
      console.log('[smoke]   -> body successfully redacted from serialization');
    }

    console.log(`[smoke] artificial low cap pass-after (FP-js-002 enforcement)`);
    try {
      await http.request({
        url: `https://${host}/`,
        method: 'GET',
        maxResponseSize: 16,
      });
      throw new Error('FP-js-002 regression: 16-byte cap was not enforced');
    } catch (err) {
      if (!(err instanceof TransportError)) throw err;
      console.log(`[smoke]   -> TransportError as expected: ${err.message}`);
    }

    console.log('[smoke] OK');
  } finally {
    http.dispose();
  }
}

main().catch((err) => {
  console.error('[smoke] FAIL', err);
  process.exit(1);
});
