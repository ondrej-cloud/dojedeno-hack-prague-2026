"""Deterministic sample data, not pilot measurements. Kilograms throughout."""
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAMES = [
    "Koprová omáčka s vejcem a bramborem", "Čočka na kyselo s vejcem",
    "Kuřecí rizoto se zeleninou", "Svíčková na smetaně s knedlíkem",
    "Segedínský guláš s knedlíkem", "Rajská omáčka s těstovinami",
    "Kuře na paprice s rýží", "Rybí filé s bramborovou kaší",
    "Špagety s boloňskou omáčkou", "Smažený sýr s bramborem",
    "Buchtičky se šodó", "Špenát s bramborem a vejcem",
]
SOUPS = ["Hovězí vývar s nudlemi", "Čočková", "Kulajda", "Bramboračka", "Zeleninová", "Rajská"]
RATES = [.43, .40, .32, .24, .27, .29, .22, .39, .16, .09, .18, .47]


def generate(seed=2026):
    rng = random.Random(seed)
    # Paired variation keeps both the 70 kg mean and the ±20% daily bound exact.
    totals = []
    for _ in range(10):
        delta = round(rng.uniform(0, 14), 3)
        totals.extend([round(70 - delta, 3), round(70 + delta, 3)])
    rng.shuffle(totals)
    days = []
    for i, total in enumerate(totals):
        plate, unserved = round(total * .48, 6), round(total * .43, 6)
        prep = round(total - plate - unserved, 6)
        a = 2 if i % 4 == 0 else (i % len(NAMES))
        b = (i + 5) % len(NAMES)
        if a == b:
            b = (b + 1) % len(NAMES)
        main = plate * .83
        ratio = RATES[a] / (RATES[a] + RATES[b])
        main_plate = [main * ratio, main * (1 - ratio)]
        available = unserved * .9
        share = [available * .5, available * .5]
        if 2 in [a, b]:
            slot = [a, b].index(2)
            # 38 standard 400 g portions remain; the suggested reduction is 35.
            share[slot] = 38 * .4
            share[1 - slot] = available - share[slot]
            assert share[1 - slot] >= 0
        lunches = rng.randint(430, 470)
        served = [main_plate[j] / RATES[idx] for j, idx in enumerate([a, b])]
        # The 400 g reference converts surplus kg to equivalent portions only.
        # Actual sample average serving weights are represented separately.
        servings = [round(lunches * served[0] / sum(served)), 0]
        servings[1] = lunches - servings[0]
        dishes = []
        for j, idx in enumerate([a, b]):
            dishes.append({
                "id": f"main-{idx}", "name": NAMES[idx], "type": "main",
                "portionKg": .4, "servings": servings[j],
                "servedPortionKg": served[j] / servings[j],
                "plateKg": main_plate[j], "servedKg": served[j], "unservedKg": share[j],
            })
        soup = i % len(SOUPS)
        soup_plate = plate * .13
        dishes.append({
            "id": f"soup-{soup}", "name": SOUPS[soup], "type": "soup", "portionKg": .2,
            "plateKg": soup_plate, "servedKg": soup_plate / (.55 if soup in [1, 2] else .18),
            "unservedKg": unserved * .1,
        })
        dishes.append({
            "id": "side", "name": "Salát / dezert", "type": "side",
            "plateKg": plate * .04, "servedKg": plate * .04 / .15, "unservedKg": 0,
        })
        days.append({
            "day": i + 1, "lunches": lunches, "plateKg": plate,
            "unservedKg": unserved, "prepKg": prep, "dishes": dishes,
            "components": {"Příloha": plate * .44, "Maso": plate * .20, "Omáčka": plate * .19,
                           "Polévka": plate * .13, "Dezert / salát": plate * .04},
        })
    return {"synthetic": True, "seed": seed, "assumptions": {"riceReductionFraction": 35 / 38}, "days": days}


if __name__ == '__main__':
    result = generate()
    (ROOT / 'data/month.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    total = sum(d['plateKg'] + d['unservedKg'] + d['prepKg'] for d in result['days'])
    print(f"Generated {len(result['days'])} sample days, {total:.0f} kg")
