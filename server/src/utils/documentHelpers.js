function calcLineTotal({ quantity, unitPrice, taxPercent = 0, discount = 0 }) {
  const base = quantity * unitPrice - discount;
  const tax = (base * taxPercent) / 100;
  return {
    lineTotal: Math.round((base + tax) * 100) / 100,
    taxAmount: Math.round(tax * 100) / 100,
    baseAmount: Math.round(base * 100) / 100,
  };
}

function calcOrderTotals(items) {
  let subtotal = 0;
  let taxTotal = 0;
  const normalized = items.map((item) => {
    const { lineTotal, taxAmount, baseAmount } = calcLineTotal(item);
    subtotal += baseAmount;
    taxTotal += taxAmount;
    return { ...item, lineTotal };
  });

  return {
    items: normalized,
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    grandTotal: Math.round((subtotal + taxTotal) * 100) / 100,
  };
}

async function nextDocumentNumber(Model, field, prefix) {
  const year = new Date().getFullYear();
  const regex = new RegExp(`^${prefix}-${year}-`);
  const latest = await Model.findOne({ [field]: regex }).sort({ [field]: -1 }).lean();
  let seq = 1;
  if (latest?.[field]) {
    const parts = latest[field].split('-');
    const last = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(last)) seq = last + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

module.exports = {
  calcLineTotal,
  calcOrderTotals,
  nextDocumentNumber,
};
