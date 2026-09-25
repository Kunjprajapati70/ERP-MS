const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-customer-portal';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = require('../app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Customer = require('../src/models/Customer');
const SalesOrder = require('../src/models/SalesOrder');
const Invoice = require('../src/models/Invoice');
const SupportTicket = require('../src/models/SupportTicket');
const { ROLES, ROLE_PERMISSIONS } = require('../src/constants/roles');

const hasAtlas = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<user>');
const describeIfDb = hasAtlas ? describe : describe.skip;

describeIfDb('Customer Portal API', () => {
  const emailA = 'portal.a.test@erp.local';
  const emailB = 'portal.b.test@erp.local';
  let tokenA;
  let tokenB;
  let customerAId;
  let orderAId;
  let invoiceAId;
  let ticketAId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

    await Role.findOneAndUpdate(
      { name: ROLES.CUSTOMER },
      {
        name: ROLES.CUSTOMER,
        displayName: 'Customer',
        permissions: ROLE_PERMISSIONS[ROLES.CUSTOMER],
        isSystem: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    await User.deleteMany({ email: { $in: [emailA, emailB] } });
    await Customer.deleteMany({ email: { $in: [emailA, emailB] } });
  });

  afterAll(async () => {
    const users = await User.find({ email: { $in: [emailA, emailB] } });
    const userIds = users.map((u) => u._id);
    await SupportTicket.deleteMany({ createdBy: { $in: userIds } });
    await Customer.deleteMany({ email: { $in: [emailA, emailB] } });
    await User.deleteMany({ email: { $in: [emailA, emailB] } });
    await mongoose.disconnect();
  });

  it('registers a customer with CUSTOMER role only', async () => {
    const res = await request(app).post('/api/v1/auth/customer/register').send({
      firstName: 'Portal',
      lastName: 'Alpha',
      email: emailA,
      password: 'Customer@12345',
      company: 'Alpha Co',
      city: 'Mumbai',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role.name).toBe(ROLES.CUSTOMER);
    expect(res.body.data.customer).toBeDefined();
    tokenA = res.body.data.token;
    customerAId = res.body.data.customer._id;

    const staffAttempt = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Hack',
      lastName: 'Attempt',
      email: 'hack.customer.role@erp.local',
      password: 'Customer@12345',
      roleName: ROLES.CUSTOMER,
    });
    expect(staffAttempt.statusCode).toBe(403);
    await User.deleteMany({ email: 'hack.customer.role@erp.local' });
  });

  it('logs in and rejects invalid credentials', async () => {
    const bad = await request(app).post('/api/v1/auth/login').send({
      email: emailA,
      password: 'WrongPass1',
    });
    expect(bad.statusCode).toBe(401);

    const ok = await request(app).post('/api/v1/auth/login').send({
      email: emailA,
      password: 'Customer@12345',
    });
    expect(ok.statusCode).toBe(200);
    tokenA = ok.body.data.token;
  });

  it('allows portal dashboard and blocks staff ERP dashboard', async () => {
    const dash = await request(app)
      .get('/api/v1/customer/dashboard')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(dash.statusCode).toBe(200);
    expect(dash.body.data.kpis).toBeDefined();
    expect(dash.body.data.charts).toBeDefined();

    const staffDash = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Authorization', `Bearer ${tokenA}`);
    expect([401, 403]).toContain(staffDash.statusCode);
  });

  it('isolates another customer from A resources', async () => {
    const regB = await request(app).post('/api/v1/auth/customer/register').send({
      firstName: 'Portal',
      lastName: 'Beta',
      email: emailB,
      password: 'Customer@12345',
    });
    expect(regB.statusCode).toBe(201);
    tokenB = regB.body.data.token;

    const product = await request(app)
      .get('/api/v1/customer/products')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(product.statusCode).toBe(200);

    // Seed an order/invoice belonging to A if none exist
    let order = await SalesOrder.findOne({ customer: customerAId });
    if (!order) {
      order = await SalesOrder.create({
        orderNumber: `SO-TEST-${Date.now()}`,
        customer: customerAId,
        status: 'CONFIRMED',
        orderDate: new Date(),
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            quantity: 1,
            unitPrice: 100,
            taxPercent: 0,
            discount: 0,
            lineTotal: 100,
          },
        ],
        subtotal: 100,
        taxTotal: 0,
        grandTotal: 100,
      });
    }
    orderAId = order._id;

    let invoice = await Invoice.findOne({ customer: customerAId });
    if (!invoice) {
      invoice = await Invoice.create({
        invoiceNumber: `INV-TEST-${Date.now()}`,
        customer: customerAId,
        salesOrder: orderAId,
        status: 'ISSUED',
        paymentStatus: 'UNPAID',
        invoiceDate: new Date(),
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            quantity: 1,
            unitPrice: 100,
            taxPercent: 0,
            discount: 0,
            lineTotal: 100,
          },
        ],
        subtotal: 100,
        taxTotal: 0,
        grandTotal: 100,
        paidAmount: 0,
        balanceAmount: 100,
      });
    }
    invoiceAId = invoice._id;

    const stolenOrder = await request(app)
      .get(`/api/v1/customer/orders/${orderAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(stolenOrder.statusCode).toBe(404);

    const stolenInvoice = await request(app)
      .get(`/api/v1/customer/invoices/${invoiceAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(stolenInvoice.statusCode).toBe(404);

    const ownOrder = await request(app)
      .get(`/api/v1/customer/orders/${orderAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(ownOrder.statusCode).toBe(200);
  });

  it('creates support tickets with ownership isolation', async () => {
    const create = await request(app)
      .post('/api/v1/customer/support')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        subject: 'Test delivery issue',
        category: 'DELIVERY',
        priority: 'HIGH',
        message: 'Package has not arrived yet.',
      });
    expect(create.statusCode).toBe(201);
    ticketAId = create.body.data.ticket._id;

    const stolen = await request(app)
      .get(`/api/v1/customer/support/${ticketAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(stolen.statusCode).toBe(404);

    const reply = await request(app)
      .post(`/api/v1/customer/support/${ticketAId}/reply`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ message: 'Any update?' });
    expect(reply.statusCode).toBe(200);
    expect(reply.body.data.ticket.messages.length).toBeGreaterThan(1);
  });

  it('updates profile from JWT customer only', async () => {
    const res = await request(app)
      .put('/api/v1/customer/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ city: 'Pune', phone: '9999900011' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.customer.city).toBe('Pune');
  });
});
