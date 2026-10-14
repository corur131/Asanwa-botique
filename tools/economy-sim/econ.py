"""Lagos Boutique economy simulation (Stage 1 shop core + staff).

Monte Carlo of N runs x D in-game days for three player types.
All money in naira. Item prices are wholesale; Divine sells at a markup.
A display slot holds one design with several pieces in stock (customers buy pieces).
"""
import random, statistics, json, sys

P = dict(
    start_cash=60_000,
    markup=1.6,                     # retail = wholesale x markup
    fee={'poor': 3_000, 'middle': 8_000, 'rich': 25_000},   # hair + makeup service
    supplies=0.35,                  # share of the fee spent on hair/makeup supplies
    budget={'poor': (10_000, 28_000), 'middle': (30_000, 90_000), 'rich': (140_000, 450_000)},
    pieces=2,                       # pieces bought per new design
    divine_cap=8,                   # customers Divine can style herself per day
    staff_cap=5,                    # extra customers per staff member
    celebrity_enabled=False,         # planned Batch 3 model; disabled for legacy budget baseline
    celebrity_signature=False,       # normal property baseline; Signature odds are forecast separately
)

# Keep the simulator aligned with src/game/customers.ts and src/game/economy.ts.
RICH_RETAIL_BUDGET_BANDS = [
    (0.65, 100_000, 500_000),
    (0.22, 500_000, 1_250_000),
    (0.09, 1_250_000, 2_500_000),
    (0.035, 2_500_000, 4_000_000),
    (0.005, 4_000_000, 5_000_000),
]
CELEBRITY_DAYS_BY_SHOP_TIER = [
    [], [], [2], [1, 9], [0, 5, 10], [0, 4, 8, 12], [0, 2, 4, 7, 9, 12],
]
CELEBRITY_VISIT_CHANCE = [0, 0, 0.75, 0.75, 0.72, 0.72, 0.74]
CELEBRITY_EXTRA_CHANCE = [0, 0, 0.04, 0.045, 0.05, 0.055, 0.06]
CELEBRITY_SPEND_RANGES = [
    (750_000, 8_500_000),
    (3_500_000, 12_500_000),
    (7_500_000, 20_000_000),
    (15_000_000, 35_000_000),
    (30_000_000, 210_000_000),
]
CELEBRITY_FULFILMENT_RATE = 0.45
CELEBRITY_PREMIUM_SCORE_SUCCESS_RATE = 0.60  # scenario assumption, not guaranteed gameplay success


# name, display slots, weekly rent, one-off upgrade cost (deposit + fit-out), base customers/day,
# class mix (poor, middle, rich) at 50 reputation, staff slots, daily running cost (light, fuel)
TIERS = [
    dict(name='Kiosk',                 slots=20,  rent=30_000,       up=0,           cust=9,  mix=(.70, .27, .03), staff=0,  run=1_500),
    dict(name='Small shop',            slots=30,  rent=120_000,      up=100_000,     cust=12, mix=(.55, .38, .07), staff=0,  run=3_000),
    dict(name='Boutique',              slots=50,  rent=1_000_000,    up=3_000_000,   cust=16, mix=(.42, .46, .12), staff=2,  run=12_000),
    dict(name='Big boutique',          slots=75,  rent=4_000_000,    up=12_000_000,  cust=21, mix=(.32, .50, .18), staff=4,  run=35_000),
    dict(name='Flagship',              slots=105, rent=12_000_000,   up=35_000_000,  cust=27, mix=(.25, .50, .25), staff=6,  run=80_000),
    dict(name='Luxury Maison',         slots=140, rent=30_000_000,   up=75_000_000,  cust=34, mix=(.18, .46, .36), staff=8,  run=160_000),
    dict(name='Fashion Empire House',  slots=180, rent=75_000_000,   up=180_000_000, cust=43, mix=(.12, .43, .45), staff=10, run=350_000),
]
# Approximate wholesale value per display design for each tier; premium levels carry more expensive stock.
AVG_W = [5_000, 6_500, 10_000, 15_000, 22_000, 35_000, 60_000]
NEED = {'poor': 10, 'middle': 25, 'rich': 50}

PLAYERS = {
    #          skill = share of the achievable score; price error; upgrade buffer in weeks of rent; trains staff?
    'good':    dict(skill=0.93, sd=6,  perr=0.04, buffer=3, train=True),
    'average': dict(skill=0.84, sd=9,  perr=0.10, buffer=2, train=True),
    'weak':    dict(skill=0.72, sd=12, perr=0.20, buffer=0, train=False),
}

STAFF = dict(trainee_wage=12_000, expert_wage=60_000, train_fee=lambda lvl: 15_000 * lvl)


def _nearest_5000(value):
    return int(round(value / 5_000) * 5_000)


