const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-phase5';
process.env.JWT_EXPIRES_IN = '1h';

const app = require('../app');
const Product = require('../src/models/Product');
const Customer = require('../src/models/Customer');
const Warehouse = require('../src/models/Warehouse');
const SalesOrder = require('../src/models/SalesOrder');
const Invoice = require('../src/models/Invoice');
const Payment = require('../src/models/Payment');
const StockTransaction = require('../src/models/StockTransaction');

const hasAtlas = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<user>');
const describeIfDb = hasAtlas ? describe : describe.skip;

describeIfDb('Phase 5 Sales → Invoice → Payment', () => {
  let token;
  let customerId;
  let warehouseId;
  let productId;
  let startingStock;
  let soId;
  let invoiceId;
  let paymentId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'sales@erp.local',
      password: 'Sales@12345',
    });
    token = login.body.data?.token;

    const customer = await Customer.findOneAndUpdate(
      { code: 'CUST-P5' },
      { code: 'CUST-P5', name: 'Phase5 Customer', status: 'ACTIVE', city: 'Test' },
      { upsert: true, new: true }
    );
    customerId = customer._id.toString();

    const warehouse = await Warehouse.findOne({ code: 'MAIN' });
    warehouseId = warehouse?._id?.toString();

    const product = await Product.findOne({ sku: 'WM-100' });
    productId = product._id.toString();
    startingStock = product.currentStock;

    // Ensure enough stock for the sale
    if (startingStock < 3) {
      product.currentStock = 10;
      await product.save();
      startingStock = 10;
    }
  });

  afterAll(async () => {
    if (invoiceId) {
      await Payment.deleteMany({ invoice: invoiceId });
      await Invoice.deleteOne({ _id: invoiceId });
    }
    if (soId) {
      await StockTransaction.deleteMany({ referenceType: 'SALES_ORDER', referenceId: soId });
      await SalesOrder.deleteOne({ _id: soId });
    }
    await Customer.deleteOne({ code: 'CUST-P5' });
    await mongoose.disconnect();
  });

  it('creates and confirms a sales order reducing stock', async () => {
    const create = await request(app)
      .post('/api/v1/sales-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: customerId,
        warehouse: warehouseId,
        items: [{ product: productId, quantity: 2, unitPrice: 999 }],
      });

    expect(create.statusCode).toBe(201);
    soId = create.body.data.salesOrder._id;
    expect(create.body.data.salesOrder.status).toBe('DRAFT');

    const confirm = await request(app)
      .post(`/api/v1/sales-orders/${soId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONFIRMED' });

    expect(confirm.statusCode).toBe(200);
    expect(confirm.body.data.salesOrder.status).toBe('CONFIRMED');
    expect(confirm.body.data.salesOrder.stockReserved).toBe(true);

    const product = await Product.findById(productId);
    expect(product.currentStock).toBe(startingStock - 2);

    const tx = await StockTransaction.findOne({
      referenceType: 'SALES_ORDER',
      referenceId: soId,
      type: 'SALE',
    });
    expect(tx).toBeTruthy();
    expect(tx.quantity).toBe(-2);
  });

  it('creates invoice from confirmed sales order', async () => {
    const create = await request(app)
      .post(`/api/v1/invoices/from-sales-order/${soId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dueDays: 10 });

    expect(create.statusCode).toBe(201);
    invoiceId = create.body.data.invoice._id;
    expect(create.body.data.invoice.paymentStatus).toBe('UNPAID');
    expect(create.body.data.invoice.balanceAmount).toBe(create.body.data.invoice.grandTotal);

    const so = await SalesOrder.findById(soId);
    expect(so.invoice?.toString()).toBe(invoiceId);
  });

  it('records payment and marks invoice PAID', async () => {
    const invoice = await Invoice.findById(invoiceId);
    const total = invoice.grandTotal;

    const partial = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoice: invoiceId,
        amount: Math.round((total / 2) * 100) / 100,
        method: 'UPI',
      });

    expect(partial.statusCode).toBe(201);
    expect(partial.body.data.invoice.paymentStatus).toBe('PARTIALLY_PAID');
    paymentId = partial.body.data.payment._id;

    const remaining = partial.body.data.invoice.balanceAmount;
    const full = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoice: invoiceId,
        amount: remaining,
        method: 'BANK_TRANSFER',
      });

    expect(full.statusCode).toBe(201);
    expect(full.body.data.invoice.paymentStatus).toBe('PAID');
    expect(full.body.data.invoice.balanceAmount).toBe(0);
  });

  it('rejects confirm when stock is insufficient', async () => {
    const create = await request(app)
      .post('/api/v1/sales-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: customerId,
        warehouse: warehouseId,
        items: [{ product: productId, quantity: 999999, unitPrice: 1 }],
      });

    expect(create.statusCode).toBe(201);
    const badSoId = create.body.data.salesOrder._id;

    const confirm = await request(app)
      .post(`/api/v1/sales-orders/${badSoId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONFIRMED' });

    expect(confirm.statusCode).toBe(400);
    expect(confirm.body.errorCode).toBe('INSUFFICIENT_STOCK');

    await SalesOrder.deleteOne({ _id: badSoId });
  });
});
