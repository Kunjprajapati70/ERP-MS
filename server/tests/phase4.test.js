const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-phase4';
process.env.JWT_EXPIRES_IN = '1h';

const app = require('../app');
const Product = require('../src/models/Product');
const Supplier = require('../src/models/Supplier');
const Warehouse = require('../src/models/Warehouse');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const GRN = require('../src/models/GRN');
const StockTransaction = require('../src/models/StockTransaction');

const hasAtlas = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<user>');
const describeIfDb = hasAtlas ? describe : describe.skip;

describeIfDb('Phase 4 Purchase → GRN → Inventory', () => {
  let token;
  let supplierId;
  let warehouseId;
  let productId;
  let startingStock;
  let poId;
  let poItemId;
  let grnId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'purchase@erp.local',
      password: 'Purchase@12345',
    });
    token = login.body.data?.token;

    const supplier = await Supplier.findOneAndUpdate(
      { code: 'SUP-P4' },
      { code: 'SUP-P4', name: 'Phase4 Supplier', status: 'ACTIVE', city: 'Test' },
      { upsert: true, new: true }
    );
    supplierId = supplier._id.toString();

    const warehouse = await Warehouse.findOne({ code: 'MAIN' });
    warehouseId = warehouse?._id?.toString();

    const product = await Product.findOne({ sku: 'WM-100' });
    productId = product._id.toString();
    startingStock = product.currentStock;
  });

  afterAll(async () => {
    if (grnId) await GRN.deleteOne({ _id: grnId });
    if (poId) {
      await StockTransaction.deleteMany({ referenceType: 'GRN', referenceId: grnId });
      await PurchaseOrder.deleteOne({ _id: poId });
    }
    // restore product stock roughly by re-reading — leave as-is after test adjustments
    await mongoose.disconnect();
  });

  it('creates and approves a purchase order', async () => {
    const create = await request(app)
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplier: supplierId,
        warehouse: warehouseId,
        items: [{ product: productId, quantity: 5, unitPrice: 450 }],
      });

    expect(create.statusCode).toBe(201);
    poId = create.body.data.purchaseOrder._id;
    poItemId = create.body.data.purchaseOrder.items[0]._id;

    const approve = await request(app)
      .post(`/api/v1/purchase-orders/${poId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'APPROVED' });

    expect(approve.statusCode).toBe(200);
    expect(approve.body.data.purchaseOrder.status).toBe('APPROVED');
  });

  it('creates GRN and confirms stock increase', async () => {
    const create = await request(app)
      .post('/api/v1/grns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        purchaseOrder: poId,
        warehouse: warehouseId,
        items: [
          {
            purchaseOrderItemId: poItemId,
            receivedQuantity: 5,
            rejectedQuantity: 0,
            damagedQuantity: 1,
            acceptedQuantity: 4,
          },
        ],
      });

    expect(create.statusCode).toBe(201);
    grnId = create.body.data.grn._id;
    expect(create.body.data.grn.status).toBe('DRAFT');

    const confirm = await request(app)
      .post(`/api/v1/grns/${grnId}/confirm`)
      .set('Authorization', `Bearer ${token}`);

    expect(confirm.statusCode).toBe(200);
    expect(confirm.body.data.grn.status).toBe('CONFIRMED');
    // Ordered 5, accepted 4 → partially received
    expect(confirm.body.data.purchaseOrder.status).toBe('PARTIALLY_RECEIVED');

    const product = await Product.findById(productId);
    expect(product.currentStock).toBe(startingStock + 4);

    const txns = await StockTransaction.find({
      referenceType: 'GRN',
      referenceId: grnId,
      type: 'PURCHASE',
    });
    expect(txns.length).toBe(1);
    expect(txns[0].quantity).toBe(4);
  });

  it('lists customers for sales user', async () => {
    const salesLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'sales@erp.local',
      password: 'Sales@12345',
    });
    const salesToken = salesLogin.body.data.token;

    const res = await request(app)
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});
