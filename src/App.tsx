import { useEffect, useState } from 'react';
import { ArrowRightIcon, ArrowUpRightIcon, ChartBarIcon, CodeIcon, DownloadSimpleIcon, SquaresFourIcon } from '@phosphor-icons/react';
import type { AppAccount, PerformanceRow } from './types';
import { groupRows, summarize } from './analytics';
import { AppIcon, asset, Download, External, money, number, Trend } from './shared';
import { Campaigns } from './Campaigns';
import { Clients, ClientReview } from './Clients';
import { Methodology } from './Methodology';

type Dataset = { meta: { rows: number }; apps: AppAccount[]; columns: string[]; records: (string | number)[][] };

export default function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || '/');
  const [data, setData] = useState<{ apps: AppAccount[]; rows: PerformanceRow[] } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const change = () => { setRoute(location.hash.slice(1) || '/'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(asset('data/portfolio.json'), { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('Data unavailable'); return r.json() as Promise<Dataset>; })
      .then(d => setData({ apps: d.apps, rows: d.records.map(row => Object.fromEntries(d.columns.map((c, i) => [c, row[i]])) as PerformanceRow) }))
      .catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    document.title = `${route.startsWith('/campaigns') ? 'Campaign Performance' : route.startsWith('/clients') || route.startsWith('/review') ? 'Advertiser Growth' : route === '/methodology' ? 'Methodology' : 'App Growth Studies'} — Sriram Naidu Thota`;
  }, [route]);
  const active = route.startsWith('/review') ? '/clients' : route;
  return <>
    <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    <nav className="navigation" aria-label="Main navigation"><div className="nav-inner">
      <a href="#/" className="brand"><span className="brand-mark"><ChartBarIcon size={18} weight="bold" /></span>App Growth<span className="brand-studies"> Studies</span></a>
      <div className="nav-links">{[['/', 'Overview'], ['/campaigns', 'Campaigns'], ['/clients', 'Clients'], ['/methodology', 'Methodology']].map(([path, label]) => <a key={path} href={`#${path}`} aria-current={active === path ? 'page' : undefined}>{label}</a>)}</div>
      <a aria-label="View source on GitHub" className="nav-source" href="https://github.com/sriram369/app-growth-studies" target="_blank" rel="noreferrer"><CodeIcon size={17} /><span>Source</span><ArrowUpRightIcon size={12} /></a>
    </div></nav>
    <main id="main-content" tabIndex={-1}>
      {error ? <div className="state-page"><h1>The dataset couldn’t load.</h1><p>Check your connection and try again.</p><button className="button primary" onClick={() => setRetry(r => r + 1)}>Try again</button></div>
        : !data ? <div className="skeleton-page" aria-busy="true" aria-label="Loading case studies"><div /><div /><div /></div>
        : route === '/' ? <Overview {...data} />
        : route === '/campaigns' ? <Campaigns {...data} />
        : route === '/clients' ? <Clients {...data} />
        : route.startsWith('/review/') ? <ClientReview {...data} id={route.split('/')[2]} />
        : route === '/methodology' ? <Methodology />
        : <div className="state-page"><h1>Page not found.</h1><a className="button primary" href="#/">Back to studies</a></div>}
    </main>
    <footer className="footer"><div><strong>Sriram Naidu Thota</strong><span>Independent portfolio · Synthetic data · USD</span></div><div><a href="https://www.linkedin.com/in/sriramthota" target="_blank" rel="noreferrer">LinkedIn <ArrowUpRightIcon size={12} /></a><a href="mailto:sriramthota@outlook.com">Contact <ArrowUpRightIcon size={12} /></a></div><p>Apple Ads concepts, independently explored. Not affiliated with or endorsed by Apple.</p></footer>
  </>;
}

