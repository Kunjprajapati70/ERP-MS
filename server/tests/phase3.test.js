const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-phase3';
process.env.JWT_EXPIRES_IN = '1h';

const app = require('../app');
const Product = require('../src/models/Product');
const StockTransaction = require('../src/models/StockTransaction');
const Category = require('../src/models/Category');
const Warehouse = require('../src/models/Warehouse');

const hasAtlas = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<user>');
const describeIfDb = hasAtlas ? describe : describe.skip;

describeIfDb('Phase 3 Products & Inventory', () => {
  let token;
  let categoryId;
  let warehouseId;
  const sku = `P3-${Date.now()}`;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'inventory@erp.local',
      password: 'Inventory@12345',
    });
    token = login.body.data?.token;

    const cat = await Category.findOneAndUpdate(
      { code: 'P3TEST' },
      { name: 'Phase3 Test Cat', code: 'P3TEST', isActive: true },
      { upsert: true, new: true }
    );
    categoryId = cat._id.toString();

    const wh = await Warehouse.findOneAndUpdate(
      { code: 'P3WH' },
      { name: 'Phase3 WH', code: 'P3WH', isActive: true, city: 'Test' },
      { upsert: true, new: true }
    );
    warehouseId = wh._id.toString();
  });

  afterAll(async () => {
    const product = await Product.findOne({ sku });
    if (product) {
      await StockTransaction.deleteMany({ product: product._id });
      await Product.deleteOne({ _id: product._id });
    }
    await mongoose.disconnect();
  });

  it('creates product with opening stock transaction', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Phase3 Widget',
        sku,
        category: categoryId,
        warehouse: warehouseId,
        purchasePrice: 100,
        sellingPrice: 150,
        openingStock: 25,
        minimumStock: 5,
        unit: 'PCS',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.product.currentStock).toBe(25);

    const txns = await StockTransaction.find({ product: res.body.data.product._id });
    expect(txns.length).toBeGreaterThanOrEqual(1);
    expect(txns.some((t) => t.type === 'OPENING')).toBe(true);
  });

  it('adjusts stock and rejects oversell', async () => {
    const product = await Product.findOne({ sku });

    const ok = await request(app)
      .post(`/api/v1/products/${product._id}/adjust-stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: -5, notes: 'Test reduce' });

    expect(ok.statusCode).toBe(200);
    expect(ok.body.data.product.currentStock).toBe(20);

    const fail = await request(app)
      .post(`/api/v1/products/${product._id}/adjust-stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: -999 });

    expect(fail.statusCode).toBe(400);
    expect(fail.body.errorCode).toBe('INSUFFICIENT_STOCK');
  });

  it('returns inventory summary and ledger', async () => {
    const summary = await request(app)
      .get('/api/v1/products/inventory/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(summary.statusCode).toBe(200);
    expect(summary.body.data).toHaveProperty('inventoryValue');

    const ledger = await request(app)
      .get('/api/v1/products/inventory/ledger?limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(ledger.statusCode).toBe(200);
    expect(Array.isArray(ledger.body.data.items)).toBe(true);
  });
});
