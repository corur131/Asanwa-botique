import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { MARKUP } from './economy';
import { buyCart, cartTotal, fromData, newGame, validateCart } from './engine';
import { canBuy, MARKET, pieceCost } from './market';
import {
  prepareShopperOrder, shopperDressRank, shopperEntryMatchesPreferences, shopperPriceBandMatches,
  shopperPriceCeiling, SHOPPER_PREFERENCE_CATEGORIES, shopperCategoryForKind, shopperAvailableBudget,
} from './shopper';
import type { ShopperBuyingPreference } from './types';
import type { GameState, ShopperOrderLine } from './types';

function game(overrides: Partial<GameState> = {}): GameState {
  return { ...newGame(DIVINE_CONFIG), ...overrides } as GameState;
}

function lineFor(item: (typeof MARKET)[number], pieces = 1): ShopperOrderLine {
  const fabric = ['top', 'bottom', 'dress', 'outer'].includes(item.kind) ? item.fabric || 'plain' : undefined;
  const color = item.kind === 'hair' ? '#1E1E24' : '#8E1F3A';
  const color2 = fabric ? '#C9A163' : color;
  const pattern = 0;
  return {
    key: [item.kind, item.id, fabric || '', color, color2, pattern].join('|'),
    kind: item.kind, itemId: item.id, fabric, color, color2, pattern, pieces,
  };
}

test('tier-aware shopper orders only use unlocked catalogue items and stay within budget', () => {
  const s = game({ cash: 500_000, tier: 0, marketCart: [] });
  const budget = 80_000;
  const result = prepareShopperOrder(s, 'variety', budget);
  assert.ok(result.job, result.error);
  assert.ok(result.job.estimatedTotal <= budget);
  assert.ok(result.job.estimatedTotal <= s.cash);
  assert.equal(validateCart(result.state, result.state.marketCart || []).ok, true, 'the shopper cart must pass the same checkout validator');
  for (const line of result.job.items) {
    const entry = MARKET.find((item) => item.kind === line.kind && item.id === line.itemId);
    assert.ok(entry, 'shopper must use the official catalogue');
    assert.ok(canBuy(entry!, s.tier), 'shopper must obey boutique unlocks');
    assert.ok(pieceCost(entry!, line.fabric) * MARKUP <= shopperPriceCeiling(s, 'variety'));
  }
  assert.equal(result.state.cash, s.cash, 'preparing an order must not charge cash');
  assert.equal(result.state.marketCart?.length, result.job.items.length);
  assert.equal(result.state.shopperJobs?.at(-1)?.id, result.job.id, 'the order is saved in GameState');
  assert.equal(result.state.msgSeq, (s.msgSeq || 0) + 1, 'a return notification is recorded');
  const roundTrip = fromData(JSON.parse(JSON.stringify(result.state)));
  assert.deepEqual(roundTrip?.marketCart, JSON.parse(JSON.stringify(result.state.marketCart)), 'cart survives save serialisation');
  assert.deepEqual(roundTrip?.shopperJobs, JSON.parse(JSON.stringify(result.state.shopperJobs)), 'shopper order survives save serialisation');
});

test('restock mission reacts to recorded recent sales and low inventory', () => {
  const base = game({ cash: 500_000, tier: 0, marketCart: [] });
  const design = base.stock.find((d) => canBuy(MARKET.find((m) => m.kind === d.kind && m.id === d.itemId)!, base.tier))!;
  const recent = {
    day: base.day - 1,
    designKey: [design.kind, design.itemId, design.fabric, design.color, design.color2, design.pattern].join('|'),
    kind: design.kind, itemId: design.itemId, fabric: design.fabric, color: design.color,
    color2: design.color2, pattern: design.pattern, customerClass: 'poor' as const, units: 6, tier: base.tier,
  };
  const s = { ...base, stock: base.stock.map((d) => d.uid === design.uid ? { ...d, pieces: 0 } : d), productSales: [recent] };
  const result = prepareShopperOrder(s, 'restock', 100_000);
  assert.ok(result.job, result.error);
  assert.ok(result.job.items.some((line) => line.kind === design.kind && line.itemId === design.itemId && line.color === design.color), 'recently successful sold-out variant should be shortlisted');
  assert.ok(result.job.estimatedTotal <= 100_000);
});

