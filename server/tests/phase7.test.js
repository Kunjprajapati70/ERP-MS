const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-phase7';
process.env.JWT_EXPIRES_IN = '1h';

const app = require('../app');
const Product = require('../src/models/Product');
const Employee = require('../src/models/Employee');
const LeaveRequest = require('../src/models/LeaveRequest');
const BOM = require('../src/models/BOM');
const WorkOrder = require('../src/models/WorkOrder');
const StockTransaction = require('../src/models/StockTransaction');
const Warehouse = require('../src/models/Warehouse');

const hasAtlas = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<user>');
const describeIfDb = hasAtlas ? describe : describe.skip;

describeIfDb('Phase 7 HR + Manufacturing', () => {
  let hrToken;
  let mfgToken;
  let employeeId;
  let leaveId;
  let bomId;
  let woId;
  let fgId;
  let compAId;
  let compBId;
  let warehouseId;
  let fgStart;
  let aStart;
  let bStart;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

    const hrLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'hr@erp.local',
      password: 'HrManager@12345',
    });
    hrToken = hrLogin.body.data?.token;

    const mfgLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'mfg@erp.local',
      password: 'Mfg@12345',
    });
    mfgToken = mfgLogin.body.data?.token;

    const warehouse = await Warehouse.findOne({ code: 'MAIN' });
    warehouseId = warehouse?._id?.toString();

    const hub = await Product.findOne({ sku: 'UCH-200' });
    const mouse = await Product.findOne({ sku: 'WM-100' });
    const ssd = await Product.findOne({ sku: 'SSD-512' });
    fgId = hub._id.toString();
    compAId = mouse._id.toString();
    compBId = ssd._id.toString();

    // Ensure components have stock for WO release (shared Atlas DB may be depleted)
    if (mouse.currentStock < 5) {
      mouse.currentStock = 20;
      await mouse.save();
    }
    if (ssd.currentStock < 5) {
      ssd.currentStock = 20;
      await ssd.save();
    }
    const refreshedHub = await Product.findById(hub._id);
    const refreshedMouse = await Product.findById(mouse._id);
    const refreshedSsd = await Product.findById(ssd._id);
    fgStart = refreshedHub.currentStock;
    aStart = refreshedMouse.currentStock;
    bStart = refreshedSsd.currentStock;
  });

  afterAll(async () => {
    if (leaveId) await LeaveRequest.deleteOne({ _id: leaveId });
    if (employeeId) await Employee.deleteOne({ _id: employeeId });
    if (woId) {
      await StockTransaction.deleteMany({ referenceType: 'WORK_ORDER', referenceId: woId });
      await WorkOrder.deleteOne({ _id: woId });
    }
    if (bomId) await BOM.deleteOne({ _id: bomId });
    await mongoose.disconnect();
  });

  it('creates employee and approves leave', async () => {
    const create = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        firstName: 'Phase7',
        lastName: 'Tester',
        email: 'phase7.emp@erp.local',
        department: 'HR',
        designation: 'Analyst',
        salary: 40000,
      });

    expect(create.statusCode).toBe(201);
    employeeId = create.body.data.employee._id;

    const leave = await request(app)
      .post('/api/v1/leave-requests')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employee: employeeId,
        leaveType: 'CASUAL',
        startDate: '2026-09-20',
        endDate: '2026-09-21',
        reason: 'Personal',
      });

    expect(leave.statusCode).toBe(201);
    leaveId = leave.body.data.leave._id;
    expect(leave.body.data.leave.days).toBe(2);

    const approve = await request(app)
      .post(`/api/v1/leave-requests/${leaveId}/review`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ decision: 'APPROVED' });

    expect(approve.statusCode).toBe(200);
    expect(approve.body.data.leave.status).toBe('APPROVED');

    const emp = await Employee.findById(employeeId);
    expect(emp.status).toBe('ON_LEAVE');
  });

  it('creates BOM and completes work order with stock movements', async () => {
    const bom = await request(app)
      .post('/api/v1/boms')
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({
        code: 'BOM-P7-TEST',
        name: 'Phase7 Test Bundle',
        finishedProduct: fgId,
        components: [
          { product: compAId, quantity: 1 },
          { product: compBId, quantity: 1 },
        ],
      });

    expect(bom.statusCode).toBe(201);
    bomId = bom.body.data.bom._id;

    const createWo = await request(app)
      .post('/api/v1/work-orders')
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({
        bom: bomId,
        warehouse: warehouseId,
        quantity: 2,
      });

    expect(createWo.statusCode).toBe(201);
    woId = createWo.body.data.workOrder._id;

    const release = await request(app)
      .post(`/api/v1/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({ status: 'RELEASED' });
    expect(release.statusCode).toBe(200);

    const complete = await request(app)
      .post(`/api/v1/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({ status: 'COMPLETED' });

    expect(complete.statusCode).toBe(200);
    expect(complete.body.data.workOrder.status).toBe('COMPLETED');
    expect(complete.body.data.workOrder.stockApplied).toBe(true);

    const [fg, a, b] = await Promise.all([
      Product.findById(fgId),
      Product.findById(compAId),
      Product.findById(compBId),
    ]);

    expect(fg.currentStock).toBe(fgStart + 2);
    expect(a.currentStock).toBe(aStart - 2);
    expect(b.currentStock).toBe(bStart - 2);

    const outTx = await StockTransaction.findOne({
      referenceType: 'WORK_ORDER',
      referenceId: woId,
      type: 'PRODUCTION_OUT',
    });
    const inTx = await StockTransaction.findOne({
      referenceType: 'WORK_ORDER',
      referenceId: woId,
      type: 'PRODUCTION_IN',
    });
    expect(outTx).toBeTruthy();
    expect(inTx).toBeTruthy();
    expect(inTx.quantity).toBe(2);
  });
});
