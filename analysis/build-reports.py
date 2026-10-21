"""Generate an optimization brief and a five-page client review from the synthetic source."""
import json
from pathlib import Path
from collections import defaultdict
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import simpleSplit

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'public/data/portfolio.json').read_text())
ROWS = [dict(zip(DATA['columns'], r)) for r in DATA['records']]
OUT = ROOT / 'public/downloads'
INK, GRAY, BLUE, LINE, SILVER = [HexColor(c) for c in ['#1D1D1F', '#65656B', '#0071E3', '#D2D2D7', '#F5F5F7']]


def total(rows):
    a = {k: sum(r[k] for r in rows) for k in ['spend', 'taps', 'impressions', 'newDownloads', 'redownloads']}
    a['installs'] = a['newDownloads'] + a['redownloads']
    a['cpa'] = a['spend'] / a['installs'] if a['installs'] else None
    return a


def text(c, s, x, y, width, size=11, leading=None, color=GRAY, bold=False):
    c.setFillColor(color); font = 'Helvetica-Bold' if bold else 'Helvetica'
    c.setFont(font, size); leading = leading or size * 1.45
    for line in simpleSplit(s, font, size, width):
        c.drawString(x, y, line); y -= leading
    return y


def line(c, x, y, width):
    c.setStrokeColor(LINE); c.setLineWidth(.5); c.line(x, y, x + width, y)


def footer(c, width, page):
    line(c, 42, 37, width - 84)
    text(c, 'Sriram Naidu Thota  |  Independent portfolio  |  Synthetic data  |  USD', 42, 24, width - 130, 8)
    c.setFont('Helvetica', 8); c.drawRightString(width - 42, 24, str(page))


def headline(c, label, title, width, size=31):
    text(c, label, 42, 497, width - 84, 10, color=BLUE, bold=True)
    return text(c, title, 42, 458, width - 84, size, leading=size*1.15, color=INK, bold=True)


def metrics(c, values, y, width):
    col = (width - 84) / len(values)
    for i, (label, value) in enumerate(values):
        x = 42 + col * i
        text(c, label, x, y, col - 15, 9)
        text(c, value, x, y - 30, col - 15, 26, color=INK, bold=True)


