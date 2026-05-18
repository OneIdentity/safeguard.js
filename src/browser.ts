// Browser entry point — excludes Node-only modules (CertificateAuth, fs, tls, undici)
export { BrowserHttpClient } from './http/browser.js';
export type { HttpClient, HttpRequestOptions, HttpResponse } from './http/types.js';
