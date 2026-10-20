// Run with the Codex bundled Node runtime. ARTIFACT_NODE_MODULES selects its package root.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Workbook, SpreadsheetFile } = await import(require.resolve('@oai/artifact-tool', { paths: [process.env.ARTIFACT_NODE_MODULES || process.cwd()] }));
const root = path.resolve(process.argv[2] || '.');
const data = JSON.parse(await fs.readFile(path.join(root, 'public/data/portfolio.json'), 'utf8'));
const records = data.records.map(row => Object.fromEntries(data.columns.map((col, i) => [col, row[i]])));
const out = path.join(root, 'public/downloads');
const previews = path.join(root, 'tmp/workbook-previews');
await fs.mkdir(previews, { recursive: true });
const blue = '#0071E3', gray = '#65656B', ink = '#1D1D1F';
const date = s => new Date(`${s}T12:00:00Z`);
const currency = '"$"#,##0.00;("$"#,##0.00);"$"0.00';
function base(sheet, last = 'L45') {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${last}`).format.font = { name: 'Arial', size: 10, color: ink };
  sheet.getRange(`A1:${last}`).format.rowHeight = 22;
  sheet.getRange(`A1:${last}`).format.verticalAlignment = 'center';
  sheet.getRange('A:A').format.columnWidth = 34;
  sheet.getRange('B:L').format.columnWidth = 16;
}
function title(sheet, text, subtitle) {
  sheet.getRange('A2').values = [[text]];
  sheet.getRange('A2').format.font = { name: 'Arial', size: 16, bold: true, color: ink };
  sheet.getRange('A2').format.rowHeight = 30;
  sheet.getRange('A3').values = [[subtitle]];
  sheet.getRange('A3').format.font = { name: 'Arial', size: 10, color: gray };
}
function header(sheet, address, values) {
  const range = sheet.getRange(address); range.values = [values];
  range.format.fill = '#1D1D1F'; range.format.font = { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' };
  range.format.rowHeight = 30; range.format.horizontalAlignment = 'center';
}
function notes(sheet, first, lines) {
  lines.forEach((text, i) => { sheet.getRange(`A${first + i}`).values = [[text]]; sheet.getRange(`A${first + i}`).format.font = { name: 'Arial', size: 9, color: gray }; });
}
function rawSheet(wb, name, rows, columns, source) {
  const s = wb.worksheets.add(name); base(s, `O${rows.length + 5}`);
  s.getRange('A1').values = [[source]];
  s.getRange('A2').values = [['Source: synthetic Python generator, seed 369. Definitions: https://ads.apple.com/app-store/help-glossary']];
  s.getRange('A3').values = [['As of 2026-10-20. All amounts USD. No live campaign or personal user data.']];
  const last = String.fromCharCode(64 + columns.length);
  header(s, `A5:${last}5`, columns);
  s.getRange(`A6:${last}${rows.length + 5}`).values = rows;
  s.getRange(`A6:A${rows.length + 5}`).setNumberFormat('mmm d, yyyy');
  s.getRange(`A6:A${rows.length + 5}`).format.horizontalAlignment = 'left';
  s.freezePanes.freezeRows(5);
  s.tables.add(`A5:${last}${rows.length + 5}`, true, `${name.replaceAll(' ', '')}Table`);
  s.getRange(`A6:${last}${rows.length + 5}`).format.rowHeight = 20;
  return s;
}
function safe(numerator, denominator) { return `IF(${denominator}=0,"n.a.",${numerator}/${denominator})`; }
async function finish(wb, file, renders, verify) {
  wb.recalculate();
  await verify();
  const errors = await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 20 }, maxChars: 2000 });
  console.log(file, 'formula scan:', errors.ndjson);
  if (errors.ndjson.includes('"kind":"match"')) throw new Error(`Formula errors remain in ${file}`);
  for (const [sheetName, range] of renders) {
    const image = await wb.render({ sheetName, range, scale: 1.5, format: 'png' });
    await fs.writeFile(path.join(previews, `${file}-${sheetName.replaceAll(' ', '-')}.png`), new Uint8Array(await image.arrayBuffer()));
  }
  const xlsx = await SpreadsheetFile.exportXlsx(wb);
  await xlsx.save(path.join(out, file));
  await fs.rm(path.join(out, file + '.inspect.ndjson'), { force: true });
  console.log('Exported', file);
}

// Workbook 1: source records -> formula-based campaign/search-term analysis -> sensitivity.
{
  const wb = Workbook.create();
  const summary = wb.worksheets.add('Campaign analysis');
  const scenario = wb.worksheets.add('Budget scenario');
  const raw = records.filter(r => r.appId === 'lingoloop');
  const s = rawSheet(wb, 'Source', raw.map(r => data.columns.map(c => c === 'date' ? date(r[c]) : r[c])), data.columns, 'LingoLoop source records: one day, region, and keyword/search-term pair.');
  s.getRange('B:H').format.columnWidth = 24;
  s.getRange(`K6:K${raw.length + 5}`).setNumberFormat(currency);
  s.getRange(`O6:O${raw.length + 5}`).setNumberFormat(currency);
  base(summary, 'L48'); base(scenario, 'H35');
  title(summary, 'Campaign performance', 'LingoLoop. Synthetic case study. All amounts USD. Tap-through metrics unless stated.');
  summary.getRange('A5:B5').values = [['Start date', date('2026-08-22')]];
  summary.getRange('D5:E5').values = [['End date', date('2026-09-20')]];
  summary.getRange('H5:I5').values = [['Target CPA (USD)', 7]];
  summary.getRange('B5').setNumberFormat('mmm d, yyyy'); summary.getRange('E5').setNumberFormat('mmm d, yyyy');
  summary.getRange('I5').setNumberFormat(currency);
  for (const cell of ['B5', 'E5', 'I5']) { summary.getRange(cell).format.fill = '#EAF2FD'; summary.getRange(cell).format.font.color = blue; }
  const heads = ['Campaign / search term', 'Spend (USD)', 'Impressions', 'Taps', 'New downloads', 'Redownloads', 'Tap installs', 'CR (tap)', 'CPA (tap USD)', 'TTR', 'Avg CPT (USD)', 'Next step'];
  header(summary, 'A8:L8', heads);
  header(summary, 'A20:L20', heads);
  const last = raw.length + 5;
  const sumifs = (col, matchCol, row) => `SUMIFS(Source!$${col}$6:$${col}$${last},Source!$${matchCol}$6:$${matchCol}$${last},$A${row},Source!$A$6:$A$${last},">="&$B$5,Source!$A$6:$A$${last},"<="&$E$5)`;
  const addRow = (name, row, matchCol) => {
    summary.getRange(`A${row}`).values = [[name]];
    for (const [dest, source] of [['B', 'K'], ['C', 'I'], ['D', 'J'], ['E', 'L'], ['F', 'M']]) summary.getRange(`${dest}${row}`).formulas = [[`=${sumifs(source, matchCol, row)}`]];
    summary.getRange(`G${row}:L${row}`).formulas = [[`=SUM(E${row}:F${row})`, `=${safe('G' + row, 'D' + row)}`, `=${safe('B' + row, 'G' + row)}`, `=${safe('D' + row, 'C' + row)}`, `=${safe('B' + row, 'D' + row)}`, `=IF(AND(D${row}>=100,G${row}<20,B${row}>=$I$5*20),"Investigate",IF(OR(D${row}<100,G${row}<20),"Collect evidence",IF(I${row}>$I$5*1.2,"Investigate",IF(I${row}<$I$5*0.85,"Test expansion","Maintain"))))`]];
  };
  ['Brand', 'Category', 'Competitor', 'Discovery'].forEach((name, i) => addRow(name, i + 9, 'D'));
  const terms = [...new Set(raw.map(r => r.searchTerm))];
  terms.forEach((term, i) => addRow(term, i + 21, 'G'));
  summary.getRange('L:L').format.columnWidth = 22;
  summary.getRange('L9:L32').format.horizontalAlignment = 'center';
  summary.getRange('C9:G32').setNumberFormat('#,##0');
  for (const range of ['B9:B12', 'I9:I12', 'K9:K12', `B21:B${20 + terms.length}`, `I21:I${20 + terms.length}`, `K21:K${20 + terms.length}`]) summary.getRange(range).setNumberFormat(currency);
  for (const range of ['H9:H12', 'J9:J12', `H21:H${20 + terms.length}`, `J21:J${20 + terms.length}`]) summary.getRange(range).setNumberFormat('0.0%');
  summary.getRange('A14').values = [['Total']];
  for (const col of ['B','C','D','E','F','G']) summary.getRange(`${col}14`).formulas = [[`=SUM(${col}9:${col}12)`]];
  summary.getRange('H14:K14').formulas = [[`=${safe('G14','D14')}`,`=${safe('B14','G14')}`,`=${safe('D14','C14')}`,`=${safe('B14','D14')}`]];
  summary.getRange('B14').setNumberFormat(currency); summary.getRange('I14').setNumberFormat(currency); summary.getRange('K14').setNumberFormat(currency);
  summary.getRange('H14').setNumberFormat('0.0%'); summary.getRange('J14').setNumberFormat('0.0%');
  summary.getRange('A14:L14').format.fill = '#F0F0F3'; summary.getRange('A14:L14').format.font.bold = true;
  notes(summary, 16, ['Blue cells are editable inputs. Rates use summed counts; new downloads and redownloads are separate.', 'Rules: collect small samples; investigate CPA >120% of target or substantial spend with few installs; test expansion below 85%.', 'Substantial spend: at least 100 taps, fewer than 20 installs, spend >=20 target acquisitions. Validate relevance before spending more.']);
  summary.getRange('L9:L32').conditionalFormats.add('containsText', { text: 'Investigate', format: { fill: '#FFF2DF', font: { color: '#865500' } } });
  title(scenario, 'Budget sensitivity', 'A hypothetical Competitor-to-Category transfer. Scope follows the campaign analysis dates.');
  scenario.getRange('A6:B7').values = [['Transfer share (%)', 15], ['Marginal Category CPA increase (%)', 20]];
  scenario.getRange('A:A').format.columnWidth = 45;
  scenario.getRange('B6:B7').format.fill = '#EAF2FD'; scenario.getRange('B6:B7').format.font.color = blue;
  scenario.getRange('B6:B7').setNumberFormat('0"%"');
  scenario.dataValidations.add({ range: 'B6', rule: { type: 'whole', operator: 'between', formula1: 0, formula2: 30 } });
  scenario.dataValidations.add({ range: 'B7', rule: { type: 'whole', operator: 'between', formula1: 0, formula2: 50 } });
  header(scenario, 'A10:D10', ['Campaign', 'Spend (USD)', 'Tap installs', 'CPA (tap USD)']);
  for (let i = 0; i < 4; i++) scenario.getRange(`A${11+i}:D${11+i}`).formulas = [[`='Campaign analysis'!A${9+i}`,`='Campaign analysis'!B${9+i}`,`='Campaign analysis'!G${9+i}`,`='Campaign analysis'!I${9+i}`]];
  scenario.getRange('B11:B14').setNumberFormat(currency); scenario.getRange('D11:D14').setNumberFormat(currency);
  const calc = [
    ['Budget transferred (USD)', '=B13*B6/100'],
    ['Modeled installs removed', '=B17/D13'],
    ['Modeled installs added', '=B17/(D12*(1+B7/100))'],
    ['Modeled net install change', '=B19-B18'],
    ['Modeled total installs', '=SUM(C11:C14)+B20'],
    ['Total spend held constant (USD)', '=SUM(B11:B14)'],
    ['Modeled average CPA (USD)', '=B22/B21'],
  ];
  calc.forEach(([label, formula], i) => { scenario.getRange(`A${17+i}`).values = [[label]]; scenario.getRange(`B${17+i}`).formulas = [[formula]]; });
  scenario.getRange('B17').setNumberFormat(currency); scenario.getRange('B22:B23').setNumberFormat(currency); scenario.getRange('B18:B21').setNumberFormat('0.0');
  notes(scenario, 26, ['Transfer share is capped at 30%. Additional Category installs use historical CPA adjusted by the selected cost increase.', 'This assumes sufficient demand. Auction response, saturation, and customer value are unmodeled.', 'A sensitivity calculation is not a forecast or evidence of causal lift. Final evaluation requires mature attribution.']);
  await finish(wb, 'campaign-analysis.xlsx', [['Campaign analysis', 'A1:L17'], ['Budget scenario', 'A1:F29'], ['Source', 'A1:H11']], async () => {
    const expected = raw.filter(r => r.date >= '2026-08-22').reduce((a, r) => a + r.spend, 0);
    const actual = summary.getRange('B14').values[0][0];
    if (Math.abs(actual - expected) > .01) throw new Error(`Campaign spend mismatch: ${actual} vs ${expected}`);
    const original = scenario.getRange('B6').values[0][0];
    scenario.getRange('B6').values = [[0]]; wb.recalculate();
    if (Math.abs(scenario.getRange('B20').values[0][0]) > 1e-8) throw new Error('Zero transfer changed installs');
    scenario.getRange('B6').values = [[original]]; wb.recalculate();
    console.log((await wb.inspect({ kind: 'table', range: "'Campaign analysis'!A8:L14", tableMaxRows: 7, tableMaxCols: 12, maxChars: 2500 })).ndjson);
  });
}

// Workbook 2: a prepared daily account source and a live SUMIFS client review.
{
  const wb = Workbook.create();
  const review = wb.worksheets.add('Account review');
  const daily = new Map();
  for (const r of records) {
    const key = `${r.date}/${r.appId}`;
    if (!daily.has(key)) daily.set(key, [date(r.date), data.apps.find(a => a.id === r.appId).name, 0,0,0,0,0,0]);
    const a = daily.get(key);
    ['spend','impressions','taps','newDownloads','redownloads','viewInstalls'].forEach((field, i) => a[i + 2] += r[field]);
  }
  const prepared = [...daily.values()];
  const source = rawSheet(wb, 'Daily source', prepared, ['Date', 'Advertiser', 'Spend (USD)', 'Impressions', 'Taps', 'New downloads', 'Redownloads', 'View installs'], 'Prepared daily account totals from synthetic-campaigns.csv. Summed across themes and regions.');
  source.getRange(`C6:C${prepared.length+5}`).setNumberFormat(currency);
  base(review, 'J43');
  title(review, 'Advertiser account review', 'Eight fictional accounts. All amounts USD. Current and prior periods are both 30 days.');
  review.getRange('A5:B6').values = [['Current start', date('2026-08-22')], ['Prior start', date('2026-07-23')]];
  review.getRange('D5:E6').values = [['Current end', date('2026-09-20')], ['Prior end', date('2026-08-21')]];
  review.getRange('B5:B6').setNumberFormat('mmm d, yyyy'); review.getRange('E5:E6').setNumberFormat('mmm d, yyyy');
  header(review, 'A9:J9', ['Advertiser', 'CPA target (USD)', 'Spend (USD)', 'Taps', 'Tap installs', 'CPA (tap USD)', 'Prior CPA (USD)', 'CPA change', 'Quality context', 'Next step']);
  const last = prepared.length + 5;
  const aggregate = (sourceCol, r, periodRow) => `SUMIFS('Daily source'!$${sourceCol}$6:$${sourceCol}$${last},'Daily source'!$B$6:$B$${last},$A${r},'Daily source'!$A$6:$A$${last},">="&$B$${periodRow},'Daily source'!$A$6:$A$${last},"<="&$E$${periodRow})`;
  data.apps.forEach((app, i) => {
    const r = i + 10;
    review.getRange(`A${r}:B${r}`).values = [[app.name, app.targetCpa]];
    review.getRange(`C${r}:H${r}`).formulas = [[`=${aggregate('C',r,5)}`,`=${aggregate('E',r,5)}`,`=${aggregate('F',r,5)}+${aggregate('G',r,5)}`,`=${safe('C'+r,'E'+r)}`,`=${safe(aggregate('C',r,6), `(${aggregate('F',r,6)}+${aggregate('G',r,6)})`)}`,`=IF(AND(ISNUMBER(F${r}),ISNUMBER(G${r})),IF(G${r}=0,"n.a.",F${r}/G${r}-1),"n.a.")`]];
    review.getRange(`I${r}`).values = [[app.quality]];
    review.getRange(`J${r}`).formulas = [[`=IF(I${r}="Concern raised","Quality review",IF(AND(D${r}>=100,E${r}<20,C${r}>=B${r}*20),"Investigate",IF(OR(D${r}<100,E${r}<20),"Collect evidence",IF(F${r}>B${r}*1.2,"Investigate",IF(F${r}<B${r}*0.85,"Test expansion","Maintain")))))`]];
  });
  for (const col of ['B','C','F','G']) review.getRange(`${col}10:${col}17`).setNumberFormat(currency);
  review.getRange('H10:H17').setNumberFormat('0.0%;(0.0%);0.0%');
  review.getRange('D10:E17').setNumberFormat('#,##0');
  review.getRange('F10:H17').format.horizontalAlignment = 'right';
  review.getRange('J10:J17').format.horizontalAlignment = 'center';
  review.getRange('I10:I17').format.horizontalAlignment = 'center';
  review.getRange('I:J').format.columnWidth = 23;
  review.getRange('J10:J17').conditionalFormats.add('containsText', { text: 'Investigate', format: { fill: '#FFF2DF', font: { color: '#865500' } } });
  review.getRange('J10:J17').conditionalFormats.add('containsText', { text: 'Quality review', format: { fill: '#FFF2DF', font: { color: '#865500' } } });
  review.getRange('B10:B17').format.fill = '#EAF2FD'; review.getRange('B10:B17').format.font.color = blue;
  review.getRange('I10:I17').dataValidation = { rule: { type: 'list', values: ['Unknown', 'Concern raised'] } };
  notes(review, 20, ['CPA targets and client concerns are fictional editable scenario inputs. A quality concern takes precedence over low install CPA.', 'Priority: quality concern; CPA >120% of target; CPA deterioration; limited evidence; potential expansion; maintain.', 'Next steps are independently designed heuristics, not Apple recommendations. More advertiser spend does not establish client value.']);
  review.getRange('A25').values = [['Thirty-day client plan']]; review.getRange('A25').format.font.bold = true;
  header(review, 'A27:D27', ['Checkpoint', 'Action', 'Owner', 'Evidence']);
  review.getRange('A28:D31').values = [
    ['Week 1', 'Confirm goals and definitions', 'Account team + client', 'Reporting and cohort quality'],
    ['Week 2', 'Agree a bounded test', 'Client partner', 'Budget cap and stop condition'],
    ['Week 3', 'Monitor mature cohorts', 'Platform specialist', 'CPA, CR, new-download mix'],
    ['Week 4', 'Review and decide', 'Account team + client', 'Extend, revise, or stop'],
  ];
  review.getRange('B28:D31').format.wrapText = true; review.getRange('A28:D31').format.rowHeight = 42;
  notes(review, 35, ['Final evaluation may extend beyond 30 days while attribution and quality cohorts mature.', 'The full daily source CSV and SQL are included in the repository. All eight advertiser accounts are fictional.']);
  await finish(wb, 'client-growth.xlsx', [['Account review', 'A1:J22'], ['Daily source', 'A1:H12']], async () => {
    const sql = JSON.parse(await fs.readFile(path.join(root, 'public/data/sql-summary.json'), 'utf8'));
    for (let i = 0; i < data.apps.length; i++) {
      const expected = sql.find(s => s.appId === data.apps[i].id);
      if (Math.abs(review.getRange(`C${i+10}`).values[0][0] - expected.spend) > .01) throw new Error('Account spend mismatch');
    }
    const original = review.getRange('B10').values[0][0];
    review.getRange('B10').values = [[.1]]; wb.recalculate();
    if (review.getRange('J10').values[0][0] !== 'Investigate') throw new Error('Target input did not update recommendation');
    review.getRange('B10').values = [[original]]; wb.recalculate();
    console.log((await wb.inspect({ kind:'table', range: "'Account review'!A9:J17", tableMaxRows:9, tableMaxCols:10, maxChars:2500 })).ndjson);
  });
}
