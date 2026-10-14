#!/usr/bin/env python3
"""Sensitivity check for Batch 6 politician contracts.

This is an envelope/scenario simulation, not a claim about the catalogue's exact
average product prices. It mirrors the late-game contract tier rules and payout
formula in src/game/engine.ts, then tests premium wholesale-cost floors and ceilings
against the weekly rents used by the economy model. Unit-cost shares are deliberate
stress scenarios, not measured probabilities.
"""
from math import ceil, floor

MARKUP = 1.35
REWARD_MULTIPLIER = 4
COOLDOWN_DAYS = 45
SIMULATION_DAYS = 200
COST_SHARES = (0.10, 0.25, 0.50, 0.75, 1.00)

TIERS = (
    {
        "level": 6, "name": "Luxury Maison", "lines": 3, "min_qty": 40,
        "max_qty": 55, "retail_ceiling": 1_500_000, "min_unit_cost": 460_000, "min_reward": 220_000_000,
        "max_reward": 500_000_000, "weekly_rent": 30_000_000,
    },
    {
        "level": 7, "name": "Fashion Empire House", "lines": 4, "min_qty": 45,
        "max_qty": 65, "retail_ceiling": 3_000_000, "min_unit_cost": 700_000, "min_reward": 500_000_000,
        "max_reward": 1_000_000_000, "weekly_rent": 75_000_000,
    },
)


def max_eligible_unit_cost(retail_ceiling):
    """pieceCost() rounds to ₦100 and makePoliticianContractOffer rejects retail over ceiling."""
    return floor((retail_ceiling / MARKUP) / 100) * 100


def contract_reward(goods_cost, tier):
    scaled = ceil((goods_cost * REWARD_MULTIPLIER) / 1_000) * 1_000
    return min(tier["max_reward"], max(tier["min_reward"], scaled))


def contract_cost(unit_cost, quantity_per_line, tier):
    return unit_cost * quantity_per_line * tier["lines"]


def money(value):
    return f"₦{value / 1_000_000:,.2f}m"


def offer_days(days, cooldown, expire=False):
    """Count offers using engine timing: an unaccepted offer expires on offer day + 3."""
    day = 1
    count = 0
    while day <= days:
        count += 1
        last_activity = day + 3 if expire else day
        day = last_activity + cooldown
    return count


def margins_over_reachable_cost_envelope(tier, min_cost, max_cost):
    """Find minimum/maximum gross contribution within the permitted sourcing-cost envelope."""
    candidates = {
        max(min_cost, min(max_cost, point))
        for point in (min_cost, max_cost, tier["min_reward"] // 4, tier["max_reward"] // 4)
    }
    for point in tuple(candidates):
        for delta in (-1_000, -100, 0, 100, 1_000):
            candidates.add(max(min_cost, min(max_cost, point + delta)))
    rows = [(contract_reward(cost, tier) - cost, cost) for cost in candidates]
    min_margin, min_at_cost = min(rows)
    max_margin, max_at_cost = max(rows)
    return min_margin, min_at_cost, max_margin, max_at_cost


def main():
    delivered_offer_count = offer_days(SIMULATION_DAYS, COOLDOWN_DAYS, expire=False)
    expired_offer_count = offer_days(SIMULATION_DAYS, COOLDOWN_DAYS, expire=True)
    print("BATCH 6 CONTRACT ECONOMY CHECK")
    print("Scenario-based bounds; contract contribution = reward less wholesale sourcing cost.")
    print(f"Offer cooldown: {COOLDOWN_DAYS} days; horizon: {SIMULATION_DAYS} in-game days.")
    print(f"Potential offers if completed immediately: {delivered_offer_count}; if every offer expires: {expired_offer_count}.")
    assert delivered_offer_count <= 5 and expired_offer_count <= 5

    for tier in TIERS:
        max_unit_cost = max_eligible_unit_cost(tier["retail_ceiling"])
        min_qty = tier["lines"] * tier["min_qty"]
        max_qty = tier["lines"] * tier["max_qty"]
        min_cost = tier["min_unit_cost"] * min_qty
        max_cost = max_unit_cost * max_qty
        min_margin, min_at_cost, max_margin, max_at_cost = margins_over_reachable_cost_envelope(tier, min_cost, max_cost)
        calendar_rent = tier["weekly_rent"] * SIMULATION_DAYS / 7
        min_rent_cover = min_margin / tier["weekly_rent"]
        max_rent_cover = max_margin / tier["weekly_rent"]
        contribution_at_min_case = min_margin * delivered_offer_count
        rent_cover_horizon = contribution_at_min_case / calendar_rent

        print()
        print(f"Level {tier['level']} — {tier['name']}")
        print(f"  Minimum modelled sourcing spend for one full order: {money(min_cost)}")
        print(f"  Maximum modelled sourcing spend for one full order: {money(max_cost)}")
        print(f"  Gross contribution range after wholesale goods, before rent/wages/power: {money(min_margin)} to {money(max_margin)}")
        print(f"  Minimum contribution occurs at goods cost {money(min_at_cost)}; maximum at {money(max_at_cost)}.")
        print(f"  One contract's contribution equals {min_rent_cover:.2f}–{max_rent_cover:.2f} weeks of this tier's rent.")
        print(f"  200-day rent estimate: {money(calendar_rent)}; {delivered_offer_count} successful contracts at the minimum contribution would cover {rent_cover_horizon:.2f}x that rent.")

        midpoint_qty = (tier["min_qty"] + tier["max_qty"]) // 2
        print("  Mid-quantity cost sensitivity (position within the eligible wholesale-cost range):")
        for share in COST_SHARES:
            unit_cost = tier["min_unit_cost"] + floor(((max_unit_cost - tier["min_unit_cost"]) * share / 100) / 100) * 100
            unit_cost = min(max_unit_cost, max(tier["min_unit_cost"], unit_cost))
            goods_cost = contract_cost(unit_cost, midpoint_qty, tier)
            reward = contract_reward(goods_cost, tier)
            contribution = reward - goods_cost
            print(f"    {share:>4.0%} through cost range: goods {money(goods_cost)}, reward {money(reward)}, contribution {money(contribution)}")
            assert tier["min_reward"] <= reward <= tier["max_reward"]
            assert contribution > 0

        assert max_cost < tier["max_reward"]
        assert min_margin > 0
        # The payout floor/cap and four-times goods-cost rule should protect these
        # minimum contributions even at the formula transition points.
        assert min_margin >= (165_000_000 if tier["level"] == 6 else 375_000_000)
        assert min_cost == tier["min_unit_cost"] * tier["lines"] * tier["min_qty"]

    print()
    print("PASS: all tested scenarios stay inside the approved reward bands, cover wholesale sourcing cost,")
    print("and the 45-day cooldown limits major-contract opportunities to at most five per 200-day window.")
    print("NOTE: successful-delivery totals are conditional scenarios, not guaranteed player income.")


if __name__ == "__main__":
    main()
