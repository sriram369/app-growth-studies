"""Check the actual downloadable files with only Python's standard library."""
import json
import re
import unittest
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = ROOT / 'public/downloads'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def cached_cell(book, cell, sheet=1):
    with zipfile.ZipFile(DOWNLOADS / book) as z:
        root = ET.fromstring(z.read(f'xl/worksheets/sheet{sheet}.xml'))
        element = root.find(f'.//m:c[@r="{cell}"]/m:v', NS)
        return float(element.text)


class DownloadedArtifactTests(unittest.TestCase):
    def test_no_cached_excel_formula_errors(self):
        for book in ['campaign-analysis.xlsx', 'client-growth.xlsx']:
            with zipfile.ZipFile(DOWNLOADS / book) as z:
                self.assertIsNone(z.testzip())
                formulas = 0
                for name in z.namelist():
                    if re.match(r'xl/worksheets/sheet\d+\.xml$', name):
                        root = ET.fromstring(z.read(name))
                        self.assertEqual(root.findall('.//m:c[@t="e"]', NS), [], book)
                        formulas += len(root.findall('.//m:f', NS))
                self.assertGreater(formulas, 50)

    def test_campaign_export_matches_source(self):
        summaries = json.loads((ROOT / 'public/data/sql-summary.json').read_text())
        expected = next(a for a in summaries if a['appId'] == 'lingoloop')
        self.assertAlmostEqual(cached_cell('campaign-analysis.xlsx', 'B14'), expected['spend'], places=2)
        self.assertEqual(cached_cell('campaign-analysis.xlsx', 'G14'), expected['tap_installs'])

    def test_account_exports_match_source(self):
        data = json.loads((ROOT / 'public/data/portfolio.json').read_text())
        summaries = json.loads((ROOT / 'public/data/sql-summary.json').read_text())
        for i, app in enumerate(data['apps']):
            expected = next(a for a in summaries if a['appId'] == app['id'])
            self.assertAlmostEqual(cached_cell('client-growth.xlsx', f'C{i+10}'), expected['spend'], places=2)
            self.assertEqual(cached_cell('client-growth.xlsx', f'E{i+10}'), expected['tap_installs'])

    def test_budget_export_preserves_spend(self):
        book = 'campaign-analysis.xlsx'
        source = sum(cached_cell(book, f'B{r}', sheet=2) for r in range(11,15))
        self.assertAlmostEqual(cached_cell(book, 'B22', sheet=2), source, places=2)

    def test_pdf_page_counts(self):
        for name, count in [('campaign-optimization-brief.pdf', 1), ('stride-client-review.pdf', 5)]:
            contents = (DOWNLOADS / name).read_bytes()
            self.assertTrue(contents.startswith(b'%PDF-'))
            self.assertEqual(len(re.findall(rb'/Type\s*/Page\b', contents)), count)


if __name__ == '__main__':
    unittest.main()