test('checkout rejects locked, malformed, duplicate, or unaffordable cart lines atomically', () => {
  const s = game({ cash: 100_000, tier: 0 });
  const locked = MARKET.find((item) => !canBuy(item, s.tier));
  assert.ok(locked, 'catalogue should include some higher-tier goods');
  const lockedLine = lineFor(locked!);
  assert.equal(validateCart(s, [lockedLine]).ok, false);
  assert.equal(buyCart(s, [lockedLine]), s, 'a rejected order must not partially mutate the game');

  const affordable = MARKET.find((item) => canBuy(item, s.tier) && pieceCost(item, item.fabric) > 0 && pieceCost(item, item.fabric) < s.cash / 2)!;
  const validLine = lineFor(affordable);
  assert.equal(validateCart(s, [validLine]).ok, true);
  assert.equal(validateCart(s, [validLine, { ...validLine }]).ok, false, 'duplicate lines must be rejected');
  const expensiveQuantity = { ...validLine, pieces: 501 };
  assert.equal(validateCart(s, [expensiveQuantity]).ok, false, 'checkout must reject orders beyond available funds or quantity rules');
  const after = buyCart(s, [validLine]);
  assert.notEqual(after, s);
  assert.equal(after.cash, s.cash - cartTotal([validLine]));
});

test('shopper cannot spend cash already reserved by items in the existing cart', () => {
  const s = game({ cash: 100_000, tier: 0, marketCart: [] });
  const entry = MARKET.find((item) => canBuy(item, s.tier) && pieceCost(item, item.fabric) < 50_000)!;
  const reservation = lineFor(entry, 1);
  const withCart = { ...s, marketCart: [reservation] };
  const result = prepareShopperOrder(withCart, 'variety', 100_000);
  assert.ok(result.job, result.error);
  assert.ok(result.job.budget <= s.cash - cartTotal([reservation]));
  assert.ok(cartTotal(result.state.marketCart || []) <= s.cash, 'the combined cart must remain payable when generated');
});


test('rich-customer mission prioritises unlocked luxury items and scales order quantities with budget', () => {
  // Scaling is checked at Luxury Maison: a small Boutique has too few luxury styles for
  // ₦50m to buy anything but duplicates, which celebrity shopping deliberately avoids.
  const s = game({ cash: 200_000_000, tier: 5, stock: [], marketCart: [], productSales: [] });
  const small = prepareShopperOrder(s, 'richCustomers', 5_000_000);
  const large = prepareShopperOrder(s, 'richCustomers', 50_000_000);
  assert.ok(small.job, small.error);
  assert.ok(large.job, large.error);

  const luxuryLines = small.job.items.filter((line) => {
    const entry = MARKET.find((item) => item.kind === line.kind && item.id === line.itemId);
    return !!entry?.luxury;
  });
  assert.ok(luxuryLines.length > 0, 'rich-customer sourcing should include unlocked luxury products where the tier has them');
  assert.ok(large.job.items.some((line) => line.pieces > 1), 'premium shopping should buy more than one piece when the budget supports it');
  assert.ok(large.job.estimatedTotal > small.job.estimatedTotal * 2, 'a much larger budget should materially increase the proposed order, not return almost the same tiny cart');
  assert.ok(large.job.items.length > small.job.items.length, 'a larger budget should bring more styles or colourways');
  assert.ok(large.job.items.every((line) => line.pieces <= 3), 'celebrity orders never pile up one luxury colourway');
  assert.ok(small.job.estimatedTotal <= 5_000_000);
  assert.ok(large.job.estimatedTotal <= 50_000_000);

  const ceiling = shopperPriceCeiling(s, 'richCustomers');
  for (const line of large.job.items) {
    const entry = MARKET.find((item) => item.kind === line.kind && item.id === line.itemId)!;
    assert.ok(pieceCost(entry, line.fabric) * MARKUP <= ceiling, 'premium mission must respect the tier-specific retail ceiling');
    assert.ok(canBuy(entry, s.tier), 'premium mission must not bypass product unlocks');
  }
});

