const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-phase8';
process.env.JWT_EXPIRES_IN = '1h';

const app = require('../app');
const Employee = require('../src/models/Employee');
const Attendance = require('../src/models/Attendance');
const PayrollRun = require('../src/models/PayrollRun');
const WorkOrder = require('../src/models/WorkOrder');
const QCInspection = require('../src/models/QCInspection');
const BOM = require('../src/models/BOM');
const Product = require('../src/models/Product');
const StockTransaction = require('../src/models/StockTransaction');

const hasAtlas = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<user>');
const describeIfDb = hasAtlas ? describe : describe.skip;

describeIfDb('Phase 8 Attendance / Payroll / QC', () => {
  let hrToken;
  let mfgToken;
  let employeeId;
  let attendanceId;
  let payrollId;
  let bomId;
  let woId;
  let qcId;
  const year = 2099;
  const month = 1;

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

    await PayrollRun.deleteOne({ periodYear: year, periodMonth: month });
  });

  afterAll(async () => {
    if (qcId) await QCInspection.deleteOne({ _id: qcId });
    if (woId) {
      await StockTransaction.deleteMany({ referenceType: 'WORK_ORDER', referenceId: woId });
      await WorkOrder.deleteOne({ _id: woId });
    }
    if (bomId) await BOM.deleteOne({ _id: bomId });
    if (payrollId) await PayrollRun.deleteOne({ _id: payrollId });
    if (attendanceId) await Attendance.deleteOne({ _id: attendanceId });
    if (employeeId) {
      await Attendance.deleteMany({ employee: employeeId });
      await Employee.deleteOne({ _id: employeeId });
    }
    await mongoose.disconnect();
  });

  it('marks attendance and generates payroll', async () => {
    const emp = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        firstName: 'Phase8',
        lastName: 'Worker',
        email: 'phase8.worker@erp.local',
        department: 'PRODUCTION',
        salary: 30000,
      });
    expect(emp.statusCode).toBe(201);
    employeeId = emp.body.data.employee._id;

    const att = await request(app)
      .post('/api/v1/attendance')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employee: employeeId,
        date: `${year}-01-02`,
        status: 'PRESENT',
      });
    expect(att.statusCode).toBe(201);
    attendanceId = att.body.data.attendance._id;
    expect(att.body.data.attendance.status).toBe('PRESENT');

    const payroll = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ periodYear: year, periodMonth: month });
    expect(payroll.statusCode).toBe(201);
    payrollId = payroll.body.data.payroll._id;
    expect(payroll.body.data.payroll.status).toBe('DRAFT');
    expect(payroll.body.data.payroll.lines.length).toBeGreaterThan(0);

    const approve = await request(app)
      .post(`/api/v1/payroll/${payrollId}/status`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'APPROVED' });
    expect(approve.statusCode).toBe(200);
    expect(approve.body.data.payroll.status).toBe('APPROVED');
  });

  it('creates and completes QC on a finished work order', async () => {
    const hub = await Product.findOne({ sku: 'UCH-200' });
    const mouse = await Product.findOne({ sku: 'WM-100' });
    if (mouse.currentStock < 2) {
      mouse.currentStock = 20;
      await mouse.save();
    }

    const bom = await request(app)
      .post('/api/v1/boms')
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({
        code: 'BOM-P8-QC',
        name: 'Phase8 QC BOM',
        finishedProduct: hub._id.toString(),
        components: [{ product: mouse._id.toString(), quantity: 1 }],
      });
    expect(bom.statusCode).toBe(201);
    bomId = bom.body.data.bom._id;

    const wo = await request(app)
      .post('/api/v1/work-orders')
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({ bom: bomId, quantity: 1 });
    expect(wo.statusCode).toBe(201);
    woId = wo.body.data.workOrder._id;

    await request(app)
      .post(`/api/v1/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({ status: 'RELEASED' });

    const complete = await request(app)
      .post(`/api/v1/work-orders/${woId}/status`)
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({ status: 'COMPLETED' });
    expect(complete.statusCode).toBe(200);

    const createQc = await request(app)
      .post('/api/v1/qc-inspections')
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({ workOrder: woId });
    expect(createQc.statusCode).toBe(201);
    qcId = createQc.body.data.inspection._id;
    expect(createQc.body.data.inspection.result).toBe('PENDING');

    const finish = await request(app)
      .post(`/api/v1/qc-inspections/${qcId}/complete`)
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({ passedQty: 1, failedQty: 0 });
    expect(finish.statusCode).toBe(200);
    expect(finish.body.data.inspection.result).toBe('PASSED');
  });
});
