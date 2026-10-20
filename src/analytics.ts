import type { AppAccount, PerformanceRow, Recommendation, Totals } from './types';

export const ratio = (n: number, d: number): number | null => d > 0 ? n / d : null;
export function summarize(rows: PerformanceRow[]): Totals {
  const sum = rows.reduce((a, r) => ({
    impressions: a.impressions + r.impressions, taps: a.taps + r.taps,
    spend: a.spend + r.spend, newDownloads: a.newDownloads + r.newDownloads,
    redownloads: a.redownloads + r.redownloads, viewInstalls: a.viewInstalls + r.viewInstalls,
  }), { impressions: 0, taps: 0, spend: 0, newDownloads: 0, redownloads: 0, viewInstalls: 0 });
  const installs = sum.newDownloads + sum.redownloads;
  return { ...sum, installs, ttr: ratio(sum.taps, sum.impressions),
    cpt: ratio(sum.spend, sum.taps), cr: ratio(installs, sum.taps),
    cpa: ratio(sum.spend, installs), cpaTotal: ratio(sum.spend, installs + sum.viewInstalls) };
}

export function groupRows(rows: PerformanceRow[], field: 'campaign' | 'searchTerm' | 'date' | 'appId' | 'keyword' | 'adGroup') {
  const groups = new Map<string, PerformanceRow[]>();
  for (const row of rows) groups.set(row[field], [...(groups.get(row[field]) || []), row]);
  return [...groups.entries()].map(([name, records]) => ({ name, records, ...summarize(records) }));
}

export function recommend(t: Totals, target: number): Recommendation {
  // Deliberate, explainable portfolio heuristics. Not official Apple recommendations.
  if (t.taps >= 100 && t.installs < 20 && t.spend >= target * 20 && (t.cpa === null || t.cpa > target * 1.2)) return {
    label: 'Investigate', tone: 'amber',
    reason: 'At least 100 taps and spend equal to 20 target acquisitions produced fewer than 20 installs. Poor conversion warrants investigation even with a small install count.',
    action: 'Review query relevance and the product-page promise before spending more. Consider a negative keyword only when the search intent is demonstrably irrelevant.',
  };
  if (t.taps < 100 || t.installs < 20) return {
    label: 'Collect evidence', tone: 'neutral',
    reason: 'Fewer than 100 taps or 20 tap-through installs. The estimate is unstable.',
    action: 'Keep the test bounded. Review relevance and collect more mature observations before scaling.',
  };
  if (t.cpa !== null && t.cpa > target * 1.2) return {
    label: 'Investigate', tone: 'amber',
    reason: 'Tap-through CPA exceeds the account target by more than 20%.',
    action: 'Review search-term relevance and conversion first. Test a bid reduction or negative keyword only where the evidence supports it.',
  };
  if (t.cpa !== null && t.cpa < target * .85) return {
    label: 'Test expansion', tone: 'blue',
    reason: 'Tap-through CPA is at least 15% below target with sufficient observed volume.',
    action: 'Check demand, budget constraints, and post-install quality. Propose a capped test with a CPA stop condition.',
  };
  return { label: 'Maintain', tone: 'green', reason: 'Performance is near the account CPA target.',
    action: 'Maintain the current approach and monitor conversion, cost, and changes in traffic mix.' };
}

export function accountReview(app: AppAccount, current: Totals, previous: Totals) {
  const rec = recommend(current, app.targetCpa);
  const change = previous.cpa && current.cpa !== null ? current.cpa / previous.cpa - 1 : null;
  if (app.quality === 'Concern raised') return { ...rec, label: 'Quality review', tone: 'amber', priority: 100,
    reason: 'The client reports weak subscriber quality. Install efficiency alone cannot resolve this concern.',
    action: 'Hold expansion. Request matched cohort retention, trial-to-paid conversion, and payback evidence.' };
  const priority = rec.label === 'Investigate' ? 80 + Math.min(19, ((current.cpa ?? app.targetCpa * 3) / app.targetCpa - 1) * 10)
    : change !== null && change > .2 ? 70 : rec.label === 'Collect evidence' ? 50
    : rec.label === 'Test expansion' ? 40 : 30;
  return { ...rec, priority };
}

export function wilsonInterval(success: number, trials: number): [number, number] | null {
  if (trials <= 0) return null;
  const p = success / trials, z = 1.96, z2 = z * z;
  const mid = (p + z2 / (2 * trials)) / (1 + z2 / trials);
  const half = z * Math.sqrt(p * (1 - p) / trials + z2 / (4 * trials * trials)) / (1 + z2 / trials);
  return [Math.max(0, mid - half), Math.min(1, mid + half)];
}

export function scenario(rows: PerformanceRow[], transferPercent: number, costInflation: number) {
  const groups = groupRows(rows, 'campaign');
  const source = groups.find(g => g.name === 'Competitor');
  const destination = groups.find(g => g.name === 'Category');
  if (!source || !destination || !source.cpa || !destination.cpa || destination.installs < 20 || source.installs < 20) return null;
  const transfer = source.spend * Math.max(0, Math.min(30, transferPercent)) / 100;
  const inflation = Math.max(0, Math.min(50, costInflation)) / 100;
  const total = summarize(rows);
  // Only transferred dollars face the user-selected marginal acquisition cost.
  const removed = transfer / source.cpa;
  const added = transfer / (destination.cpa * (1 + inflation));
  const projected = total.installs - removed + added;
  return { transfer, sourceSpend: source.spend - transfer, destinationSpend: destination.spend + transfer,
    projected, delta: added - removed, cpa: ratio(total.spend, projected), spend: total.spend,
    source: source.name, destination: destination.name };
}

export function csvText(headers: string[], rows: (string | number | null)[][]) {
  const escape = (value: string | number | null) => {
    let s = value === null ? '' : String(value);
    // Prevent spreadsheet formulas if text values come from an imported dataset later.
    if (typeof value === 'string' && /^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
}