def build_client():
    w, h = 960, 540
    c = canvas.Canvas(str(OUT / 'stride-client-review.pdf'), pagesize=(w, h))
    c.setTitle('Stride - Advertiser Growth and Client Review')
    c.setAuthor('Sriram Naidu Thota')
    app = next(a for a in DATA['apps'] if a['id'] == 'stride')
    current_rows = [r for r in ROWS if r['appId'] == 'stride' and r['date'] >= '2026-08-22']
    previous_rows = [r for r in ROWS if r['appId'] == 'stride' and '2026-07-23' <= r['date'] <= '2026-08-21']
    current, previous = total(current_rows), total(previous_rows)
    headline(c, '01 / THE OBJECTIVE', 'A useful next step for Stride.', w, 38)
    text(c, app['goal'], 42, 379, 490, 22, color=INK)
    text(c, 'RECOMMENDATION: QUALITY REVIEW', 42, 284, 440, 11, color=BLUE, bold=True)
    text(c, app['note'], 42, 253, 500, 14)
    c.setFillColor(SILVER); c.roundRect(610, 153, 300, 225, 18, fill=1, stroke=0)
    text(c, 'Client context', 635, 343, 245, 12, color=INK, bold=True)
    text(c, 'Category: Health & Fitness', 635, 307, 245, 12)
    text(c, 'Account owner: Jordan Lee (fictional)', 635, 277, 245, 12)
    text(c, 'Review: Aug 22 - Sep 20, 2026', 635, 231, 245, 12)
    text(c, 'Data as of October 20, 2026', 635, 201, 245, 12)
    footer(c, w, 1); c.showPage()
    headline(c, '02 / PERFORMANCE', 'Start with the shared facts.', w)
    metrics(c, [('Advertiser spend', f"${current['spend']:,.0f}"), ('Tap-through installs', f"{current['installs']:,}"), ('Average CPA, tap-through', f"${current['cpa']:.2f}"), ('Client CPA target', f"${app['targetCpa']:.2f}")], 370, w)
    line(c, 42, 292, w-84)
    text(c, f"Prior-period CPA: ${previous['cpa']:.2f}. Change: {(current['cpa']/previous['cpa']-1)*100:+.1f}%.", 42, 258, 800, 16, color=INK)
    text(c, f"Current installs include {current['newDownloads']:,} new downloads and {current['redownloads']:,} redownloads.", 42, 214, 800, 14)
    text(c, 'The installation CPA is below the fictional target. The client reports weak subscriber quality, which these metrics do not resolve.', 42, 164, 760, 17, color=INK)
    text(c, 'Current: Aug 22 - Sep 20. Prior: Jul 23 - Aug 21. Both periods are 30 days. Attributed installs do not establish incremental lift.', 42, 84, 840, 9)
    footer(c, w, 2); c.showPage()
    headline(c, '03 / THE DIAGNOSIS', 'Install volume leaves a question open.', w)
    text(c, 'What we observe', 42, 375, 400, 14, color=INK, bold=True)
    text(c, 'Efficient installation costs coexist with a reported subscriber-quality concern. Do not infer retention, revenue, or payback from install reporting.', 42, 346, 395, 13)
    text(c, 'What we recommend', 42, 254, 400, 14, color=INK, bold=True)
    text(c, 'Hold expansion. Request matched cohort retention, trial-to-paid conversion, and payback evidence. Reconcile definitions with measurement partners.', 42, 225, 395, 13)
    groups = defaultdict(list)
    for r in current_rows: groups[r['campaign']].append(r)
    values = [(name, total(rs)['cpa']) for name, rs in groups.items()]
    text(c, 'Campaign CPA, tap-through', 510, 375, 400, 14, color=INK, bold=True)
    maximum = max(v for _, v in values)
    for i, (name, value) in enumerate(values):
        y = 335 - i * 49
        text(c, name, 510, y, 200, 11)
        text(c, f'${value:.2f}', 827, y, 70, 11, color=INK, bold=True)
        c.setFillColor(SILVER); c.roundRect(510, y-15, 385, 6, 3, fill=1, stroke=0)
        c.setFillColor(BLUE); c.roundRect(510, y-15, 385*value/maximum, 6, 3, fill=1, stroke=0)
    text(c, 'Different campaign themes serve different purposes. These comparisons identify questions; they do not prove a causal effect.', 510, 106, 380, 10)
    footer(c, w, 3); c.showPage()
    headline(c, '04 / THE ACTION PLAN', 'Thirty days. Four checkpoints.', w)
    steps = [
        ('Week 1', 'Validate', 'Confirm goals, reporting definitions, and the subscriber-quality concern.', 'Account team + client'),
        ('Week 2', 'Resolve quality', 'Reconcile matched retention and trial-to-paid cohorts before proposing expansion.', 'Client partner + measurement'),
        ('Week 3', 'Monitor', 'Review mature CPA, conversion, new-download mix, and available quality evidence.', 'Platform specialist'),
        ('Week 4', 'Decide', 'Agree whether to extend, revise, or stop. Document the decision and evidence.', 'Client + account team'),
    ]
    for i, (week, title, detail, owner) in enumerate(steps):
        x = 42 + i*224
        c.setStrokeColor(BLUE); c.setLineWidth(2); c.line(x, 375, x+196, 375)
        text(c, week, x, 347, 196, 11, color=BLUE)
        text(c, title, x, 311, 196, 20, color=INK, bold=True)
        text(c, detail, x, 270, 190, 13)
        text(c, owner, x, 128, 190, 10)
    text(c, 'The cadence is 30 days. Final evaluation must allow attribution and post-install cohorts to mature beyond this cadence when needed.', 42, 75, 850, 9)
    footer(c, w, 4); c.showPage()
    headline(c, '05 / THE CONVERSATION', 'Make the next meeting count.', w)
    questions = ['What defines a valuable new user, and what acquisition cost supports that outcome?', 'Can we reconcile new downloads, retention, trial-to-paid conversion, and payback using comparable cohorts?', 'What evidence would justify additional budget, and what would make us stop?']
    y = 365
    for i, question in enumerate(questions):
        text(c, f'0{i+1}', 42, y, 40, 13, color=BLUE)
        bottom = text(c, question, 91, y, 780, 19, leading=26, color=INK)
        line(c, 91, bottom-10, 790); y = bottom-42
    text(c, 'Definitions: Apple Ads glossary and reporting documentation. All performance and client context in this review are synthetic.', 42, 80, 850, 9)
    c.linkURL('https://ads.apple.com/app-store/help-glossary', (42,60,400,95), relative=0)
    footer(c, w, 5); c.save()