def weighted_rich_budget(rnd):
    """Match the game's five weighted ₦100k–₦5m retail-budget bands exactly."""
    roll = rnd.random()
    cumulative = 0.0
    lo, hi = RICH_RETAIL_BUDGET_BANDS[-1][1:]
    for weight, band_lo, band_hi in RICH_RETAIL_BUDGET_BANDS:
        cumulative += weight
        if roll < cumulative:
            lo, hi = band_lo, band_hi
            break
    value = lo + rnd.random() * (hi - lo)
    return max(100_000, min(5_000_000, _nearest_5000(value)))


def low_weighted_amount(lo, hi, rnd):
    """Match the game's squared-random weighting toward a tier's lower spend values."""
    value = lo + (hi - lo) * (rnd.random() ** 2)
    return max(lo, min(hi, _nearest_5000(value)))


def celebrity_amounts(tier, rnd):
    lo, hi = CELEBRITY_SPEND_RANGES[max(0, min(4, int(tier)))]
    budget = low_weighted_amount(lo, hi, rnd)
    spend_floor = low_weighted_amount(lo, budget, rnd)
    return budget, spend_floor


def celebrity_visit_probability(shop_tier, signature=False):
    if shop_tier < 2:
        return 0.0
    base = CELEBRITY_VISIT_CHANCE[min(6, int(shop_tier))]
    return min(0.95, base + (0.15 if signature else 0.0))


def record_celebrity_visit(rnd, shop_tier, log):
    """Return conservative net premium receipt; normal-price celebrity sales are omitted."""
    log['celebrity_visits'] += 1
    highest = min(4, shop_tier)
    celebrity_tier = rnd.randint(0, highest)
    budget, spend_floor = celebrity_amounts(celebrity_tier, rnd)
    if rnd.random() >= CELEBRITY_PREMIUM_SCORE_SUCCESS_RATE:
        return 0
    gross = min(budget, spend_floor)
    tip_rate = 0.05 + celebrity_tier * 0.02
    tip = int(round((gross * tip_rate) / 100) * 100)
    fulfilment = max(0, int(round(gross * CELEBRITY_FULFILMENT_RATE)))
    net = gross + tip - fulfilment
    log['celebrity_premium_orders'] += 1
    log['celebrity_gross'] += gross
    log['celebrity_fulfilment_cost'] += fulfilment
    log['celebrity_net'] += net
    return net


def cap_score(tier, cls):
    t = TIERS[tier]
    variety = min(1.0, t['slots'] / NEED[cls])
    if cls == 'rich' and tier < 2:
        variety *= 0.75             # no luxury suppliers yet
    return 55 + 43 * variety


