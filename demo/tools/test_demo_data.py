"""Check sample-data accounting and the quantities used by the presentation."""
import json
import math
from pathlib import Path
import unittest

from generate_month import generate

ROOT = Path(__file__).resolve().parents[1]


class SampleDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = json.loads((ROOT / 'config.json').read_text())
        cls.month = json.loads((ROOT / 'data/month.json').read_text())

    def test_committed_month_matches_reproducible_generator(self):
        self.assertEqual(self.month, generate())
        self.assertTrue(self.month['synthetic'])

    def test_day_accounting_and_cost_scope(self):
        day = self.config['day']
        self.assertEqual(sum(day[k] for k in ['plateKg', 'unservedKg', 'prepKg']), 70)
        self.assertEqual(sum(d['kg'] for d in day['dishes']), 70)
        self.assertEqual(day['plateKg'] * self.config['pricePerKg'], 3145)
        self.assertEqual(day['unservedKg'] / self.config['referencePortionKg'], 75)
        self.assertEqual(self.config['annualPlateCost'] * self.config['exampleReduction'], 60000)
        for retired in ['co2Factor', 'pilotReduction', 'schoolDaysPerYear']:
            self.assertNotIn(retired, self.config)

    def test_month_accounting(self):
        days = self.month['days']
        self.assertEqual(len(days), 20)
        sums = {k: sum(d[k] for d in days) for k in ['plateKg', 'unservedKg', 'prepKg']}
        self.assertAlmostEqual(sum(sums.values()), 1400)
        for k, expected in [('plateKg', 672), ('unservedKg', 602), ('prepKg', 126)]:
            self.assertAlmostEqual(sums[k], expected)
        self.assertAlmostEqual(sums['plateKg'] * self.config['pricePerKg'], 62160)
        self.assertAlmostEqual(sums['unservedKg'] / self.config['referencePortionKg'], 1505)
        for day in days:
            total = sum(day[k] for k in sums)
            self.assertGreaterEqual(total, 56)
            self.assertLessEqual(total, 84)
            for key, fraction in [('plateKg', .48), ('unservedKg', .43), ('prepKg', .09)]:
                self.assertAlmostEqual(day[key] / total, fraction)
            self.assertAlmostEqual(sum(d['plateKg'] for d in day['dishes']), day['plateKg'])
            self.assertAlmostEqual(sum(d['unservedKg'] for d in day['dishes']), day['unservedKg'])
            self.assertAlmostEqual(sum(day['components'].values()), day['plateKg'])
            mains = [d for d in day['dishes'] if d['type'] == 'main']
            self.assertEqual(sum(d['servings'] for d in mains), day['lunches'])
            for d in day['dishes']:
                for k in ['plateKg', 'servedKg', 'unservedKg']:
                    self.assertTrue(math.isfinite(d[k]))
                    self.assertGreaterEqual(d[k], 0)
                self.assertLessEqual(d['plateKg'], d['servedKg'])
                if d['type'] == 'main':
                    self.assertAlmostEqual(d['servings'] * d['servedPortionKg'], d['servedKg'])

    def test_ranking_and_rice_recommendation(self):
        mains = {}
        for day in self.month['days']:
            for d in day['dishes']:
                if d['type'] != 'main':
                    continue
                summary = mains.setdefault(d['id'], dict(plate=0, served=0, unserved=0, days=0))
                summary['plate'] += d['plateKg']
                summary['served'] += d['servedKg']
                summary['unserved'] += d['unservedKg']
                summary['days'] += 1
        ranking = sorted(mains, key=lambda k: mains[k]['plate'] / mains[k]['served'], reverse=True)
        self.assertEqual(ranking[:2], ['main-11', 'main-0'])
        self.assertAlmostEqual(mains['main-11']['plate'] / mains['main-11']['served'], .47)
        rice = mains['main-2']
        portions = rice['unserved'] / self.config['referencePortionKg'] / rice['days']
        self.assertAlmostEqual(portions, 38)
        self.assertAlmostEqual(portions * self.month['assumptions']['riceReductionFraction'], 35)


if __name__ == '__main__':
    unittest.main()
