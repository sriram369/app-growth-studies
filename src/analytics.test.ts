import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { accountReview, csvText, groupRows, ratio, recommend, scenario, summarize, wilsonInterval } from './analytics';
import type { AppAccount, PerformanceRow } from './types';

function row(overrides: Partial<PerformanceRow> = {}): PerformanceRow {
  return { date: '2026-09-20', appId: 'demo', country: 'US', campaign: 'Category',
    adGroup: 'Category Exact', keyword: 'learn spanish', searchTerm: 'learn spanish',
    matchType: 'Exact', impressions: 1000, taps: 100, spend: 100,
    newDownloads: 25, redownloads: 5, viewInstalls: 10, maxCptBid: 2, ...overrides };
}

describe('count-based reporting', () => {
  it('reconciles every account with the independently generated SQL result', () => {
    const d = JSON.parse(readFileSync(new URL('../public/data/portfolio.json', import.meta.url), 'utf8'));
    const sql = JSON.parse(readFileSync(new URL('../public/data/sql-summary.json', import.meta.url), 'utf8'));
    const records: PerformanceRow[] = d.records.map((r: (string | number)[]) => Object.fromEntries(d.columns.map((c: string, i: number) => [c, r[i]])));
    for (const account of sql) {
      const t = summarize(records.filter(r => r.appId === account.appId && r.date >= '2026-08-22'));
      expect(t.spend).toBeCloseTo(account.spend, 2);
      expect(t.installs).toBe(account.tap_installs);
      expect(t.ttr).toBeCloseTo(account.ttr, 8);
      if (account.avg_cpa_tap === null) expect(t.cpa).toBeNull();
      else expect(t.cpa).toBeCloseTo(account.avg_cpa_tap, 8);
    }
  });
  it('calculates weighted rates from counts rather than averaging row rates', () => {
    const t = summarize([row(), row({ impressions: 100, taps: 20, newDownloads: 8, redownloads: 2, spend: 40 })]);
    expect(t.ttr).toBeCloseTo(120 / 1100);
    expect(t.cr).toBeCloseTo(40 / 120);
    expect(t.cpa).toBeCloseTo(140 / 40);
    expect(t.cpaTotal).toBeCloseTo(140 / 60);
  });
  it('keeps undefined denominators unavailable', () => {
    expect(ratio(10, 0)).toBeNull();
    const t = summarize([]);
    expect(t.spend).toBe(0); expect(t.cr).toBeNull(); expect(t.cpa).toBeNull();
  });
  it('reconciles groups to the whole without counting view installs as taps', () => {
    const rows = [row(), row({ campaign: 'Brand' })];
    expect(groupRows(rows, 'campaign').reduce((n, g) => n + g.installs, 0)).toBe(summarize(rows).installs);
    expect(summarize(rows).installs).toBe(60);
  });
});
describe('recommendation guardrails', () => {
  it('does not scale a tiny apparently efficient sample', () => {
    expect(recommend(summarize([row({ taps: 4, newDownloads: 3, redownloads: 0, spend: .1 })]), 8).label).toBe('Collect evidence');
  });
  it('flags substantial spend with few or zero installs for investigation', () => {
    expect(recommend(summarize([row({ taps: 240, spend: 300, newDownloads: 4, redownloads: 0 })]), 7).label).toBe('Investigate');
    expect(recommend(summarize([row({ taps: 240, spend: 300, newDownloads: 0, redownloads: 0 })]), 7).label).toBe('Investigate');
  });
  it('preserves exact threshold boundaries', () => {
    const t = summarize([row({ taps: 100, newDownloads: 20, redownloads: 0, spend: 240 })]);
    expect(recommend(t, 10).label).toBe('Maintain');
    expect(recommend({ ...t, cpa: 12.01 }, 10).label).toBe('Investigate');
    expect(recommend({ ...t, cpa: 8.49 }, 10).label).toBe('Test expansion');
    expect(recommend({ ...t, cpa: 8.5 }, 10).label).toBe('Maintain');
  });
  it('prioritizes a client quality concern even with low installation CPA', () => {
    const app = { quality: 'Concern raised', targetCpa: 10 } as AppAccount;
    const t = summarize([row()]);
    expect(accountReview(app, t, t).label).toBe('Quality review');
    expect(accountReview(app, t, t).priority).toBe(100);
  });
});
describe('budget sensitivity', () => {
  const rows = [row({ campaign: 'Competitor', spend: 600, newDownloads: 20, redownloads: 0 }), row({ campaign: 'Category', spend: 300, newDownloads: 60, redownloads: 0 })];
  it('conserves spend and uses marginal cost only for transferred dollars', () => {
    const result = scenario(rows, 20, 50)!;
    expect(result.transfer).toBe(120);
    expect(result.sourceSpend + result.destinationSpend).toBe(900);
    expect(result.spend).toBe(900);
    expect(result.delta).toBeCloseTo(120 / 7.5 - 120 / 30);
  });
  it('returns the historical baseline for no transfer', () => {
    expect(scenario(rows, 0, 50)!.projected).toBe(summarize(rows).installs);
  });
  it('clamps the controls and declines insufficient evidence', () => {
    expect(scenario(rows, 100, 100)!.transfer).toBe(180);
    expect(scenario([row()], 20, 20)).toBeNull();
    expect(scenario([rows[0], row({ campaign: 'Category', newDownloads: 2, redownloads: 0 })], 20, 20)).toBeNull();
  });
});
describe('export and uncertainty', () => {
  it('quotes CSV text and neutralizes formula-like text', () => {
    expect(csvText(['Term'], [['a,"b"'], ['=SUM(A1)']])).toContain('"a,""b"""');
    expect(csvText(['Term'], [['=SUM(A1)']])).toContain("'=SUM(A1)");
  });
  it('widens conversion uncertainty for small samples', () => {
    const small = wilsonInterval(5, 10)!, large = wilsonInterval(500, 1000)!;
    expect(small[1] - small[0]).toBeGreaterThan(large[1] - large[0]);
    expect(wilsonInterval(0, 0)).toBeNull();
  });
});
