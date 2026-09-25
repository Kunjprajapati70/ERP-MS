const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-phase2';
process.env.JWT_EXPIRES_IN = '1h';

const app = require('../app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Notification = require('../src/models/Notification');
const { ROLES } = require('../src/constants/roles');

const hasAtlas = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<user>');
const describeIfDb = hasAtlas ? describe : describe.skip;

describeIfDb('Phase 2 Users / Notifications / Audit', () => {
  let adminToken;
  let salesToken;
  let adminUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@erp.local',
      password: 'Admin@12345',
    });
    adminToken = adminLogin.body.data?.token;
    adminUser = adminLogin.body.data?.user;

    const salesLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'sales@erp.local',
      password: 'Sales@12345',
    });
    salesToken = salesLogin.body.data?.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /^phase2\./i });
    await mongoose.disconnect();
  });

  it('lists users for admin', async () => {
    const res = await request(app)
      .get('/api/v1/users?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('forbids sales user from listing users', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('lists roles and permission catalog', async () => {
    const roles = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(roles.statusCode).toBe(200);
    expect(roles.body.data.items.length).toBeGreaterThan(0);

    const catalog = await request(app)
      .get('/api/v1/roles/permissions/catalog')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(catalog.statusCode).toBe(200);
    expect(catalog.body.data.permissions.length).toBeGreaterThan(0);
  });

  it('creates a user and notification', async () => {
    const email = `phase2.${Date.now()}@erp.local`;
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Phase',
        lastName: 'Two',
        email,
        password: 'Phase2@Test1',
        roleName: ROLES.SALES_EXECUTIVE,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.user.email).toBe(email);

    const created = await User.findOne({ email });
    const notes = await Notification.find({ user: created._id });
    expect(notes.length).toBeGreaterThan(0);
  });

  it('returns notifications for current user', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('unreadCount');
  });

  it('lists audit logs for admin', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs?limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('rejects unauthenticated audit access', async () => {
    const res = await request(app).get('/api/v1/audit-logs');
    expect(res.statusCode).toBe(401);
  });
});
