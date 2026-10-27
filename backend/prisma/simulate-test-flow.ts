/**
 * LOCAL TEST ONLY — seeds Sept/Oct purchase + sale flow for an existing shop.
 *
 * Refuses to run unless NODE_ENV is not production and DATABASE_URL looks local.
 * Does not create products; restocks and sells whatever is already in the business.
 *
 * Usage:
 *   npx tsx prisma/simulate-test-flow.ts
 *   BUSINESS_NAME="Test Shop" TOTAL_TX=500 npx tsx prisma/simulate-test-flow.ts
 */
import dotenv from 'dotenv';
import {
  PaymentMethod,
  Prisma,
  PrismaClient,
  StockStatus,
} from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const MARKER = '[TEST_SIM]';
const TOTAL_TX = Math.max(50, Number(process.env.TOTAL_TX || 500));
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Test Shop';
const BUSINESS_ID = process.env.BUSINESS_ID || '';

const CATEGORIES = [
  { name: 'Footwear', description: 'Sandals, shoes, and related items', color: '#0F766E', icon: 'shoe' },
  { name: 'Bags', description: 'Handbags and carry items', color: '#B45309', icon: 'bag' },
  { name: 'Accessories', description: 'Small fashion accessories', color: '#7C3AED', icon: 'spark' },
  { name: 'General', description: 'Uncategorized / mixed stock', color: '#475569', icon: 'box' },
];

const SUPPLIERS = [
  { name: 'Nairobi Wholesale Hub', phone: '254712345001', email: 'orders@nairobiwholesale.test', address: 'Gikomba, Nairobi' },
  { name: 'Coast Fashion Distributors', phone: '254722345002', email: 'sales@coastfashion.test', address: 'Nyali, Mombasa' },
  { name: 'Rift Valley Traders', phone: '254733345003', email: 'supply@riftvalley.test', address: 'Nakuru Town' },
  { name: 'Eastlands Supply Co', phone: '254743345004', email: 'desk@eastlands.test', address: 'Donholm, Nairobi' },
  { name: 'City Centre Importers', phone: '254753345005', email: 'import@citycentre.test', address: 'Tom Mboya St, Nairobi' },
  { name: 'Thika Road Merchants', phone: '254763345006', email: 'stock@thikaroad.test', address: 'Roysambu, Nairobi' },
];

const CUSTOMERS = [
  { name: 'Amina Otieno', phone: '254701100001', email: 'amina.otieno@test.local' },
  { name: 'Brian Kamau', phone: '254701100002', email: 'brian.kamau@test.local' },
  { name: 'Catherine Wanjiku', phone: '254701100003', email: 'cathy.w@test.local' },
  { name: 'Daniel Mwangi', phone: '254701100004', email: 'dan.mwangi@test.local' },
  { name: 'Esther Njeri', phone: '254701100005', email: 'esther.n@test.local' },
  { name: 'Faith Chebet', phone: '254701100006', email: 'faith.c@test.local' },
  { name: 'George Odhiambo', phone: '254701100007', email: 'george.o@test.local' },
  { name: 'Hannah Mutiso', phone: '254701100008', email: 'hannah.m@test.local' },
  { name: 'Ian Kiprop', phone: '254701100009', email: 'ian.k@test.local' },
  { name: 'Jane Achieng', phone: '254701100010', email: 'jane.a@test.local' },
  { name: 'Kevin Barasa', phone: '254701100011', email: 'kevin.b@test.local' },
  { name: 'Lilian Wairimu', phone: '254701100012', email: 'lilian.w@test.local' },
  { name: 'Michael Ouma', phone: '254701100013', email: 'michael.o@test.local' },
  { name: 'Nancy Cherono', phone: '254701100014', email: 'nancy.c@test.local' },
  { name: 'Oscar Maina', phone: '254701100015', email: 'oscar.m@test.local' },
  { name: 'Patricia Atieno', phone: '254701100016', email: 'patricia.a@test.local' },
  { name: 'Quinn Wafula', phone: '254701100017', email: 'quinn.w@test.local' },
  { name: 'Ruth Nyambura', phone: '254701100018', email: 'ruth.n@test.local' },
  { name: 'Samuel Kiptoo', phone: '254701100019', email: 'samuel.k@test.local' },
  { name: 'Tracy Muthoni', phone: '254701100020', email: 'tracy.m@test.local' },
  { name: 'Walk-in Customer', phone: null, email: null },
  { name: 'Cash Customer', phone: null, email: null },
];

const PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.MPESA,
  PaymentMethod.CARD,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.OTHER,
];

type StockRow = {
  id: string;
  name: string;
  buyingPrice: number;
  sellingPrice: number;
  remaining: number;
  purchased: number;
  sold: number;
  hasVariants: boolean;
};

function assertLocalOnly() {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const dbUrl = process.env.DATABASE_URL || '';

  if (nodeEnv === 'production') {
    throw new Error('Refusing to run: NODE_ENV=production. This script is local test data only.');
  }

  const looksLocal =
    /localhost|127\.0\.0\.1|@db:|@mysql:|@mariadb:/i.test(dbUrl) ||
    /\/\/[^/]*voki:voki@/i.test(dbUrl);

  if (!looksLocal) {
    throw new Error(
      'Refusing to run: DATABASE_URL does not look like a local database. ' +
        'Set a localhost URL or use BUSINESS only on a local MySQL instance.',
    );
  }
}

function stockStatus(remaining: number, threshold: number): StockStatus {
  if (remaining <= 0) return StockStatus.OUT_OF_STOCK;
  if (remaining <= threshold) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPayment(enabled: PaymentMethod[]): PaymentMethod {
  const weights: Record<PaymentMethod, number> = {
    CASH: 35,
    MPESA: 40,
    CARD: 12,
    BANK_TRANSFER: 8,
    OTHER: 5,
  };
  const pool = enabled.flatMap((method) => Array(weights[method] || 1).fill(method));
  return pick(pool);
}

/** Random datetime in [start, end] inclusive of end day. */
function randomDate(start: Date, end: Date) {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  const d = new Date(t);
  d.setHours(randInt(8, 20), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

function categoryForProduct(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('sandal') || lower.includes('shoe') || lower.includes('boot')) return 'Footwear';
  if (lower.includes('bag') || lower.includes('handbag') || lower.includes('purse')) return 'Bags';
  if (lower.includes('test')) return 'General';
  return 'Accessories';
}

function parseEnabledMethods(raw: string | null | undefined): PaymentMethod[] {
  const all = [...PAYMENT_METHODS];
  if (!raw) return all;
  const picked = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is PaymentMethod => all.includes(s as PaymentMethod));
  return picked.length ? picked : all;
}

async function ensureCategories(businessId: string) {
  const map = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { businessId, name: cat.name, deletedAt: null },
    });
    if (existing) {
      map.set(cat.name, existing.id);
      continue;
    }
    const created = await prisma.category.create({
      data: { businessId, ...cat },
    });
    map.set(cat.name, created.id);
  }
  return map;
}

async function ensureSuppliers(businessId: string) {
  const rows = [];
  for (const supplier of SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({
      where: { businessId, name: supplier.name, deletedAt: null },
    });
    if (existing) {
      rows.push(existing);
      continue;
    }
    rows.push(
      await prisma.supplier.create({
        data: {
          businessId,
          ...supplier,
          notes: `${MARKER} Simulated supplier for Sept/Oct flow testing`,
        },
      }),
    );
  }
  return rows;
}

async function ensureCustomers(businessId: string) {
  const rows = [];
  for (const customer of CUSTOMERS) {
    const existing = customer.phone
      ? await prisma.customer.findFirst({
          where: { businessId, phone: customer.phone, deletedAt: null },
        })
      : await prisma.customer.findFirst({
          where: { businessId, name: customer.name, phone: null, deletedAt: null },
        });
    if (existing) {
      rows.push(existing);
      continue;
    }
    rows.push(
      await prisma.customer.create({
        data: {
          businessId,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          notes: `${MARKER} Simulated customer`,
        },
      }),
    );
  }
  return rows;
}

