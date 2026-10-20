# Verification

## Automated checks

- 13 Vitest tests cover independent SQL-to-TypeScript reconciliation for all eight accounts, weighted metrics, unavailable rates, grouping, small-sample and high-spend boundaries, client-quality priority, budget conservation, no-transfer baseline, scenario bounds, CSV escaping, and conversion intervals.
- 9 Python tests cover deterministic regeneration, unique observation grain, funnel and bid limits, SQL reconciliation, saved workbook caches, budget conservation in the exported workbook, and PDF page counts.
- TypeScript strict checking and the production Vite build.
- GitHub Actions repeats source regeneration, checks for source drift, runs both test suites, and builds before deployment.

## Browser checks

Desktop and 390px mobile layouts were inspected in the browser. Checks included:

- Opening both projects from navigation.
- Changing advertiser and region filters and checking updated metrics.
- Searching detail rows and exercising the no-results state and reset.
- Opening and closing a search-term evidence dialog.
- Confirming that substantial spend with few installs yields an investigation recommendation.
- Confirming that the sparse account disables the budget scenario.
- Setting the transfer slider to zero and confirming baseline CPA and zero modeled install change.
- Filtering advertisers by account owner and confirming the account list and summary change together.
- Opening the client review, navigating all five slides, and confirming the final Next button is disabled.
- Jumping to the methodology's official-sources section.
- Inspecting root horizontal overflow and correcting absolutely positioned accessibility text in the campaign table.

## Downloadable artifacts

- Both workbooks were recalculated and scanned for formula errors before export.
- Campaign spend and all account spends were reconciled against independently computed source totals.
- Changing the scenario transfer to zero restored baseline installs; changing an account CPA target changed its recommendation. Inputs were restored before export.
- Every workbook sheet was rendered for visual review. Native Microsoft Excel interaction was not tested; formulas were evaluated in the authoring engine and saved files were inspected for cached errors.
- The campaign PDF and all five client-review PDF pages were rendered and visually reviewed.

## Scope and limits

All observations, client notes, owners, targets, and outcomes are synthetic. There is no connection to Apple Ads accounts and no measured campaign lift. The scenario omits auction response and available demand. Attribution is not incrementality. Workbook summaries use formulas and Excel source tables rather than native PivotTables.
