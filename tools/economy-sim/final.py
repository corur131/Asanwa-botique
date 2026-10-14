import econ, json, sys

# Keep the current customer-spend ceiling as a baseline; then forecast the roadmap's
# planned Batch 3 rich-customer budget range separately. Rent/move-in values are proposals.
slow_chance = float(sys.argv[1]) if len(sys.argv) > 1 else 0
econ.P.update(
    markup=1.35,
    budget={'poor': (6_000, 18_000), 'middle': (20_000, 60_000), 'rich': (100_000, 300_000)},
    fee={'poor': 2_000, 'middle': 5_000, 'rich': 15_000},
    start_cash=200_000,
    slow_chance=slow_chance,
    weighted_rich_budget=False,
    celebrity_enabled=False,
    celebrity_signature=False,
)
for i, (rent, move_in) in enumerate([
    (30_000, 0),
    (120_000, 100_000),
    (1_000_000, 3_000_000),
    (4_000_000, 12_000_000),
    (12_000_000, 35_000_000),
    (30_000_000, 75_000_000),
    (75_000_000, 180_000_000),
]):
    econ.TIERS[i]['rent'] = rent
    econ.TIERS[i]['up'] = move_in

print('=== Current customer budget baseline (rich max ₦300,000) ===')
current = econ.run(days=200, n=300)
current_shock = econ.run(days=200, n=300, shock_day=60, shock=0.6)
for name in current:
    print(name, current[name]['reach'], 'demotions', current[name]['demotions'], 'broke days', current[name]['broke_days'], 'staff quits', current[name]['quits'])
print('--- Current-budget stress test: 60% cash shock on day 60')
for name in current_shock:
    print(name, current_shock[name]['reach'], 'demotions', current_shock[name]['demotions'], 'broke days', current_shock[name]['broke_days'])

# Forecast only: this is the planned Batch 3 customer-budget and celebrity expansion, not current live behaviour.
econ.P['budget']['rich'] = (100_000, 5_000_000)
econ.P['weighted_rich_budget'] = True
econ.P['celebrity_enabled'] = True
econ.P['celebrity_signature'] = False
print('=== Planned rich-customer forecast (rich budget ₦100,000–₦5,000,000; weighted below maximum) ===')
planned = econ.run(days=200, n=300)
planned_shock = econ.run(days=200, n=300, shock_day=60, shock=0.6)
for name in planned:
    print(name, planned[name]['reach'], 'demotions', planned[name]['demotions'], 'broke days', planned[name]['broke_days'], 'staff quits', planned[name]['quits'])
    print('  200-day celebrity model:', planned[name]['celebrity'])
print('--- Planned-budget stress test: 60% cash shock on day 60')
for name in planned_shock:
    print(name, planned_shock[name]['reach'], 'demotions', planned_shock[name]['demotions'], 'broke days', planned_shock[name]['broke_days'])

celebrity_forecast = econ.simulate_celebrity_forecast(days=200, runs=1000)
rent_coverage = [(shop, property_name) for shop, scenarios in celebrity_forecast.items() for property_name, values in scenarios.items() if values['premiumReceiptsAloneCoverFortnightRent']]
if rent_coverage:
    raise AssertionError('Celebrity premium receipts alone cover fortnightly rent under the current assumptions: ' + repr(rent_coverage))
print('=== Fixed-tier celebrity frequency and net payout forecast (200 days x 1,000 runs; 60% premium-quality assumption) ===')
for shop_name, scenarios in celebrity_forecast.items():
    print(shop_name, scenarios)

json.dump({
    'currentBudgetBaseline': current,
    'currentBudgetStress': current_shock,
    'plannedRichBudgetForecast': planned,
    'plannedRichBudgetStress': planned_shock,
    'celebrityOrderForecast': celebrity_forecast,
    'assumptions': {
        'rentTargetsAreProposals': True,
        'plannedRichBudgetRange': [100_000, 5_000_000],
        'plannedRichBudgetsAreWeightedBelowMaximum': True,
        'richBudgetBands': econ.RICH_RETAIL_BUDGET_BANDS,
        'celebritySpendRanges': econ.CELEBRITY_SPEND_RANGES,
        'celebrityFulfilmentRate': econ.CELEBRITY_FULFILMENT_RATE,
        'celebrityPremiumScoreSuccessAssumption': econ.CELEBRITY_PREMIUM_SCORE_SUCCESS_RATE,
        'celebrityForecastIncludesSecondaryCelebrityOpportunityPath': True,
        'secondaryCelebrityTipSchedulesTwoDaysAheadWithPendingVisitCooldown': True,
        'days': 200,
        'runsPerPlayerType': 300,
        'cashShock': {'day': 60, 'fraction': 0.6},
    },
}, open('results.json', 'w'))
