const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-phase6';
process.env.JWT_EXPIRES_IN = '1h';

const app = require('../app');
const Lead = require('../src/models/Lead');
const Customer = require('../src/models/Customer');

const hasAtlas = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<user>');
const describeIfDb = hasAtlas ? describe : describe.skip;

describeIfDb('Phase 6 Dashboard / Reports / CRM', () => {
  let salesToken;
  let adminToken;
  let leadId;
  let convertedCustomerId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

    const salesLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'sales@erp.local',
      password: 'Sales@12345',
    });
    salesToken = salesLogin.body.data?.token;

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@erp.local',
      password: 'Admin@12345',
    });
    adminToken = adminLogin.body.data?.token;
  });

  afterAll(async () => {
    if (leadId) await Lead.deleteOne({ _id: leadId });
    if (convertedCustomerId) await Customer.deleteOne({ _id: convertedCustomerId });
    await Lead.deleteMany({ email: 'phase6.lead@erp.local' });
    await mongoose.disconnect();
  });

  it('returns dashboard overview for authenticated sales user', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.kpis).toBeDefined();
    expect(typeof res.body.data.kpis.salesRevenue30).toBe('number');
    expect(typeof res.body.data.kpis.activeCustomers).toBe('number');
  });

  it('returns sales trend series', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/sales-trend?days=7')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.series).toHaveLength(7);
  });

  it('returns sales and inventory reports for admin', async () => {
    const sales = await request(app)
      .get('/api/v1/reports/sales?days=30')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(sales.statusCode).toBe(200);
    expect(sales.body.data.totals).toBeDefined();

    const inventory = await request(app)
      .get('/api/v1/reports/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(inventory.statusCode).toBe(200);
    expect(inventory.body.data.totals.activeProducts).toBeGreaterThanOrEqual(0);
  });

  it('creates a lead and converts it to a customer', async () => {
    const create = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        name: 'Phase6 Test Lead',
        company: 'Phase6 Co',
        email: 'phase6.lead@erp.local',
        phone: '9000000006',
        source: 'WEBSITE',
        estimatedValue: 50000,
      });

    expect(create.statusCode).toBe(201);
    leadId = create.body.data.lead._id;
    expect(create.body.data.lead.status).toBe('NEW');

    const convert = await request(app)
      .post(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({});

    expect(convert.statusCode).toBe(200);
    expect(convert.body.data.lead.status).toBe('WON');
    expect(convert.body.data.customer.code).toBeTruthy();
    convertedCustomerId = convert.body.data.customer._id;
  });
});
