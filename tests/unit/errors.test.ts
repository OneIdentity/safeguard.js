import { describe, it, expect } from 'vitest';
import {
  SafeguardError,
  ApiError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  TransportError,
  ConfigurationError,
} from '../../src/errors.js';

describe('Error hierarchy', () => {
  it('SafeguardError is an instance of Error', () => {
    const err = new SafeguardError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SafeguardError);
    expect(err.name).toBe('SafeguardError');
    expect(err.message).toBe('test');
  });

  it('ApiError has status and body properties', () => {
    const err = new ApiError('HTTP 500', 500, { Message: 'Internal error' });
    expect(err).toBeInstanceOf(SafeguardError);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(500);
    expect(err.body?.Message).toBe('Internal error');
  });

  it('AuthenticationError is a 401 ApiError', () => {
    const err = new AuthenticationError('Unauthorized');
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.name).toBe('AuthenticationError');
  });

  it('AuthorizationError is a 403 ApiError', () => {
    const err = new AuthorizationError('Forbidden');
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.name).toBe('AuthorizationError');
  });

  it('NotFoundError is a 404 ApiError', () => {
    const err = new NotFoundError('Not found');
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.name).toBe('NotFoundError');
  });

  it('TransportError extends SafeguardError', () => {
    const err = new TransportError('Connection refused');
    expect(err).toBeInstanceOf(SafeguardError);
    expect(err.name).toBe('TransportError');
  });

  it('ConfigurationError extends SafeguardError', () => {
    const err = new ConfigurationError('Invalid host');
    expect(err).toBeInstanceOf(SafeguardError);
    expect(err.name).toBe('ConfigurationError');
  });
});

describe('ApiError.fromResponse', () => {
  it('creates AuthenticationError for 401', () => {
    const err = ApiError.fromResponse(401, '{"Message":"Bad credentials"}');
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.message).toBe('HTTP 401: Bad credentials');
    expect(err.body?.Message).toBe('Bad credentials');
  });

  it('creates AuthorizationError for 403', () => {
    const err = ApiError.fromResponse(403, { Message: 'Access denied' });
    expect(err).toBeInstanceOf(AuthorizationError);
    expect(err.message).toBe('HTTP 403: Access denied');
  });

  it('creates NotFoundError for 404', () => {
    const err = ApiError.fromResponse(404, null);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.message).toBe('HTTP 404');
  });

  it('creates generic ApiError for other status codes', () => {
    const err = ApiError.fromResponse(500, { Message: 'Server error' });
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(AuthenticationError);
    expect(err.status).toBe(500);
  });

  it('parses JSON string body', () => {
    const err = ApiError.fromResponse(400, '{"Message":"Validation failed","Code":"INVALID"}');
    expect(err.body?.Message).toBe('Validation failed');
    expect(err.body?.Code).toBe('INVALID');
  });

  it('handles non-JSON string body', () => {
    const err = ApiError.fromResponse(502, 'Bad Gateway');
    expect(err.body?.Message).toBe('Bad Gateway');
  });

  it('uses InnerError.Message as fallback', () => {
    const err = ApiError.fromResponse(400, { InnerError: { Message: 'Inner detail' } });
    expect(err.message).toBe('HTTP 400: Inner detail');
  });
});

describe('ApiError serialization (toJSON) — FP-js-005', () => {
  const sensitiveBody = {
    Message: 'SQL Syntax Error: SELECT * FROM Users WHERE Password=secret',
    Code: 'INTERNAL_ERROR',
    StackTrace: 'at SafeguardSrv.DataLayer.UserStore.Get (line 1487)',
  };

  it('omits body when ApiError is serialized via JSON.stringify', () => {
    const err = new ApiError('HTTP 500: oops', 500, sensitiveBody);
    const serialized = JSON.stringify(err);
    expect(serialized).not.toContain('SQL Syntax Error');
    expect(serialized).not.toContain('SELECT * FROM Users');
    expect(serialized).not.toContain('StackTrace');
    expect(serialized).not.toContain('SafeguardSrv.DataLayer');
  });

  it('includes safe fields (name, message, status) in serialized output', () => {
    const err = new ApiError('HTTP 500: oops', 500, sensitiveBody);
    const parsed = JSON.parse(JSON.stringify(err)) as Record<string, unknown>;
    expect(parsed.name).toBe('ApiError');
    expect(parsed.status).toBe(500);
    expect(parsed.message).toBe('HTTP 500: oops');
    expect(parsed).not.toHaveProperty('body');
  });

  it('preserves body for programmatic access', () => {
    const err = new ApiError('HTTP 500', 500, sensitiveBody);
    expect(err.body?.Message).toBe(sensitiveBody.Message);
    expect(err.body?.StackTrace).toBe(sensitiveBody.StackTrace);
  });

  it('AuthenticationError also omits body when serialized', () => {
    const err = new AuthenticationError('HTTP 401: bad creds', {
      Message: 'Invalid password: hunter2',
    });
    const serialized = JSON.stringify(err);
    expect(serialized).not.toContain('hunter2');
    expect(serialized).not.toContain('Invalid password');
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    expect(parsed.name).toBe('AuthenticationError');
    expect(parsed.status).toBe(401);
  });

  it('AuthorizationError also omits body when serialized', () => {
    const err = new AuthorizationError('HTTP 403', { Message: 'sensitive-detail' });
    const serialized = JSON.stringify(err);
    expect(serialized).not.toContain('sensitive-detail');
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    expect(parsed.status).toBe(403);
  });

  it('NotFoundError also omits body when serialized', () => {
    const err = new NotFoundError('HTTP 404', { Message: 'leaks/internal/path' });
    const serialized = JSON.stringify(err);
    expect(serialized).not.toContain('leaks/internal/path');
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    expect(parsed.status).toBe(404);
  });

  it('toJSON returns null body field as omitted (no body in output)', () => {
    const err = new ApiError('HTTP 500', 500, null);
    const parsed = JSON.parse(JSON.stringify(err)) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty('body');
  });

  it('nested ApiError inside another object is also redacted', () => {
    const err = new ApiError('HTTP 500', 500, sensitiveBody);
    const wrapper = { context: 'request failed', error: err };
    const serialized = JSON.stringify(wrapper);
    expect(serialized).not.toContain('SQL Syntax Error');
    expect(serialized).not.toContain('StackTrace');
  });
});