async function assignProductCategories(
  products: Array<{ id: string; name: string; categoryId: string | null }>,
  categoryIds: Map<string, string>,
) {
  for (const product of products) {
    if (product.categoryId) continue;
    const catName = categoryForProduct(product.name);
    const categoryId = categoryIds.get(catName) || categoryIds.get('General');
    if (!categoryId) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { categoryId },
    });
  }
}

async function createPurchase(args: {
  businessId: string;
  userId: string;
  supplierId: string;
  purchaseDate: Date;
  items: Array<{ product: StockRow; quantity: number; unitCost: number }>;
  threshold: number;
  receiptSeq: number;
}) {
  const totalCost = args.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const purchase = await prisma.$transaction(async (tx) => {
    for (const item of args.items) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.product.id } });
      const remaining = product.remainingQuantity + item.quantity;
      await tx.product.update({
        where: { id: product.id },
        data: {
          quantityPurchased: product.quantityPurchased + item.quantity,
          remainingQuantity: remaining,
          buyingPrice: item.unitCost,
          supplierId: args.supplierId,
          status: stockStatus(remaining, args.threshold),
        },
      });
      item.product.remaining = remaining;
      item.product.purchased += item.quantity;
      item.product.buyingPrice = item.unitCost;
    }

    return tx.purchase.create({
      data: {
        businessId: args.businessId,
        supplierId: args.supplierId,
        purchaseDate: args.purchaseDate,
        receiptNumber: `SIM-PO-${String(args.receiptSeq).padStart(4, '0')}`,
        notes: `${MARKER} Restock simulation`,
        totalCost,
        items: {
          create: args.items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
          })),
        },
      },
    });
  });

  await prisma.activityLog.create({
    data: {
      userId: args.userId,
      businessId: args.businessId,
      action: 'CREATE',
      entityType: 'Purchase',
      entityId: purchase.id,
      metadata: { totalCost, simulated: true } as Prisma.InputJsonValue,
    },
  });

  return purchase;
}

async function createSale(args: {
  businessId: string;
  userId: string;
  customerId: string | null;
  saleDate: Date;
  paymentMethod: PaymentMethod;
  items: Array<{ product: StockRow; quantity: number }>;
  threshold: number;
  receiptSeq: number;
}) {
  let totalAmount = 0;
  let totalProfit = 0;
  const saleItems = args.items.map((item) => {
    const sellingPrice = Math.round(item.product.sellingPrice);
    const buyingPrice = Math.round(item.product.buyingPrice);
    const profit = (sellingPrice - buyingPrice) * item.quantity;
    totalAmount += sellingPrice * item.quantity;
    totalProfit += profit;
    return {
      productId: item.product.id,
      quantity: item.quantity,
      sellingPrice,
      buyingPrice,
      profit,
    };
  });

  const sale = await prisma.$transaction(async (tx) => {
    for (const item of args.items) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.product.id } });
      if (product.remainingQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      const remaining = product.remainingQuantity - item.quantity;
      await tx.product.update({
        where: { id: product.id },
        data: {
          quantitySold: product.quantitySold + item.quantity,
          remainingQuantity: remaining,
          status: stockStatus(remaining, args.threshold),
        },
      });
      item.product.remaining = remaining;
      item.product.sold += item.quantity;
    }

    return tx.sale.create({
      data: {
        businessId: args.businessId,
        customerId: args.customerId,
        saleDate: args.saleDate,
        paymentMethod: args.paymentMethod,
        paymentStatus: 'PAID',
        totalAmount,
        totalProfit,
        receiptNumber: `SIM-R${String(args.receiptSeq).padStart(4, '0')}`,
        notes: `${MARKER} Sale simulation`,
        items: { create: saleItems },
      },
    });
  });

  await prisma.activityLog.create({
    data: {
      userId: args.userId,
      businessId: args.businessId,
      action: 'CREATE',
      entityType: 'Sale',
      entityId: sale.id,
      metadata: { totalAmount, totalProfit, simulated: true } as Prisma.InputJsonValue,
    },
  });

  return sale;
}

