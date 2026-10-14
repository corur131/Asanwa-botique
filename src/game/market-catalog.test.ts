import assert from 'node:assert/strict';
import test from 'node:test';
import { WARDROBE } from '../constants/catalog';
import { GARMENTS } from '../components/renderer/garments';
import { MARKUP } from './economy';
import { canBuy, MARKET, pieceCost } from './market';

const levelSixIds = [
  'maisonSilkAtelierBlouse',
  'maisonTailoredTrousers',
  'maisonPrivateColumnGown',
  'maisonAsoOkeCapeGown',
  'maisonRoyalAgbada',
  'maisonVelvetDinnerSuit',
  'maisonDiamondRunwayPumps',
  'maisonPearlEveningBag',
  'maisonGoldWorkedGele',
  'maisonVirginHairLaceFront',
  'maisonHeirloomCoralNecklace',
  'maisonDiamondChronograph',
  'maisonGoldSunglasses',
] as const;

const levelSevenIds = [
  'empireSilkAtelierBlouse',
  'empireTailoredTrousers',
  'empireRedCarpetColumnGown',
  'empireImperialCapeGown',
  'empireRoyalAgbada',
  'empireVelvetTuxedoSet',
  'empireDiamondRunwayPumps',
  'empirePearlEveningBag',
  'empireGoldWorkedGele',
  'empireVirginHairLaceFront',
  'empireHeirloomCoralNecklace',
  'empireDiamondChronograph',
  'empireGoldSunglasses',
] as const;

function entryById(id: string) {
  const matches = MARKET.filter((entry) => entry.id === id);
  assert.equal(matches.length, 1, id + ' must be one unique item in the market catalogue');
  return matches[0]!;
}

function checkTierGroup(ids: readonly string[], unlockTier: 5 | 6, maxWholesale: number) {
  for (const id of ids) {
    const entry = entryById(id);
    assert.equal(entry.minTier, unlockTier, id + ' should declare its intended unlock tier');
    assert.equal(canBuy(entry, unlockTier - 1), false, id + ' must remain locked one tier below');
    assert.equal(canBuy(entry, unlockTier), true, id + ' should unlock at its designated tier');
    assert.equal(entry.luxury, true, id + ' should be classified as luxury');
    const wholesale = pieceCost(entry, entry.fabric);
    const retail = wholesale * MARKUP;
    assert.ok(retail > wholesale, id + ' retail price should be above wholesale');
    assert.ok((retail - wholesale) / retail >= 0.25, id + ' should retain at least a 25% gross margin');
    assert.ok(wholesale <= maxWholesale, id + ' wholesale should stay within the proposed tier price range');
  }
}

test('Level 6 Maison products unlock at Level 6 and retain sustainable margins', () => {
  checkTierGroup(levelSixIds, 5, 1_300_000);
});

test('Level 7 Empire products unlock only at Level 7 and retain sustainable margins', () => {
  checkTierGroup(levelSevenIds, 6, 2_200_000);
});

test('each top-tier shop has an accessible two-piece designer capsule', () => {
  const maisonEntry = entryById('maisonSilkAtelierBlouse');
  const maisonTrousers = entryById('maisonTailoredTrousers');
  const empireEntry = entryById('empireSilkAtelierBlouse');
  const empireTrousers = entryById('empireTailoredTrousers');

  assert.equal(pieceCost(maisonEntry, maisonEntry.fabric) + pieceCost(maisonTrousers, maisonTrousers.fabric), 175_000);
  assert.equal(pieceCost(empireEntry, empireEntry.fabric) + pieceCost(empireTrousers, empireTrousers.fabric), 205_000);
});

test('40 original global couture designs have distinct, real renderer drawings', () => {
  const designs = WARDROBE.filter((item) => item.id.startsWith('couture26'));
  assert.equal(designs.length, 40, 'all 40 new couture pieces should exist in the wardrobe catalogue');
  assert.equal(new Set(designs.map((item) => item.renderId)).size, 40, 'each new product needs its own renderer ID');
  for (const item of designs) {
    assert.equal(item.native, false, item.id + ' must be non-native/global fashion');
    assert.ok(item.renderId, item.id + ' must declare a renderer');
    assert.ok(GARMENTS[item.renderId!], item.id + ' must point to an actual drawn garment, not a reused placeholder');
    assert.ok(item.minTier === 5 || item.minTier === 6, item.id + ' must unlock at Level 6 or Level 7');
  }
  const counts: Array<{ label: string; gender: 'f' | 'm'; match: (group: string) => boolean; expected: number }> = [
    { label: 'women tops', gender: 'f', match: (g) => /Original Tops/.test(g), expected: 5 },
    { label: 'women bottoms', gender: 'f', match: (g) => /Original Bottoms/.test(g), expected: 5 },
    { label: 'women dresses', gender: 'f', match: (g) => /Original Dresses/.test(g), expected: 5 },
    { label: 'women outerwear', gender: 'f', match: (g) => /Original Outerwear/.test(g), expected: 5 },
    { label: 'women suiting', gender: 'f', match: (g) => /Original Tailored Suits/.test(g), expected: 5 },
    { label: 'men tops', gender: 'm', match: (g) => /Menswear Tops/.test(g), expected: 3 },
    { label: 'men bottoms', gender: 'm', match: (g) => /Menswear Bottoms/.test(g), expected: 3 },
    { label: 'men formal outfits', gender: 'm', match: (g) => /Menswear Suits/.test(g), expected: 3 },
    { label: 'men outerwear', gender: 'm', match: (g) => /Menswear Outerwear/.test(g), expected: 3 },
    { label: 'men suiting', gender: 'm', match: (g) => /Menswear Tailoring/.test(g), expected: 3 },
  ];
  for (const category of counts) {
    assert.equal(designs.filter((item) => item.for === category.gender && category.match(item.group)).length, category.expected, category.label + ' count');
  }
});
