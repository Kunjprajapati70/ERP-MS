const request = require('supertest');

/**
 * Phase 0 smoke test — does not require MongoDB when importing app alone.
 * Full integration tests with Atlas/memory server arrive in later phases.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/erp-test-unused';

const app = require('../app');

describe('GET /api/v1/health', () => {
  it('returns a structured health payload', async () => {
    const res = await request(app).get('/api/v1/health');

    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('service', 'erp-api');
    expect(res.body.data).toHaveProperty('database');
  });
});

describe('GET /unknown', () => {
  it('returns consistent 404 error shape', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ROUTE_NOT_FOUND');
  });
});
