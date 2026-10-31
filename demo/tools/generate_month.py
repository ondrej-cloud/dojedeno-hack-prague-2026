"""Deterministic synthetic scenario. No external dependencies; kilograms throughout."""
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rng = random.Random(2026)
names = ["Koprová omáčka s vejcem a bramborem", "Čočka na kyselo s vejcem", "Kuřecí rizoto se zeleninou", "Svíčková na smetaně s knedlíkem", "Segedínský guláš s knedlíkem", "Rajská omáčka s těstovinami", "Kuře na paprice s rýží", "Rybí filé s bramborovou kaší", "Špagety s boloňskou omáčkou", "Smažený sýr s bramborem", "Buchtičky se šodó"]
soups = ["Hovězí vývar s nudlemi", "Čočková", "Kulajda", "Bramboračka", "Zeleninová", "Rajská"]
rates = [.61, .43, .32, .24, .27, .29, .22, .39, .16, .09, .18]
weights = [rng.uniform(.82, 1.18) for _ in range(20)]
totals = [round(w / sum(weights) * 1700, 3) for w in weights]
totals[-1] = round(1700 - sum(totals[:-1]), 3)
days = []
for i, total in enumerate(totals):
    plate, unserved = round(total * .48, 6), round(total * .43, 6)
    prep = round(total - plate - unserved, 6)
    # Two mains each day. Every rice service leaves 38 reference portions.
    a = 2 if i % 4 == 0 else (i % len(names))
    b = (i + 5) % len(names)
    if a == b:
        b = (b + 1) % len(names)
    main = plate * .83
    ratio = rates[a] / (rates[a] + rates[b])
    main_plate = [main * ratio, main * (1-ratio)]
    available = unserved * .9
    share = [available * .5, available * .5]
    if 2 in [a, b]:
        slot = [a, b].index(2)
        share[slot] = 38 * .4
        share[1-slot] = available - share[slot]
    lunches = rng.randint(430,470)
    served = [main_plate[j] / rates[idx] for j, idx in enumerate([a, b])]
    # Allocate all lunches; actual average served portions may differ from
    # the standard 400 g reference used to plan unserved food reductions.
    servings = [round(lunches * served[0] / sum(served)), 0]
    servings[1] = lunches - servings[0]
    dishes = []
    for j, idx in enumerate([a, b]):
        dishes.append({"id": f"main-{idx}", "name": names[idx], "type": "main", "portionKg": .4, "servings": servings[j], "servedPortionKg": served[j] / servings[j], "plateKg": main_plate[j], "servedKg": served[j], "unservedKg": share[j]})
    soup = i % 6
    soup_plate = plate * .13
    dishes.append({"id": f"soup-{soup}", "name": soups[soup], "type": "soup", "portionKg": .2, "plateKg": soup_plate, "servedKg": soup_plate / (.55 if soup in [1,2] else .18), "unservedKg": unserved * .1})
    # Side salad or dessert leftovers belong to that day's service.
    dishes.append({"id": "side", "name": "Salát / dezert", "type": "side", "plateKg": plate * .04, "servedKg": plate * .04 / .15, "unservedKg": 0})
    days.append({"day": i+1, "lunches": lunches, "plateKg": plate, "unservedKg": unserved, "prepKg": prep, "dishes": dishes, "components": {"Příloha": plate*.44, "Maso": plate*.20, "Omáčka": plate*.19, "Polévka": plate*.13, "Dezert / salát": plate*.04}})
result = {"synthetic": True, "seed": 2026, "assumptions": {"riceReductionFraction": 35/38, "recipeReduction": .25, "sideReduction": .2, "soupReduction": .3, "donationFraction": .25, "competitionReduction": .1}, "days": days}
(ROOT / 'data/month.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f"Generated {len(days)} days, {sum(totals):.0f} kg")