function Overview({ apps, rows }: { apps: AppAccount[]; rows: PerformanceRow[] }) {
  const focus = rows.filter(r => r.appId === 'lingoloop' && r.date >= '2026-08-22');
  const total = summarize(focus);
  const daily = groupRows(focus, 'date');
  return <div className="overview">
    <section className="hero shell">
      <div className="hero-copy"><span className="eyebrow">A portfolio by Sriram Naidu Thota</span><h1>Good growth.<br /><span>Clear evidence.</span></h1><p>Two Apple Ads studies exploring better campaigns and stronger client conversations.</p><a className="button primary" href="#/campaigns">Explore the analysis <ArrowRightIcon size={17} /></a><a className="text-link" href="#/methodology">See how it’s built <ArrowUpRightIcon size={13} /></a></div>
      <div className="hero-product"><div className="mini-toolbar"><div className="window-dots"><i /><i /><i /></div><span>Campaign Performance Lab</span><span className="mini-live">Synthetic demo</span></div><div className="hero-product-content"><div className="preview-account"><AppIcon app={apps[0]} /><div><strong>LingoLoop</strong><small>Search results · Last 30 days</small></div><span className="preview-menu">•••</span></div><div className="preview-metrics"><div><span>Tap-through installs</span><strong>{number(total.installs)}</strong></div><div><span>Average CPA</span><strong>{money(total.cpa)}</strong></div></div><Trend data={daily} field="installs" label="Tap-through installs" /><div className="preview-insight"><span className="insight-symbol"><ChartBarIcon size={20} /></span><div><strong>Find the next useful question.</strong><p>Explore the search terms behind every result.</p></div><ArrowUpRightIcon size={19} /></div></div></div>
    </section>
    <div className="proof-strip shell"><div><strong>02</strong><span>Distinct case studies</span></div><div><strong>{number(rows.length)}</strong><span>Reproducible records</span></div><div><strong>08</strong><span>Fictional advertisers</span></div><div><strong>90 days</strong><span>Of campaign observations</span></div></div>
    <section className="studies shell" aria-labelledby="studies-title"><div className="section-intro"><h2 id="studies-title">From performance<br />to perspective.</h2><p>Follow the numbers. Explain the decision. Make the next step clear.</p></div><div className="study-grid">
      <article className="study-tile campaign-tile"><div className="study-top"><span className="case-number">01 / Campaign optimization</span><ChartBarIcon size={24} /></div><h3>Campaign<br />Performance Lab.</h3><p>Investigate search terms, evaluate acquisition costs, and model a disciplined budget test.</p><div className="tile-bars" aria-label="Illustrative campaign themes">{[['Brand', 40], ['Category', 88], ['Competitor', 66], ['Discovery', 51]].map(([name, width]) => <div key={name}><span>{name}</span><i style={{ width: `${width}%` }} /></div>)}</div><a href="#/campaigns" className="tile-link">Open campaign study <span><ArrowRightIcon size={18} /></span></a></article>
      <article className="study-tile clients-tile"><div className="study-top"><span className="case-number">02 / Client growth</span><SquaresFourIcon size={24} /></div><h3>Advertiser Growth<br />& Client Review.</h3><p>Prioritize accounts, connect performance to client goals, and build a clear 30-day action plan.</p><div className="tile-accounts">{[apps[1], apps[2], apps[3]].map((a, i) => <div key={a.id}><AppIcon app={a} /><span><strong>{a.name}</strong><small>{a.category}</small></span><span className={`small-tag ${i === 2 ? 'blue' : 'amber'}`}>{['Quality review', 'Investigate', 'Growth test'][i]}</span></div>)}</div><a href="#/clients" className="tile-link">Open client study <span><ArrowRightIcon size={18} /></span></a></article>
    </div></section>
    <section className="analysis-section shell"><div><span className="eyebrow">The work behind the interface</span><h2>Built to be<br />looked into.</h2><p>Inspect the source data, trace the calculations, and open the analysis in Excel. Every recommendation has a reason.</p><External href="https://github.com/sriram369/app-growth-studies">Explore the repository</External></div><div className="resource-list"><a href={asset('downloads/campaign-analysis.xlsx')} download><span><DownloadSimpleIcon size={22} /><span><strong>Campaign analysis</strong><small>Excel workbook · formulas and source data</small></span></span><ArrowUpRightIcon size={18} /></a><a href={asset('downloads/client-growth.xlsx')} download><span><DownloadSimpleIcon size={22} /><span><strong>Advertiser account review</strong><small>Excel workbook · account trends and targets</small></span></span><ArrowUpRightIcon size={18} /></a><a href={asset('downloads/synthetic-campaigns.csv')} download><span><DownloadSimpleIcon size={22} /><span><strong>The complete dataset</strong><small>CSV · 17,280 synthetic observations</small></span></span><ArrowUpRightIcon size={18} /></a></div></section>
    <div className="provenance shell"><span className="provenance-dot" /><p>All advertisers, budgets, and outcomes are fictional. Metric definitions reference Apple Ads documentation. Findings demonstrate analytical methods.</p><a href="#/methodology">Methodology <ArrowRightIcon size={14} /></a></div>
  </div>;
}