test('shopper examples guide the proposed cart toward the requested catalogue products', () => {
  const s = game({ cash: 10_000_000, tier: 2, stock: [], marketCart: [] });
  const ceiling = shopperPriceCeiling(s, 'richCustomers');
  const target = MARKET.find((item) =>
    canBuy(item, s.tier) &&
    item.luxury &&
    pieceCost(item, item.fabric) * MARKUP <= ceiling &&
    item.label.trim().split(/\s+/).filter((word) => word.length >= 4).length >= 2,
  );
  assert.ok(target, 'test catalogue should include an unlocked premium item with a descriptive label');

  const result = prepareShopperOrder(s, 'richCustomers', 5_000_000, '', undefined, target!.label);
  assert.ok(result.job, result.error);
  assert.ok(result.job.items.some((line) => line.kind === target!.kind && line.itemId === target!.id),
    'shopper should prioritise the exact requested example when that catalogue entry is available');
  assert.ok(result.job.summary.includes(target!.label), 'order summary should remember what examples were requested');
});


test('explicit shopper preferences strictly filter audience, category, and game dressing rank', () => {
  const preferences: ShopperBuyingPreference[] = [
    { audience: 'men', category: 'top', ranks: [2] },
  ];
  const s = game({
    cash: 100_000_000,
    tier: 4,
    stock: [],
    marketCart: [],
    productSales: [],
    shopperPreferences: preferences,
  });
  const result = prepareShopperOrder(s, 'variety', 10_000_000, '', undefined, '', preferences);
  assert.ok(result.job, result.error);
  assert.ok(result.job.items.length > 0, 'the flagship catalogue has eligible luxury menswear tops');
  assert.deepEqual(result.job.preferences, preferences, 'selected filters should be recorded with the order');
  assert.ok(result.job.items.every((line) => {
    const entry = MARKET.find((item) => item.kind === line.kind && item.id === line.itemId);
    return !!entry && shopperEntryMatchesPreferences(entry, preferences);
  }), 'the order may contain only items matching the selected filter');
  assert.ok(result.job.items.every((line) => {
    const entry = MARKET.find((item) => item.kind === line.kind && item.id === line.itemId)!;
    return entry.for === 'm' && entry.kind === 'top' && shopperDressRank(entry) === 2;
  }), 'cheap womenswear, accessories, and lower-rank tops must never leak into the cart');
  assert.ok(result.job.estimatedTotal <= 10_000_000);
  assert.deepEqual(result.state.shopperPreferences, preferences, 'preferences remain saved in the game state');
});

test('rich-customer mission defaults to the exact luxury rank instead of filling the cart with cheaper ranks', () => {
  const s = game({ cash: 100_000_000, tier: 2, stock: [], marketCart: [], productSales: [] });
  const result = prepareShopperOrder(s, 'richCustomers', 50_000_000);
  assert.ok(result.job, result.error);
  assert.ok(result.job.items.length > 0, 'this tier unlocks luxury-rank products');
  assert.ok(result.job.items.every((line) => {
    const entry = MARKET.find((item) => item.kind === line.kind && item.id === line.itemId)!;
    return shopperDressRank(entry) === 2;
  }), 'rich-customer shopping without manual filters must buy only rank-2 items');
});

