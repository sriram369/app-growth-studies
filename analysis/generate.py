"""Deterministic, explicitly fictional Apple Ads portfolio data. Python stdlib only."""
import csv
import json
import math
import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'data'
DOWNLOADS = ROOT / 'public' / 'downloads'
SEED = 369
COLUMNS = ['date', 'appId', 'country', 'campaign', 'adGroup', 'keyword', 'searchTerm',
           'matchType', 'impressions', 'taps', 'spend', 'newDownloads', 'redownloads',
           'viewInstalls', 'maxCptBid']

APPS = [
    dict(id='lingoloop', name='LingoLoop', category='Education', initials='Ll', color='#0071e3',
         targetCpa=7, monthlyBudget=12000, owner='Maya Chen', goal='Acquire new language learners efficiently.',
         note='The client wants more new learners. Acquisition efficiency is the first checkpoint; subscription quality is not yet measured.',
         quality='Unknown', terms=['learn spanish', 'language lessons', 'spanish speaking app']),
    dict(id='stride', name='Stride', category='Health & Fitness', initials='St', color='#ab4b16',
         targetCpa=6, monthlyBudget=18000, owner='Jordan Lee', goal='Grow installs without sacrificing subscriber quality.',
         note='The client reports weak subscriber quality despite rising installs. Request cohort-level trial-to-paid conversion and retention before increasing spend.',
         quality='Concern raised', terms=['running coach', 'training plan', '5k training']),
    dict(id='ledger', name='Ledger', category='Finance', initials='Le', color='#315e4e',
         targetCpa=4, monthlyBudget=10000, owner='Alex Morgan', goal='Bring acquisition costs back within target.',
         note='Efficiency has deteriorated over the last month. Diagnose campaign mix before discussing a larger budget.',
         quality='Unknown', terms=['budget planner', 'expense tracker', 'money manager']),
    dict(id='mealwise', name='Mealwise', category='Food & Drink', initials='Mw', color='#93552a',
         targetCpa=9, monthlyBudget=16000, owner='Maya Chen', goal='Test additional demand within the existing budget.',
         note='The client is open to a measured expansion test, subject to efficiency and post-install checks.',
         quality='Unknown', terms=['meal planner', 'weekly recipes', 'healthy meal ideas']),
    dict(id='orbit', name='Orbit', category='Travel', initials='Or', color='#7256a4',
         targetCpa=4, monthlyBudget=14000, owner='Jordan Lee', goal='Reduce expensive acquisition in competitive searches.',
         note='Competitor traffic is expensive. Revisit relevance and bids before broadening market coverage.',
         quality='Unknown', terms=['trip planner', 'travel itinerary', 'travel organizer']),
    dict(id='muse', name='Muse', category='Music', initials='Mu', color='#a84461',
         targetCpa=7.5, monthlyBudget=11000, owner='Alex Morgan', goal='Find repeatable non-brand acquisition opportunities.',
         note='Brand traffic performs well. Discovery needs enough evidence before it can support a growth recommendation.',
         quality='Unknown', terms=['learn piano', 'music practice', 'piano lessons']),
    dict(id='focusflow', name='FocusFlow', category='Productivity', initials='Ff', color='#426b8d',
         targetCpa=8, monthlyBudget=15000, owner='Maya Chen', goal='Improve category reach with disciplined testing.',
         note='Performance is within target. Validate available demand and unit economics before proposing incremental spend.',
         quality='Unknown', terms=['focus timer', 'study planner', 'pomodoro timer']),
    dict(id='trail', name='Trail', category='Navigation', initials='Tr', color='#527146',
         targetCpa=8, monthlyBudget=9000, owner='Jordan Lee', goal='Establish a reliable baseline for a small account.',
         note='Limited scale means wide uncertainty. Collect evidence and confirm goals before changing bids aggressively.',
         quality='Unknown', terms=['hiking trails', 'offline trail map', 'walking routes']),
]