async function main() {
  assertLocalOnly();

  const business = BUSINESS_ID
    ? await prisma.business.findFirst({ where: { id: BUSINESS_ID, deletedAt: null } })
    : await prisma.business.findFirst({ where: { name: BUSINESS_NAME, deletedAt: null } });

  if (!business) {
    throw new Error(`Business not found: ${BUSINESS_ID || BUSINESS_NAME}`);
  }

  const productsDb = await prisma.product.findMany({
    where: { businessId: business.id, deletedAt: null, hasVariants: false },
  });

  if (!productsDb.length) {
    throw new Error(`No simple (non-variant) products on "${business.name}". Add products first.`);
  }

  console.log(`Simulating on "${business.name}" (${business.id})`);
  console.log(`Products: ${productsDb.map((p) => p.name).join(', ')}`);
  console.log(`Target transactions: ${TOTAL_TX}`);

  const categoryIds = await ensureCategories(business.id);
  await assignProductCategories(productsDb, categoryIds);
  const suppliers = await ensureSuppliers(business.id);
  const customers = await ensureCustomers(business.id);
  const enabledPayments = parseEnabledMethods(business.paymentMethods);
  const threshold = business.lowStockThreshold ?? 5;

  // Ensure shop accepts all methods for this simulation so payment variety shows up.
  if (enabledPayments.length < PAYMENT_METHODS.length) {
    await prisma.business.update({
      where: { id: business.id },
      data: { paymentMethods: PAYMENT_METHODS.join(',') },
    });
    console.log('Expanded business paymentMethods to all codes for simulation coverage.');
  }
  const payments = PAYMENT_METHODS;

  const stock: StockRow[] = productsDb.map((p) => ({
    id: p.id,
    name: p.name,
    buyingPrice: Number(p.buyingPrice),
    sellingPrice: Number(p.sellingPrice),
    remaining: p.remainingQuantity,
    purchased: p.quantityPurchased,
    sold: p.quantitySold,
    hasVariants: p.hasVariants,
  }));

  const rangeStart = new Date('2026-09-01T00:00:00');
  const rangeEnd = new Date('2026-10-27T23:59:59');

  // ~20% purchases (restocks), ~80% sales → ~500 total transactions
  const purchaseCount = Math.max(40, Math.round(TOTAL_TX * 0.2));
  const saleCount = TOTAL_TX - purchaseCount;

  type Planned =
    | { kind: 'purchase'; at: Date }
    | { kind: 'sale'; at: Date };

  const planned: Planned[] = [
    ...Array.from({ length: purchaseCount }, () => ({
      kind: 'purchase' as const,
      at: randomDate(rangeStart, rangeEnd),
    })),
    ...Array.from({ length: saleCount }, () => ({
      kind: 'sale' as const,
      at: randomDate(rangeStart, rangeEnd),
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  let purchasesCreated = 0;
  let salesCreated = 0;
  let purchaseReceipt = 1;
  let saleReceipt = 1;
  const paymentTally: Record<string, number> = {};

  for (const event of planned) {
    if (event.kind === 'purchase') {
      const lineCount = randInt(1, Math.min(3, stock.length));
      const shuffled = [...stock].sort(() => Math.random() - 0.5).slice(0, lineCount);
      const items = shuffled.map((product) => {
        const quantity = randInt(8, 40);
        const unitCost = Math.max(
          1,
          Math.round(product.buyingPrice * (0.9 + Math.random() * 0.25)),
        );
        return { product, quantity, unitCost };
      });
      const supplier = pick(suppliers);
      await createPurchase({
        businessId: business.id,
        userId: business.userId,
        supplierId: supplier.id,
        purchaseDate: event.at,
        items,
        threshold,
        receiptSeq: purchaseReceipt++,
      });
      purchasesCreated += 1;
      continue;
    }

    // Sale — restock first if needed so we never sell into negative stock
    let product = pick(stock);
    const qtyWanted = randInt(1, 3);
    if (product.remaining < qtyWanted) {
      const restockQty = randInt(15, 50);
      const unitCost = Math.max(1, Math.round(product.buyingPrice));
      await createPurchase({
        businessId: business.id,
        userId: business.userId,
        supplierId: pick(suppliers).id,
        purchaseDate: new Date(event.at.getTime() - 60 * 60 * 1000),
        items: [{ product, quantity: restockQty, unitCost }],
        threshold,
        receiptSeq: purchaseReceipt++,
      });
      purchasesCreated += 1;
    }

    // Prefer products with stock
    const available = stock.filter((p) => p.remaining > 0);
    if (!available.length) {
      const emergency = pick(stock);
      await createPurchase({
        businessId: business.id,
        userId: business.userId,
        supplierId: pick(suppliers).id,
        purchaseDate: new Date(event.at.getTime() - 60 * 60 * 1000),
        items: [{ product: emergency, quantity: 30, unitCost: Math.round(emergency.buyingPrice) }],
        threshold,
        receiptSeq: purchaseReceipt++,
      });
      purchasesCreated += 1;
      product = emergency;
    } else {
      product = pick(available);
    }

    const quantity = Math.min(qtyWanted, product.remaining);
    if (quantity <= 0) continue;

    const lineCount = Math.random() < 0.25 ? Math.min(2, available.length) : 1;
    const saleLines: Array<{ product: StockRow; quantity: number }> = [];
    const used = new Set<string>();

    for (let i = 0; i < lineCount; i += 1) {
      const candidates = stock.filter((p) => p.remaining > 0 && !used.has(p.id));
      if (!candidates.length) break;
      const chosen = i === 0 ? product : pick(candidates);
      const q = Math.min(randInt(1, 3), chosen.remaining);
      if (q <= 0) continue;
      used.add(chosen.id);
      saleLines.push({ product: chosen, quantity: q });
    }

    if (!saleLines.length) continue;

    const paymentMethod = weightedPayment(payments);
    paymentTally[paymentMethod] = (paymentTally[paymentMethod] || 0) + 1;

    const useCustomer = Math.random() < 0.75;
    const customer = useCustomer ? pick(customers) : null;

    await createSale({
      businessId: business.id,
      userId: business.userId,
      customerId: customer?.id ?? null,
      saleDate: event.at,
      paymentMethod,
      items: saleLines,
      threshold,
      receiptSeq: saleReceipt++,
    });
    salesCreated += 1;
  }

  const refreshed = await prisma.product.findMany({
    where: { businessId: business.id, deletedAt: null },
    select: {
      name: true,
      remainingQuantity: true,
      quantityPurchased: true,
      quantitySold: true,
      status: true,
      category: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });

  console.log('\nDone (local test data only).');
  console.log(`Purchases created: ${purchasesCreated}`);
  console.log(`Sales created:     ${salesCreated}`);
  console.log(`Total TX:          ${purchasesCreated + salesCreated}`);
  console.log('Payment mix:', paymentTally);
  console.log('Categories:', CATEGORIES.map((c) => c.name).join(', '));
  console.log('Suppliers:', suppliers.map((s) => s.name).join(', '));
  console.log('Customers:', customers.length);
  console.log('\nProduct stock after simulation:');
  for (const p of refreshed) {
    console.log(
      `  ${p.name} | cat=${p.category?.name ?? '-'} | supplier=${p.supplier?.name ?? '-'} | ` +
        `bought=${p.quantityPurchased} sold=${p.quantitySold} left=${p.remainingQuantity} (${p.status})`,
    );
  }
  console.log(`\nRows are tagged with notes containing ${MARKER}. Do not run against production.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