def build_brief():
    w,h = 612,792
    c = canvas.Canvas(str(OUT / 'campaign-optimization-brief.pdf'), pagesize=(w,h))
    c.setTitle('LingoLoop - Campaign Optimization Brief'); c.setAuthor('Sriram Naidu Thota')
    text(c, 'CAMPAIGN PERFORMANCE LAB', 42, 746, 500, 10, color=BLUE, bold=True)
    text(c, 'LingoLoop: optimization brief', 42, 711, 530, 26, color=INK, bold=True)
    text(c, 'Synthetic case study. Aug 22 - Sep 20, 2026. All amounts USD.', 42, 680, 520, 10)
    rows = [r for r in ROWS if r['appId'] == 'lingoloop' and r['date'] >= '2026-08-22']
    t=total(rows)
    text(c, f"${t['spend']:,.0f} spend   |   {t['installs']:,} tap-through installs   |   ${t['cpa']:.2f} CPA", 42, 640, 530, 14, color=INK, bold=True)
    line(c,42,620,528)
    text(c, 'The account average hides inefficient search traffic.', 42, 590, 528, 16, color=INK, bold=True)
    text(c, 'The overall CPA is below the fictional $7.00 target, but campaign and search-term detail reveal very different costs. Investigate relevance before recommending more budget.', 42, 563, 520, 11)
    grouped=defaultdict(list)
    for r in rows: grouped[r['campaign']].append(r)
    y=487
    for x,label in [(42,'Campaign'),(230,'Spend'),(360,'Tap installs'),(484,'Tap CPA')]: text(c,label,x,y,100,10,color=GRAY,bold=True)
    line(c,42,y-12,528)
    for name,rs in grouped.items():
        a=total(rs); y-=32
        for x,label in [(42,name),(230,f"${a['spend']:,.0f}"),(360,f"{a['installs']:,}"),(484,f"${a['cpa']:.2f}")]: text(c,label,x,y,100,11,color=INK)
    terms = [r for r in rows if r['searchTerm']=='free spanish translation']; a=total(terms)
    text(c, '1. Investigate an irrelevant discovery term',42,319,528,13,color=INK,bold=True)
    text(c,f"'free spanish translation' spent ${a['spend']:,.0f} across {a['taps']:,} taps and produced {a['installs']} installs. Review search intent and consider a negative keyword if the app cannot satisfy it.",42,296,520,11)
    text(c, '2. Propose a bounded allocation test',42,235,528,13,color=INK,bold=True)
    text(c,'Explore a 15% Competitor-to-Category spend transfer with a 20% marginal Category CPA increase. Keep total spend constant. Demand, auction response, and user quality remain unmodeled.',42,212,520,11)
    text(c, '3. Define the evaluation before the change',42,151,528,13,color=INK,bold=True)
    text(c,'Use mature tap-through CPA, conversion, and new-download mix. Validate post-install quality and agree a budget cap and stop condition. Modeled results are not measured lift.',42,128,520,11)
    text(c,'Definitions: ads.apple.com/app-store/help-glossary. Reproduce: github.com/sriram369/app-growth-studies',42,67,528,8)
    footer(c,w,1); c.save()


if __name__ == '__main__':
    build_client(); build_brief(); print('Generated 5-page Stride client review and 1-page campaign brief.')