def generate():
    rng = random.Random(SEED)
    records = []
    start = date(2026, 6, 23)
    for day in range(90):
        d = start + timedelta(days=day)
        for ai, app in enumerate(APPS):
            for country in ['US', 'GB']:
                for ci, campaign in enumerate(['Brand', 'Category', 'Competitor', 'Discovery']):
                    for ki in range(3):
                        terms = app['terms']
                        if campaign == 'Brand':
                            keyword = [app['name'].lower(), app['name'].lower() + ' app', app['name'].lower() + ' download'][ki]
                            term = keyword
                            match = 'Exact'
                        elif campaign == 'Category':
                            keyword = terms[ki]
                            term = keyword
                            match = 'Exact'
                        elif campaign == 'Competitor':
                            keyword = ['altavista app', 'novalearn app', 'brightpath app'][ki]
                            term = keyword
                            match = 'Exact'
                        else:
                            keyword = [terms[0], terms[1], 'Search Match'][ki]
                            term = [terms[0] + ' for beginners', 'free ' + terms[1], terms[2] + ' offline'][ki]
                            match = 'Broad' if ki < 2 else 'Search Match'
                        if app['id'] == 'lingoloop' and campaign == 'Discovery' and ki == 1:
                            term = 'free spanish translation'
                        scale = 0.38 if country == 'GB' else 1
                        if app['id'] == 'trail':
                            scale *= 0.006
                        season = 1 + .12 * math.sin(day / 8) + (.08 if d.weekday() >= 5 else 0)
                        impressions = max(0, round(rng.uniform(290, 650) * scale * season))
                        if campaign == 'Discovery' and ki == 2:
                            impressions = rng.randint(0, 8)
                        ttr = [0.105, .052, .035, .045][ci] * rng.uniform(.8, 1.2)
                        taps = min(impressions, max(0, round(impressions * ttr)))
                        cpt = [.84, 1.45, 2.15, 1.25][ci] * rng.uniform(.86, 1.14)
                        cr = [.58, .27, .14, .22][ci]
                        if app['id'] == 'lingoloop' and campaign == 'Discovery' and ki == 1:
                            cr = .015
                        if app['id'] in ['ledger', 'orbit'] and day >= 60:
                            cpt *= 1.28
                            cr *= .8
                        if app['id'] in ['mealwise', 'focusflow'] and campaign == 'Category':
                            cr *= 1.3
                        installs = min(taps, sum(rng.random() < cr for _ in range(taps)))
                        redownloads = sum(rng.random() < .14 for _ in range(installs))
                        views = rng.randint(0, max(0, round(impressions * .0015)))
                        records.append([d.isoformat(), app['id'], country, campaign,
                                        'Search Match' if match == 'Search Match' else campaign + ' ' + match,
                                        keyword, term, match, impressions, taps, round(taps * cpt, 2),
                                        installs - redownloads, redownloads, views,
                                        round([1.4, 2.4, 3.4, 2.1][ci], 2)])
    return records


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    records = generate()
    dataset = dict(meta=dict(seed=SEED, synthetic=True, currency='USD',
                            start='2026-06-23', end='2026-09-20', asOf='2026-10-20',
                            rows=len(records), grain='One day, advertiser, country, and search-term/keyword pair.',
                            attribution='Synthetic attributed installs. Tap-through and view-through are disjoint by construction. All tap dates are at least 30 days old.'),
                   apps=APPS, columns=COLUMNS, records=records)
    (OUT / 'portfolio.json').write_text(json.dumps(dataset, separators=(',', ':')) + '\n')
    with (DOWNLOADS / 'synthetic-campaigns.csv').open('w', newline='') as f:
        writer = csv.writer(f, lineterminator='\n')
        writer.writerow(COLUMNS)
        writer.writerows(records)
    db = sqlite3.connect(':memory:')
    types = ['TEXT'] * 8 + ['INTEGER', 'INTEGER', 'REAL', 'INTEGER', 'INTEGER', 'INTEGER', 'REAL']
    db.execute('CREATE TABLE performance (' + ','.join(f'{c} {t}' for c, t in zip(COLUMNS, types)) + ')')
    db.executemany('INSERT INTO performance VALUES (' + ','.join('?' * len(COLUMNS)) + ')', records)
    db.row_factory = sqlite3.Row
    sql = (ROOT / 'analysis' / 'queries.sql').read_text()
    aggregates = [dict(r) for r in db.execute(sql)]
    (OUT / 'sql-summary.json').write_text(json.dumps(aggregates, indent=2) + '\n')
    with (DOWNLOADS / 'account-summary.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(aggregates[0]), lineterminator='\n')
        writer.writeheader()
        writer.writerows(aggregates)
    print(f'Generated {len(records):,} rows, {len(APPS)} advertisers, 90 days. Seed: {SEED}.')


if __name__ == '__main__':
    main()