def simulate(pl, days=200, seed=0, shock_day=None, shock=0.0, fixed_tier=None):
    rnd = random.Random(seed)
    cash, rep, tier = P['start_cash'], 30.0, 0
    if fixed_tier is not None:
        tier, rep, cash = fixed_tier, 50.0, 10**9
    stock_value = 0
    staff = []                      # dicts: level, wage, loyalty, trained
    history, log = [], dict(upgrades={}, demotions=0, lost_customers=0, served=0, broke_days=0, quits=0, celebrity_visits=0, celebrity_premium_orders=0, celebrity_gross=0, celebrity_fulfilment_cost=0, celebrity_net=0)
    late_due, late_amount = None, 0
    hire_ok = 0
    slow = False

    def stock_needed(t):
        return TIERS[t]['slots'] * P['pieces'] * avg_w(t)

    def avg_w(t):
        return AVG_W[t]

    # day 0: stock the kiosk
    stock_value = stock_needed(0) * 0.7
    cash -= stock_value
    for day in range(1, days + 1):
        t = TIERS[tier]
        # morning: restock what sold yesterday is paid in sales loop (wholesale per sale)
        if shock_day and day == shock_day:
            cash -= cash * shock
        if day % 7 == 1:
            slow = rnd.random() < P.get('slow_chance', 0)   # rainy week, January, fuel scarcity
        n = max(5, round(t['cust'] * (0.6 + rep / 100 * 0.8) * rnd.uniform(0.85, 1.15) * (0.5 if slow else 1)))
        cap = P['divine_cap'] + P['staff_cap'] * len(staff)
        income = 0
        for i in range(n):
            if i >= cap:
                log['lost_customers'] += 1
                continue
            served_by_staff = i >= P['divine_cap']
            r = rnd.random()
            mix = t['mix']
            shift = (rep - 50) / 500
            cls = 'poor' if r < mix[0] - shift else ('middle' if r < mix[0] + mix[1] - shift / 2 else 'rich')
            if served_by_staff and cls == 'rich':
                cls = 'middle'      # rich clients always wait for Divine; staff take the small ones
            lo, hi = P['budget'][cls]
            if cls == 'rich' and P.get('weighted_rich_budget', False):
                budget = weighted_rich_budget(rnd)
            else:
                budget = rnd.uniform(lo, hi)
            fee = P['fee'][cls]
            W = max(1_000, (budget - fee) / P['markup'])
            fair = W * P['markup'] + fee
            price = fair * (1 + rnd.gauss(0, pl['perr']))
            if served_by_staff:
                s = staff[(i - P['divine_cap']) // P['staff_cap']]
                skill = 0.55 + 0.035 * s['level']
            else:
                skill = pl['skill']
            score = max(0, min(100, rnd.gauss(cap_score(tier, cls) * skill, pl['sd'])))
            # acceptance
            paid = price
            if price > budget * 1.05:
                if cls == 'poor':
                    continue                                   # walks out, no sale
                if cls == 'middle':
                    if score < 60:
                        continue
                    paid = budget
                if cls == 'rich' and score < 80:
                    paid = budget
            if score < 50:
                if rnd.random() < 0.4:
                    rep -= 1.5
                    continue                                   # refuses, items go back
                paid *= 0.7
            elif score < 65:
                paid *= 0.88
            tip = 0
            if score >= 85:
                tip = {'poor': .03, 'middle': .08, 'rich': .15}[cls] * paid
            elif score >= 75:
                tip = {'poor': .01, 'middle': .04, 'rich': .07}[cls] * paid
            cost = W + fee * P['supplies']
            income += paid + tip - cost
            influence = 3 if (cls == 'rich' and rnd.random() < 0.25) else 1
            rep = max(0, min(100, rep + (score - 65) / 18 * influence))
            log['served'] += 1
        # Planned Batch 3: scheduled celebrity opportunities, with the same tier gates and
        # rates as the game. Premium order revenue is only counted for 60% successful high-score
        # styling in this planning scenario and includes the game's 45% fulfilment expense.
        if P.get('celebrity_enabled', False) and tier >= 2:
            cycle_day = (day - 1) % 14
            signature = bool(P.get('celebrity_signature', False))
            schedule = CELEBRITY_DAYS_BY_SHOP_TIER[tier]
            if cycle_day in schedule and rnd.random() < celebrity_visit_probability(tier, signature):
                income += record_celebrity_visit(rnd, tier, log)
            extra_chance = CELEBRITY_EXTRA_CHANCE[tier] + (0.02 if signature else 0.0)
            if day >= 5 and rnd.random() < min(0.10, extra_chance):
                income += record_celebrity_visit(rnd, tier, log)

        cash += income
        cash -= t['run']
        # staff
        if t['staff'] and len(staff) < t['staff'] and n > cap and cash > 4 * t['rent'] and day >= hire_ok:
            if pl['train']:
                staff.append(dict(level=2, wage=STAFF['trainee_wage'], loyalty=30, trained=True))
                cash -= STAFF['trainee_wage'] * 0.5      # small signing fee
            else:
                staff.append(dict(level=8, wage=STAFF['expert_wage'], loyalty=20, trained=False))
                cash -= STAFF['expert_wage'] * 2         # experts want a signing bonus
            hire_ok = day + 7                            # finding the next hire takes a week
        if day % 7 == 0:
            for s in list(staff):
                cash -= s['wage']
                s['loyalty'] = min(100, s['loyalty'] + (4 if s['trained'] else 1))
                if pl['train'] and s['trained'] and s['level'] < 10 and cash > STAFF['train_fee'](s['level']) + 3 * t['rent']:
                    cash -= STAFF['train_fee'](s['level'])
                    s['level'] += 1
                    s['wage'] = int(s['wage'] * 1.12)
                    s['loyalty'] = min(100, s['loyalty'] + 8)
                # poaching offer
                if rnd.random() < 0.05 + 0.015 * s['level']:
                    extra = rnd.uniform(0.1, 1.5) * 100
                    limit = s['loyalty'] * (1.5 if s['trained'] else 0.6)
                    if extra > limit or rnd.random() < 0.02:
                        staff.remove(s)
                        log['quits'] += 1
                        hire_ok = day + 7
            # rent: unpaid rent gets the landlord's grace period, then demotion
            if cash >= t['rent']:
                cash -= t['rent']
            else:
                grace = rnd.choice([0, 2, 7, 7, 14])
                late_due = day + grace
                late_amount = t['rent']
                cash -= t['rent']          # owed; must be back above zero by late_due
        if late_due and day >= late_due:
            if cash < 0 and tier > 0:
                tier -= 1
                log['demotions'] += 1
                staff = staff[:TIERS[tier]['staff']]
                cash += late_amount * 0.5   # landlord keeps the deposit, waives half the debt
            late_due = None
        if day % 7 == 0:
            # upgrade decision (once a week, after rent)
            if tier + 1 < len(TIERS) and fixed_tier is None:
                nt = TIERS[tier + 1]
                need = nt['up'] + (stock_needed(tier + 1) - stock_needed(tier)) * 0.7 + pl['buffer'] * nt['rent']
                if cash >= need:
                    cash -= nt['up'] + (stock_needed(tier + 1) - stock_needed(tier)) * 0.7
                    tier += 1
                    log['upgrades'].setdefault(tier, day)
        if cash < 0:
            log['broke_days'] += 1
        history.append((day, tier, cash, rep))
    return history, log




def simulate_celebrity_forecast(days=200, runs=1000):
    """Fixed-tier 200-day frequency/payout simulation for normal and Signature properties."""
    forecast = {}
    for shop_tier in range(2, len(TIERS)):
        by_property = {}
        for signature in (False, True):
            total_visits = total_premium = total_gross = total_cost = total_net = 0
            for seed in range(runs):
                rnd = random.Random(900_000 + shop_tier * 10_000 + int(signature) * 1_000 + seed)
                log = dict(celebrity_visits=0, celebrity_premium_orders=0, celebrity_gross=0, celebrity_fulfilment_cost=0, celebrity_net=0)
                for day in range(1, days + 1):
                    cycle_day = (day - 1) % 14
                    if cycle_day in CELEBRITY_DAYS_BY_SHOP_TIER[shop_tier] and rnd.random() < celebrity_visit_probability(shop_tier, signature):
                        record_celebrity_visit(rnd, shop_tier, log)
                    extra_chance = CELEBRITY_EXTRA_CHANCE[shop_tier] + (0.02 if signature else 0.0)
                    if day >= 5 and rnd.random() < min(0.10, extra_chance):
                        record_celebrity_visit(rnd, shop_tier, log)
                total_visits += log['celebrity_visits']
                total_premium += log['celebrity_premium_orders']
                total_gross += log['celebrity_gross']
                total_cost += log['celebrity_fulfilment_cost']
                total_net += log['celebrity_net']
            fortnights = runs * days / 14
            average_net = total_net / fortnights
            by_property['signature' if signature else 'normal'] = {
                'visitsPerFortnight': round(total_visits / fortnights, 2),
                'premiumOrdersPerFortnight': round(total_premium / fortnights, 2),
                'grossPremiumReceiptsPerFortnight': round(total_gross / fortnights),
                'fulfilmentCostsPerFortnight': round(total_cost / fortnights),
                'netPremiumReceiptsPerFortnight': round(average_net),
                'fortnightRent': TIERS[shop_tier]['rent'] * 2,
                'premiumReceiptsAloneCoverFortnightRent': average_net >= TIERS[shop_tier]['rent'] * 2,
            }
        forecast[TIERS[shop_tier]['name']] = by_property
    return forecast


def run(days=200, n=400, shock_day=None, shock=0.0):
    out = {}
    for name, pl in PLAYERS.items():
        reach = {k: [] for k in range(1, len(TIERS))}
        tiers_by_day = [[] for _ in range(days)]
        demos, broke, lost, quits = [], [], [], []
        celebrity_stats = {key: [] for key in ('celebrity_visits', 'celebrity_premium_orders', 'celebrity_gross', 'celebrity_fulfilment_cost', 'celebrity_net')}
        for seed in range(n):
            h, lg = simulate(pl, days, seed, shock_day, shock)
            for k in range(1, len(TIERS)):
                if k in lg['upgrades']:
                    reach[k].append(lg['upgrades'][k])
            for d, t, c, r in h:
                tiers_by_day[d - 1].append(t)
            demos.append(lg['demotions']); broke.append(lg['broke_days']); lost.append(lg['lost_customers']); quits.append(lg['quits'])
            for key in celebrity_stats:
                celebrity_stats[key].append(lg[key])
        out[name] = dict(
            reach={TIERS[k]['name']: (round(statistics.median(v)) if len(v) > n / 2 else None, round(100 * len(v) / n)) for k, v in reach.items()},
            avg_tier_curve=[round(statistics.mean(x), 2) for x in tiers_by_day],
            demotions=round(statistics.mean(demos), 2),
            broke_days=round(statistics.mean(broke), 1),
            quits=round(statistics.mean(quits), 2),
            celebrity={key: round(statistics.mean(values), 2) for key, values in celebrity_stats.items()},
        )
    return out


if __name__ == '__main__':
    res = run()
    for k, v in res.items():
        print(k, v['reach'], 'demotions', v['demotions'], 'broke days', v['broke_days'], 'staff quits', v['quits'])
    if len(sys.argv) > 1:
        json.dump(res, open(sys.argv[1], 'w'))
