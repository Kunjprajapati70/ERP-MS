/**
 * Development seed script — creates roles and demo users.
 * Usage: node scripts/seed.js
 * Safe to re-run (upserts roles, skips existing emails).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const config = require('../src/config/env');
const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Warehouse = require('../src/models/Warehouse');
const Product = require('../src/models/Product');
const Customer = require('../src/models/Customer');
const Supplier = require('../src/models/Supplier');
const Lead = require('../src/models/Lead');
const Employee = require('../src/models/Employee');
const BOM = require('../src/models/BOM');
const { applyStockChange } = require('../src/services/inventoryService');
const { ROLES, ROLE_PERMISSIONS } = require('../src/constants/roles');
const logger = require('../src/utils/logger');

const ROLE_META = {
  [ROLES.SUPER_ADMIN]: { displayName: 'Super Admin', description: 'Full platform access' },
  [ROLES.ADMIN]: { displayName: 'Administrator', description: 'Full business access' },
  [ROLES.SALES_MANAGER]: { displayName: 'Sales Manager', description: 'Sales and CRM management' },
  [ROLES.SALES_EXECUTIVE]: { displayName: 'Sales Executive', description: 'Sales operations' },
  [ROLES.PURCHASE_MANAGER]: { displayName: 'Purchase Manager', description: 'Purchasing and GRN' },
  [ROLES.INVENTORY_MANAGER]: { displayName: 'Inventory Manager', description: 'Products and stock' },
  [ROLES.ACCOUNTANT]: { displayName: 'Accountant', description: 'Finance and accounting' },
  [ROLES.HR_MANAGER]: { displayName: 'HR Manager', description: 'HR, leave, and payroll' },
  [ROLES.PRODUCTION_MANAGER]: { displayName: 'Production Manager', description: 'Manufacturing and QC' },
  [ROLES.CUSTOMER]: { displayName: 'Customer', description: 'Customer portal access only' },
  [ROLES.EMPLOYEE]: { displayName: 'Employee', description: 'Employee operations and daily attendance' },
};

const DEMO_USERS = [
  {
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@erp.local',
    password: 'Admin@12345',
    roleName: ROLES.SUPER_ADMIN,
  },
  {
    firstName: 'System',
    lastName: 'Admin',
    email: 'admin@erp.local',
    password: 'Admin@12345',
    roleName: ROLES.ADMIN,
  },
  {
    firstName: 'Sara',
    lastName: 'Sales',
    email: 'sales@erp.local',
    password: 'Sales@12345',
    roleName: ROLES.SALES_MANAGER,
  },
  {
    firstName: 'Priya',
    lastName: 'Purchase',
    email: 'purchase@erp.local',
    password: 'Purchase@12345',
    roleName: ROLES.PURCHASE_MANAGER,
  },
  {
    firstName: 'Ivan',
    lastName: 'Inventory',
    email: 'inventory@erp.local',
    password: 'Inventory@12345',
    roleName: ROLES.INVENTORY_MANAGER,
  },
  {
    firstName: 'Anita',
    lastName: 'Accounts',
    email: 'accountant@erp.local',
    password: 'Account@12345',
    roleName: ROLES.ACCOUNTANT,
  },
  {
    firstName: 'Hari',
    lastName: 'HR',
    email: 'hr@erp.local',
    password: 'HrManager@12345',
    roleName: ROLES.HR_MANAGER,
  },
  {
    firstName: 'Mike',
    lastName: 'Manufacturing',
    email: 'mfg@erp.local',
    password: 'Mfg@12345',
    roleName: ROLES.PRODUCTION_MANAGER,
  },
  {
    firstName: 'Carol',
    lastName: 'Customer',
    email: 'customer@erp.local',
    password: 'Customer@12345',
    roleName: ROLES.CUSTOMER,
  },
  {
    firstName: 'Ethan',
    lastName: 'Employee',
    email: 'employee@erp.local',
    password: 'Employee@12345',
    roleName: ROLES.EMPLOYEE,
  },
];

async function seedRoles() {
  const roleMap = {};
  for (const name of Object.values(ROLES)) {
    const meta = ROLE_META[name];
    const role = await Role.findOneAndUpdate(
      { name },
      {
        name,
        displayName: meta.displayName,
        description: meta.description,
        permissions: ROLE_PERMISSIONS[name] || [],
        isSystem: true,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    roleMap[name] = role;
    logger.info(`Role ready: ${name}`);
  }
  return roleMap;
}

async function seedUsers(roleMap) {
  for (const demo of DEMO_USERS) {
    const existing = await User.findOne({ email: demo.email.toLowerCase() });
    if (existing) {
      if (demo.roleName === ROLES.EMPLOYEE && roleMap[ROLES.EMPLOYEE]) {
        existing.role = roleMap[ROLES.EMPLOYEE]._id;
        existing.status = 'ACTIVE';
        await existing.save();
        logger.info(`User role aligned: ${demo.email} -> EMPLOYEE`);
      } else {
        logger.info(`User exists, skipping: ${demo.email}`);
      }
      continue;
    }

    await User.create({
      firstName: demo.firstName,
      lastName: demo.lastName,
      email: demo.email.toLowerCase(),
      password: demo.password,
      role: roleMap[demo.roleName]._id,
      status: 'ACTIVE',
    });
    logger.info(`User created: ${demo.email} / ${demo.password}`);
  }
}

async function seedCatalog() {
  const categories = [
    { name: 'Electronics', code: 'ELEC', description: 'Electronic devices' },
    { name: 'Accessories', code: 'ACC', description: 'Peripherals and accessories' },
    { name: 'Raw Materials', code: 'RAW', description: 'Manufacturing inputs' },
  ];

  const categoryMap = {};
  for (const cat of categories) {
    const saved = await Category.findOneAndUpdate(
      { code: cat.code },
      { ...cat, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoryMap[cat.code] = saved;
    logger.info(`Category ready: ${cat.code}`);
  }

  const warehouse = await Warehouse.findOneAndUpdate(
    { code: 'MAIN' },
    {
      name: 'Main Warehouse',
      code: 'MAIN',
      city: 'Ahmedabad',
      address: 'Industrial Area, Phase 1',
      isDefault: true,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  logger.info(`Warehouse ready: ${warehouse.code}`);

  await Warehouse.updateMany({ _id: { $ne: warehouse._id } }, { $set: { isDefault: false } });

  const products = [
    {
      name: 'Wireless Mouse',
      sku: 'WM-100',
      category: categoryMap.ACC._id,
      brand: 'LogiTech',
      purchasePrice: 450,
      sellingPrice: 799,
      taxPercent: 18,
      minimumStock: 10,
      maximumStock: 500,
      opening: 50,
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&h=450&fit=crop',
    },
    {
      name: 'USB-C Hub',
      sku: 'UCH-200',
      category: categoryMap.ACC._id,
      brand: 'Anker',
      purchasePrice: 1200,
      sellingPrice: 1999,
      taxPercent: 18,
      minimumStock: 5,
      maximumStock: 200,
      opening: 20,
      imageUrl: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=600&h=450&fit=crop',
    },
    {
      name: 'Laptop 14"',
      sku: 'LT-140',
      category: categoryMap.ELEC._id,
      brand: 'NovaTech',
      purchasePrice: 42000,
      sellingPrice: 54999,
      taxPercent: 18,
      minimumStock: 3,
      maximumStock: 50,
      opening: 8,
      imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=450&fit=crop',
    },
    {
      name: 'SSD 512GB',
      sku: 'SSD-512',
      category: categoryMap.RAW._id,
      brand: 'Samsung',
      purchasePrice: 2800,
      sellingPrice: 3999,
      taxPercent: 18,
      minimumStock: 15,
      maximumStock: 300,
      opening: 4,
      imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=450&fit=crop',
    },
  ];

  const admin = await User.findOne({ email: 'admin@erp.local' });

  for (const p of products) {
    let product = await Product.findOne({ sku: p.sku });
    if (!product) {
      product = await Product.create({
        name: p.name,
        sku: p.sku,
        category: p.category,
        brand: p.brand,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        taxPercent: p.taxPercent,
        currentStock: 0,
        minimumStock: p.minimumStock,
        maximumStock: p.maximumStock,
        unit: 'PCS',
        warehouse: warehouse._id,
        status: 'ACTIVE',
        imageUrl: p.imageUrl || '',
        visibleToCustomers: true,
      });

      if (p.opening > 0) {
        await applyStockChange({
          productId: product._id,
          quantity: p.opening,
          type: 'OPENING',
          warehouseId: warehouse._id,
          unitCost: p.purchasePrice,
          notes: 'Seed opening stock',
          userId: admin?._id || null,
          skipLowStockNotify: true,
        });
      }
      logger.info(`Product created: ${p.sku}`);
    } else {
      if (p.imageUrl && !product.imageUrl) {
        product.imageUrl = p.imageUrl;
        await product.save();
        logger.info(`Product image updated: ${p.sku}`);
      } else {
        logger.info(`Product exists, skipping: ${p.sku}`);
      }
    }
  }
}

async function seedParties(roleMap) {
  const portalUser = await User.findOne({ email: 'customer@erp.local' });

  const customers = [
    {
      code: 'CUST-1001',
      name: 'Acme Retail Pvt Ltd',
      email: 'buyer@acme.example',
      phone: '9876500001',
      company: 'Acme Retail',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
    },
    {
      code: 'CUST-1002',
      name: 'Bright Stores',
      email: 'orders@bright.example',
      phone: '9876500002',
      company: 'Bright Stores',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      pincode: '411001',
    },
    {
      code: 'CUST-PORTAL',
      name: 'Carol Customer',
      email: 'customer@erp.local',
      phone: '9876500999',
      company: 'Carol Trading',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      pincode: '380001',
      user: portalUser?._id || null,
    },
  ];

  for (const c of customers) {
    await Customer.findOneAndUpdate(
      { code: c.code },
      { ...c, status: 'ACTIVE' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    logger.info(`Customer ready: ${c.code}${c.user ? ' (portal linked)' : ''}`);
  }

  if (portalUser && roleMap[ROLES.CUSTOMER]) {
    if (!portalUser.role || String(portalUser.role) !== String(roleMap[ROLES.CUSTOMER]._id)) {
      portalUser.role = roleMap[ROLES.CUSTOMER]._id;
      await portalUser.save();
    }
  }

  // Ensure every CUSTOMER-role user has a linked Customer party
  const { ensureCustomerProfileForUser } = require('../src/services/customerLinkService');
  const customerUsers = await User.find({ role: roleMap[ROLES.CUSTOMER]._id });
  for (const cu of customerUsers) {
    const linked = await ensureCustomerProfileForUser(cu);
    logger.info(`Portal link ready: ${cu.email} → ${linked.code}`);
  }

  const suppliers = [
    {
      code: 'SUP-2001',
      name: 'Global Components Ltd',
      email: 'sales@globalcomp.example',
      phone: '9876500101',
      contactPerson: 'Ravi Patel',
      city: 'Ahmedabad',
      paymentTerms: 'Net 30',
    },
    {
      code: 'SUP-2002',
      name: 'TechSource India',
      email: 'desk@techsource.example',
      phone: '9876500102',
      contactPerson: 'Neha Shah',
      city: 'Bengaluru',
      paymentTerms: 'Net 15',
    },
  ];

  for (const s of suppliers) {
    await Supplier.findOneAndUpdate(
      { code: s.code },
      { ...s, status: 'ACTIVE' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    logger.info(`Supplier ready: ${s.code}`);
  }
}

async function seedLeads(roleMap) {
  const salesUser = await User.findOne({ email: 'sales@erp.local' });
  const ownerId = salesUser?._id || roleMap[ROLES.SALES_MANAGER]?._id;

  const leads = [
    {
      code: 'LEAD-1001',
      name: 'Priya Mehta',
      company: 'Nova Traders',
      email: 'priya@nova.example',
      phone: '9988776655',
      source: 'WEBSITE',
      status: 'NEW',
      estimatedValue: 125000,
      notes: 'Interested in bulk SSDs',
    },
    {
      code: 'LEAD-1002',
      name: 'Arjun Desai',
      company: 'City Electronics',
      email: 'arjun@cityelec.example',
      phone: '9988776644',
      source: 'REFERRAL',
      status: 'QUALIFIED',
      estimatedValue: 85000,
      notes: 'Needs demo of WM-100',
    },
  ];

  for (const lead of leads) {
    const existing = await Lead.findOne({ code: lead.code });
    if (existing) {
      logger.info(`Lead exists, skipping: ${lead.code}`);
      continue;
    }
    if (!salesUser) {
      logger.warn('Skipping lead seed — sales user missing');
      break;
    }
    await Lead.create({
      ...lead,
      owner: salesUser._id,
      createdBy: salesUser._id,
    });
    logger.info(`Lead created: ${lead.code}`);
  }

  return ownerId;
}

async function seedHRAndManufacturing() {
  const hrUser = await User.findOne({ email: 'hr@erp.local' });
  const employeeUser = await User.findOne({ email: 'employee@erp.local' });
  const mfgUser = await User.findOne({ email: 'mfg@erp.local' });

  if (hrUser) {
    const employees = [
      {
        employeeCode: 'EMP-1001',
        firstName: 'Anita',
        lastName: 'Shah',
        email: 'anita@erp.local',
        department: 'SALES',
        designation: 'Sales Executive',
        salary: 45000,
      },
      {
        employeeCode: 'EMP-1002',
        firstName: 'Rohan',
        lastName: 'Patel',
        email: 'rohan@erp.local',
        department: 'PRODUCTION',
        designation: 'Line Supervisor',
        salary: 52000,
      },
      {
        employeeCode: 'EMP-1003',
        firstName: 'Ethan',
        lastName: 'Employee',
        email: 'employee@erp.local',
        department: 'SALES',
        designation: 'Operations Executive',
        salary: 42000,
      },
    ];
    for (const emp of employees) {
      const linkedUser =
        emp.email === 'employee@erp.local' && employeeUser ? employeeUser._id : undefined;
      await Employee.findOneAndUpdate(
        { employeeCode: emp.employeeCode },
        {
          ...emp,
          status: 'ACTIVE',
          employmentType: 'FULL_TIME',
          createdBy: hrUser._id,
          ...(linkedUser ? { user: linkedUser } : {}),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      logger.info(`Employee ready: ${emp.employeeCode}`);
    }
  } else {
    logger.warn('Skipping employee seed — hr user missing');
  }

  if (mfgUser) {
    const hub = await Product.findOne({ sku: 'UCH-200' });
    const mouse = await Product.findOne({ sku: 'WM-100' });
    const ssd = await Product.findOne({ sku: 'SSD-512' });
    if (hub && mouse && ssd) {
      const existing = await BOM.findOne({ code: 'BOM-HUB-01' });
      if (!existing) {
        await BOM.create({
          code: 'BOM-HUB-01',
          name: 'USB Hub Bundle',
          finishedProduct: hub._id,
          components: [
            { product: mouse._id, quantity: 1, notes: 'Include mouse' },
            { product: ssd._id, quantity: 1, notes: 'Include SSD' },
          ],
          isActive: true,
          createdBy: mfgUser._id,
        });
        logger.info('BOM created: BOM-HUB-01');
      } else {
        logger.info('BOM exists, skipping: BOM-HUB-01');
      }
    }
  } else {
    logger.warn('Skipping BOM seed — mfg user missing');
  }
}

async function run() {
  if (!config.mongodbUri || config.mongodbUri.includes('<user>')) {
    throw new Error('Configure a real MONGODB_URI before seeding');
  }

  await connectDatabase();
  logger.info('Seeding roles, users, catalog, parties, CRM, HR, manufacturing...');
  const roleMap = await seedRoles();
  await seedUsers(roleMap);
  await seedCatalog();
  await seedParties(roleMap);
  await seedLeads(roleMap);
  await seedHRAndManufacturing();
  logger.info('Seed completed');
  await disconnectDatabase();
  process.exit(0);
}

run().catch(async (error) => {
  logger.error('Seed failed', { message: error.message });
  try {
    await disconnectDatabase();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
