import json
import unittest
from generate import generate, COLUMNS, ROOT


class DataIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = generate()
        cls.dicts = [dict(zip(COLUMNS, row)) for row in cls.rows]

    def test_reproducible_and_complete(self):
        self.assertEqual(len(self.rows), 8 * 90 * 2 * 4 * 3)
        self.assertEqual(self.rows, generate())

    def test_unique_grain(self):
        keys = {(r['date'], r['appId'], r['country'], r['campaign'], r['keyword'], r['searchTerm']) for r in self.dicts}
        self.assertEqual(len(keys), len(self.rows))

    def test_funnel_and_bid_limits(self):
        for r in self.dicts:
            installs = r['newDownloads'] + r['redownloads']
            self.assertTrue(0 <= installs <= r['taps'] <= r['impressions'])
            self.assertGreaterEqual(r['spend'], 0)
            self.assertLessEqual(r['spend'], r['taps'] * r['maxCptBid'] + .01)

    def test_sql_reconciles(self):
        summaries = json.loads((ROOT / 'public/data/sql-summary.json').read_text())
        for summary in summaries:
            rows = [r for r in self.dicts if r['appId'] == summary['appId'] and r['date'] >= '2026-08-22']
            self.assertAlmostEqual(summary['spend'], sum(r['spend'] for r in rows), places=2)
            self.assertEqual(summary['tap_installs'], sum(r['newDownloads'] + r['redownloads'] for r in rows))


if __name__ == '__main__':
    unittest.main()