test('selected shopper preferences let a restock mission add new products that match the requested filters', () => {
  const preferences: ShopperBuyingPreference[] = [
    { audience: 'men', category: 'top', ranks: [2] },
  ];
  const s = game({ cash: 30_000_000, tier: 4, stock: [], marketCart: [], shopperPreferences: preferences });
  const result = prepareShopperOrder(s, 'restock', 5_000_000, '', undefined, '', preferences);
  assert.ok(result.job, result.error);
  assert.ok(result.job.items.length > 0, 'selected preferences let restock introduce an eligible product when none is stocked');
  for (const line of result.job.items) {
    const entry = MARKET.find((item) => item.kind === line.kind && item.id === line.itemId)!;
    assert.ok(shopperEntryMatchesPreferences(entry, preferences));
  }
});


test('strict Very Expensive and Million-naira filters use actual per-piece purchase cost, not rich/luxury labels', () => {
  const s = game({ cash: 100_000_000, tier: 4, stock: [], marketCart: [], productSales: [] });
  const veryExpensive: ShopperBuyingPreference[] = [
    { audience: 'women', category: 'dress', ranks: [], priceBands: ['veryExpensive'] },
  ];
  const millionCouture: ShopperBuyingPreference[] = [
    { audience: 'women', category: 'dress', ranks: [], priceBands: ['millionCouture'] },
  ];
  const bandA = MARKET.find((entry) => entry.kind === 'dress' && entry.for !== 'm' &&
    canBuy(entry, s.tier) && shopperPriceBandMatches(entry, 'veryExpensive'));
  const bandB = MARKET.find((entry) => entry.kind === 'dress' && entry.for !== 'm' &&
    canBuy(entry, s.tier) && shopperPriceBandMatches(entry, 'millionCouture'));
  assert.ok(bandA, 'catalogue should contain unlockable gowns/native sets in the ₦500k–₦999,999 band');
  assert.ok(bandB, 'catalogue should contain unlockable gowns/native sets in the ₦1m+ band');
  assert.equal(shopperPriceBandMatches(bandA!, 'millionCouture'), false);
  assert.equal(shopperPriceBandMatches(bandB!, 'veryExpensive'), false);

  for (const { preferences, band } of [
    { preferences: veryExpensive, band: 'veryExpensive' as const },
    { preferences: millionCouture, band: 'millionCouture' as const },
  ]) {
    const result = prepareShopperOrder(s, 'variety', 50_000_000, '', undefined, '', preferences);
    assert.ok(result.job, result.error);
    assert.ok(result.job.items.length > 0);
    for (const line of result.job.items) {
      const entry = MARKET.find((item) => item.kind === line.kind && item.id === line.itemId)!;
      assert.ok(shopperPriceBandMatches(entry, band, line.fabric), 'each piece must remain in the selected strict price band');
      assert.ok(shopperEntryMatchesPreferences(entry, preferences, line.fabric));
    }
  }
});

test('a generously funded contract order buys only listed products and no more than the contract quantities', () => {
  const base = game({ cash: 100_000_000, tier: 4, stock: [], marketCart: [], productSales: [] });
  const eligible = MARKET.filter((entry) => canBuy(entry, base.tier))
    .sort((a, b) => pieceCost(b, b.fabric) - pieceCost(a, a.fabric));
  const first = eligible[0]!;
  const second = eligible.find((entry) => entry.kind !== first.kind || entry.id !== first.id)!;
  const requirements = [
    { kind: first.kind, itemId: first.id, label: first.label, quantity: 3, unitCost: pieceCost(first, first.fabric) },
    { kind: second.kind, itemId: second.id, label: second.label, quantity: 5, unitCost: pieceCost(second, second.fabric) },
  ];
  const contract: NonNullable<GameState['politicianContracts']>[number] = {
    id: 'test-contract-rich-budget', client: 'Test Client', title: 'Exact contract quantities',
    brief: 'Only the listed items', offeredDay: base.day, offerExpiresDay: base.day + 3,
    deadlineDays: 5, deadlineDay: base.day + 5, acceptedDay: base.day, status: 'accepted',
    requirements, reward: 1_000_000, failurePenalty: 100_000,
  };
  const s = { ...base, politicianContracts: [contract] };
  const result = prepareShopperOrder(s, 'contract', 50_000_000, contract.brief, contract.id);
  assert.ok(result.job, result.error);
  assert.deepEqual(
    result.job.items.map((line) => ({ kind: line.kind, itemId: line.itemId, pieces: line.pieces })),
    requirements.map((requirement) => ({ kind: requirement.kind, itemId: requirement.itemId, pieces: requirement.quantity })),
    'a large budget must not create extra quantities or add unrelated products, and listed order must be preserved',
  );
  assert.equal(result.job.estimatedTotal, requirements.reduce((sum, requirement) => sum + requirement.unitCost * requirement.quantity, 0));
});

