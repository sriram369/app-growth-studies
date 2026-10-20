export type AppAccount = {
  id: string; name: string; category: string; initials: string; color: string;
  targetCpa: number; monthlyBudget: number; owner: string; goal: string;
  note: string; quality: string; terms: string[];
};

export type PerformanceRow = {
  date: string; appId: string; country: string; campaign: string; adGroup: string;
  keyword: string; searchTerm: string; matchType: string; impressions: number;
  taps: number; spend: number; newDownloads: number; redownloads: number;
  viewInstalls: number; maxCptBid: number;
};

export type Totals = {
  impressions: number; taps: number; spend: number; newDownloads: number;
  redownloads: number; viewInstalls: number; installs: number;
  ttr: number | null; cpt: number | null; cr: number | null;
  cpa: number | null; cpaTotal: number | null;
};

export type Recommendation = {
  label: 'Investigate' | 'Test expansion' | 'Collect evidence' | 'Maintain';
  tone: 'amber' | 'blue' | 'neutral' | 'green'; reason: string; action: string;
};
