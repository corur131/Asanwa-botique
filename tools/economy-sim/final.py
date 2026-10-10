import econ, json, statistics, sys
econ.P.update(markup=1.35, budget={'poor':(6000,18000),'middle':(20000,60000),'rich':(100000,300000)}, fee={'poor':2000,'middle':5000,'rich':15000}, start_cash=200_000, slow_chance=float(sys.argv[1]) if len(sys.argv)>1 else 0)
for i,(r,u) in enumerate([(30_000,0),(120_000,100_000),(330_000,500_000),(600_000,3_000_000),(850_000,8_500_000)]):
    econ.TIERS[i]['rent']=r; econ.TIERS[i]['up']=u
base=econ.run(days=200,n=300)
shock=econ.run(days=200,n=300,shock_day=60,shock=0.6)
for name in base:
    print(name, base[name]['reach'], 'demo', base[name]['demotions'], 'broke', base[name]['broke_days'], 'quits', base[name]['quits'])
print('--- Deborah takes 60% of cash on day 60')
for name in shock:
    print(name, shock[name]['reach'], 'demo', shock[name]['demotions'], 'broke', shock[name]['broke_days'])
json.dump(dict(base=base,shock=shock),open('results.json','w'))