test('an underfunded contract order buys only the affordable requested quantity and never substitutes', () => {
  const base = game({ cash: 100_000_000, tier: 4, stock: [], marketCart: [], productSales: [] });
  const expensive = MARKET.filter((entry) => canBuy(entry, base.tier))
    .sort((a, b) => pieceCost(b, b.fabric) - pieceCost(a, a.fabric))[0]!;
  const unitCost = pieceCost(expensive, expensive.fabric);
  const contract: NonNullable<GameState['politicianContracts']>[number] = {
    id: 'test-contract-short-budget', client: 'Test Client', title: 'Partial contract order',
    brief: 'Only this required product', offeredDay: base.day, offerExpiresDay: base.day + 3,
    deadlineDays: 5, deadlineDay: base.day + 5, acceptedDay: base.day, status: 'accepted',
    requirements: [{ kind: expensive.kind, itemId: expensive.id, label: expensive.label, quantity: 10, unitCost }],
    reward: 1_000_000, failurePenalty: 100_000,
  };
  const budget = unitCost * 3 + Math.floor(unitCost / 2);
  const result = prepareShopperOrder({ ...base, politicianContracts: [contract] }, 'contract', budget, contract.brief, contract.id);
  assert.ok(result.job, result.error);
  assert.equal(result.job.items.length, 1, 'only the specified contract product may be bought');
  assert.equal(result.job.items[0].kind, expensive.kind);
  assert.equal(result.job.items[0].itemId, expensive.id);
  assert.equal(result.job.items[0].pieces, 3, 'the limited budget buys only the number of pieces it can afford');
  assert.equal(result.job.estimatedTotal, unitCost * 3);
  assert.ok(result.job.estimatedTotal <= budget);
});


test('rich-customer mission honours exact price bands for matching styles already in stock', () => {
  const target = MARKET.find((entry) =>
    entry.kind === 'dress' && entry.for !== 'm' && canBuy(entry, 4) &&
    shopperPriceBandMatches(entry, 'millionCouture'),
  );
  assert.ok(target, 'catalogue should contain an unlocked million-naira dress');
  const preference: ShopperBuyingPreference[] = [
    { audience: 'women', category: 'dress', ranks: [], priceBands: ['millionCouture'] },
  ];
  const fabric = target!.fabric || 'plain';
  const unitCost = pieceCost(target!, fabric);
  const stockedDesign = {
    uid: 'test-millionnaira-dress',
    kind: target!.kind,
    itemId: target!.id,
    label: target!.label,
    fabric,
    color: '#8E1F3A',
    color2: '#C9A163',
    pattern: 0,
    cost: unitCost,
    pieces: 4,
    displayed: true,
  };
  const s = game({
    cash: 100_000_000, tier: 4, stock: [stockedDesign], marketCart: [],
    productSales: [], shopperPreferences: preference,
  });
  const result = prepareShopperOrder(s, 'richCustomers', 50_000_000, '', undefined, '', preference);
  assert.ok(result.job, result.error);
  assert.ok(result.job.items.some((line) => line.kind === target!.kind && line.itemId === target!.id),
    'the shopper can top up a matching style even if it already has stock');
  assert.ok(result.job.items.every((line) => {
    const entry = MARKET.find((item) => item.kind === line.kind && item.id === line.itemId)!;
    return shopperPriceBandMatches(entry, 'millionCouture', line.fabric);
  }), 'the old rich-customer spending ceiling must not filter a selected million-naira item');
});


