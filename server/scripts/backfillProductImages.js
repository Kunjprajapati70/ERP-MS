/**
 * Backfill product imageUrl values so the customer portal can display images.
 * Usage: node scripts/backfillProductImages.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const Product = require('../src/models/Product');
const logger = require('../src/utils/logger');

const FALLBACK_BY_SKU = {
  'WM-100': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&h=450&fit=crop',
  'UCH-200': 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=600&h=450&fit=crop',
  'LT-140': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=450&fit=crop',
  'SSD-512': 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=450&fit=crop',
};

const GENERIC = [
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=450&fit=crop',
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=450&fit=crop',
  'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600&h=450&fit=crop',
  'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=450&fit=crop',
  'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=450&fit=crop',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=450&fit=crop',
];

async function run() {
  await connectDatabase();
  const products = await Product.find({
    $or: [{ imageUrl: { $exists: false } }, { imageUrl: '' }, { imageUrl: null }],
  });

  let updated = 0;
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    p.imageUrl = FALLBACK_BY_SKU[p.sku] || GENERIC[i % GENERIC.length];
    await p.save();
    updated += 1;
  }

  logger.info(`Product images backfilled: ${updated}`);
  await disconnectDatabase();
  process.exit(0);
}

run().catch(async (e) => {
  logger.error(e.message);
  try {
    await disconnectDatabase();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
