const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-phase1';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = require('../app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const { ROLES, ROLE_PERMISSIONS } = require('../src/constants/roles');

const hasAtlas = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<user>');

const describeIfDb = hasAtlas ? describe : describe.skip;

describeIfDb('Auth API (requires MONGODB_URI)', () => {
  let salesRole;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    salesRole = await Role.findOneAndUpdate(
      { name: ROLES.SALES_EXECUTIVE },
      {
        name: ROLES.SALES_EXECUTIVE,
        displayName: 'Sales Executive',
        permissions: ROLE_PERMISSIONS[ROLES.SALES_EXECUTIVE],
        isSystem: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: /phase1\.test@erp\.local$/i });
    await mongoose.disconnect();
  });

  const testEmail = `phase1.test@erp.local`;

  beforeEach(async () => {
    await User.deleteMany({ email: testEmail });
  });

  it('registers a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Phase',
      lastName: 'One',
      email: testEmail,
      password: 'Test@12345',
      roleName: ROLES.SALES_EXECUTIVE,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);
    expect(salesRole).toBeTruthy();
  });

  it('rejects weak passwords', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Phase',
      lastName: 'One',
      email: testEmail,
      password: 'weak',
    });

    expect(res.statusCode).toBe(422);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('logs in and returns current user', async () => {
    await request(app).post('/api/v1/auth/register').send({
      firstName: 'Phase',
      lastName: 'One',
      email: testEmail,
      password: 'Test@12345',
      roleName: ROLES.SALES_EXECUTIVE,
    });

    const login = await request(app).post('/api/v1/auth/login').send({
      email: testEmail,
      password: 'Test@12345',
    });

    expect(login.statusCode).toBe(200);
    const token = login.body.data.token;

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(me.statusCode).toBe(200);
    expect(me.body.data.user.email).toBe(testEmail);
  });

  it('rejects unauthenticated /me', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

describe('Auth validation without DB dependency', () => {
  it('rejects invalid login payload', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'not-an-email',
      password: '',
    });
    expect(res.statusCode).toBe(422);
    expect(res.body.success).toBe(false);
  });
});