test('when both exact price bands are selected, the shopper includes products from both if unlocked items exist', () => {
  const s = game({ cash: 100_000_000, tier: 4, stock: [], marketCart: [], productSales: [] });
  const preferences: ShopperBuyingPreference[] = [
    { audience: 'women', category: 'dress', ranks: [], priceBands: ['veryExpensive', 'millionCouture'] },
  ];
  const result = prepareShopperOrder(s, 'variety', 50_000_000, '', undefined, '', preferences);
  assert.ok(result.job, result.error);
  const entries = result.job.items.map((line) =>
    MARKET.find((entry) => entry.kind === line.kind && entry.id === line.itemId)!,
  );
  assert.ok(entries.some((entry, index) =>
    shopperPriceBandMatches(entry, 'veryExpensive', result.job!.items[index].fabric)),
  'the order must include a ₦500k–₦999,999 product when both bands are selected');
  assert.ok(entries.some((entry, index) =>
    shopperPriceBandMatches(entry, 'millionCouture', result.job!.items[index].fabric)),
  'the order must also include a ₦1m+ product rather than filling only from the lower band');
});


test('restock fills currently missing shopper categories before repeating existing categories', () => {
  const s = game({ cash: 100_000_000, tier: 5, stock: [], marketCart: [], productSales: [] });
  const budget = 50_000_000;
  const ceiling = shopperPriceCeiling(s, 'restock');
  const expectedCategories = new Set(
    MARKET
      .filter((entry) => canBuy(entry, s.tier) &&
        pieceCost(entry, ['top', 'bottom', 'dress', 'outer'].includes(entry.kind) ? entry.fabric || 'plain' : undefined) * MARKUP <= ceiling)
      .map((entry) => shopperCategoryForKind(entry.kind)),
  );
  const result = prepareShopperOrder(s, 'restock', budget);
  assert.ok(result.job, result.error);
  const sourcedCategories = new Set(result.job.items.map((line) => shopperCategoryForKind(line.kind)));
  for (const category of expectedCategories) {
    assert.ok(sourcedCategories.has(category), `restock should source the eligible missing category: ${category}`);
  }
  assert.ok(result.job.items.length >= expectedCategories.size,
    'when the budget and tier allow it, category coverage should precede duplicate-category shopping');
  assert.ok(result.job.estimatedTotal <= budget);
});

test('fresh shopper assortment uses a balanced colour palette even when red and black dominate historical sales', () => {
  const s = game({ cash: 100_000_000, tier: 5, stock: [], marketCart: [], productSales: [] });
  const sales = Array.from({ length: 40 }, (_, index) => ({
    day: s.day - 1,
    designKey: `historic-${index}`,
    kind: index % 2 ? 'dress' as const : 'top' as const,
    itemId: `historic-item-${index}`,
    fabric: 'plain' as const,
    color: index % 2 ? '#1E1E24' : '#C2262E',
    color2: '#C9A163',
    pattern: 0,
    customerClass: 'rich' as const,
    units: 500,
    tier: s.tier,
  }));
  const result = prepareShopperOrder({ ...s, productSales: sales }, 'variety', 50_000_000);
  assert.ok(result.job, result.error);
  const colouredLines = result.job.items.filter((line) =>
    ['top', 'bottom', 'dress', 'outer', 'shoes', 'bag', 'headwear', 'hair'].includes(line.kind),
  );
  const uniqueColours = new Set(colouredLines.map((line) => line.color.toUpperCase()));
  assert.ok(uniqueColours.size >= 6,
    `a broad fresh order should use at least six distinct colours, got ${[...uniqueColours].join(', ')}`);
  assert.ok(colouredLines.some((line) => !['#1E1E24', '#C2262E'].includes(line.color.toUpperCase())),
    'historical red/black sales must not force every fresh product to repeat those colours');
  assert.ok(result.job.estimatedTotal <= 50_000_000);
});

test('shopper category mapping combines jewellery product kinds without losing other categories', () => {
  assert.equal(shopperCategoryForKind('necklace'), 'jewellery');
  assert.equal(shopperCategoryForKind('wrist'), 'jewellery');
  assert.equal(shopperCategoryForKind('earrings'), 'jewellery');
  assert.equal(shopperCategoryForKind('top'), 'top');
  assert.equal(shopperCategoryForKind('glasses'), 'glasses');
  assert.equal(SHOPPER_PREFERENCE_CATEGORIES.length, 10);
});

test('Kunle charges 5% commission (min ₦1,500) at checkout, only on his own items, only once', () => {
  const s = game({ cash: 2_000_000, tier: 1, stock: [], marketCart: [], productSales: [] });
  const order = prepareShopperOrder(s, 'variety', 300_000);
  assert.ok(order.job, order.error);
  const cart = order.state.marketCart || [];
  const goods = cartTotal(cart);
  const check = validateCart(order.state, cart);
  assert.equal(check.ok, true, check.errors.join('; '));
  assert.equal(check.commission, Math.max(1_500, Math.round(goods * 0.05 / 100) * 100));
  const after = buyCart(order.state, cart);
  assert.equal(after.cash, order.state.cash - goods - check.commission, 'goods and commission are both paid');
  assert.ok(after.ledger.some((row) => row.label.includes("Kunle's commission") && row.amount === -check.commission));
  assert.equal(validateCart(after, cart).commission, 0, 'a purchased order is never commissioned again');

  const manual = MARKET.find((item) => canBuy(item, 1) && !cart.some((l) => l.itemId === item.id) && pieceCost(item, item.fabric) < 10_000)!;
  assert.equal(validateCart(s, [lineFor(manual, 2)]).commission, 0, 'manual Yaba Mart shopping is free');
  assert.ok(shopperAvailableBudget(s) <= Math.floor((s.cash - 1_500) / 100) * 100, 'his fee is reserved before he spends');
});

test('fresh orders fill requested colours the racks are missing, and missed requests are prioritised', () => {
  const base = game({ cash: 50_000_000, tier: 3, stock: [], marketCart: [], productSales: [] });
  const misses = Array.from({ length: 8 }, () => ({ day: base.day - 2, color: '#6B8E23', name: 'lime' }));
  const result = prepareShopperOrder({ ...base, colourMisses: misses }, 'variety', 10_000_000);
  assert.ok(result.job, result.error);
  const clothing = result.job.items.filter((line) => ['top', 'bottom', 'dress', 'outer'].includes(line.kind));
  const requested = new Set(clothing.map((line) => line.color.toUpperCase()));
  assert.ok(requested.has('#6B8E23'), 'a colour customers kept asking for is bought');
  assert.ok(requested.size >= 10, `orders should cover most requested colours, got ${requested.size}`);
  const perStyle = new Map<string, number>();
  for (const line of clothing) perStyle.set(line.itemId, (perStyle.get(line.itemId) || 0) + 1);
  assert.ok([...perStyle.values()].every((n) => n <= 5), 'no everyday style is bought in every colour');
  assert.ok(result.job.summary.includes('lime'), 'his report explains the missed colour');
});

test('celebrity orders are mostly clothes, one piece per clothing colourway', () => {
  const s = game({ cash: 900_000_000, tier: 6, stock: [], marketCart: [], productSales: [] });
  const result = prepareShopperOrder(s, 'richCustomers', 300_000_000);
  assert.ok(result.job, result.error);
  const clothing = result.job.items.filter((line) => ['top', 'bottom', 'dress', 'outer'].includes(line.kind));
  assert.ok(clothing.length / result.job.items.length >= 0.6, 'clothes lead a celebrity order');
  assert.ok(clothing.every((line) => line.pieces === 1), 'celebrity clothes are one-offs per colour');
  assert.ok(result.job.items.length <= 250, 'the cart limit is respected');
});
