# Data dictionary

Every value is synthetic. The compact JSON stores `columns` once and represents each record as an ordered array. The CSV uses the same column order. `src/App.tsx` expands the arrays into named records.

## Observation grain

One date, advertiser, country, campaign, ad group, keyword, and search-term pair. That compound key is unique. There are 8 × 90 × 2 × 4 × 3 = 17,280 observations. All are search-results placement observations. There are no user identifiers or person-level records.

| Field | Type | Meaning |
| --- | --- | --- |
| date | ISO date | Synthetic reporting date, 2026-06-23 through 2026-09-20 |
| appId | string | Fictional advertiser's stable key |
| country | string | US or GB App Store region; all monetary values remain USD |
| campaign | string | Brand, Category, Competitor, or Discovery theme |
| adGroup | string | Group with Exact, Broad, or Search Match discovery source |
| keyword | string | Bidded keyword; `Search Match` is a display sentinel for no bidded keyword |
| searchTerm | string | Fictional search query |
| matchType | string | Exact, Broad, or the `Search Match` source sentinel; Search Match is not a keyword match type |
| impressions | integer | Times the synthetic ad was shown |
| taps | integer | Taps, bounded by impressions |
| spend | number | Synthetic advertiser spend in USD, rounded to cents per record |
| newDownloads | integer | Synthetic attributed tap-through new downloads |
| redownloads | integer | Synthetic attributed tap-through redownloads |
| viewInstalls | integer | Synthetic view-through installs, disjoint from tap-through installs |
| maxCptBid | number | Synthetic maximum tap bid in USD; observed per-record average CPT does not exceed it |

The Search Match sentinel keeps the demonstration dataset compact. A production ingestion layer should model match source separately and use a nullable keyword match type.

## Account metadata

App names, categories, account owners, goals, client notes, CPA targets, and planning budgets are fictional. `monthlyBudget` is an illustrative planning input, not a spend cap or a value used in recommendations. The 30-day review does not claim calendar-month budget utilization. The tiny Trail account intentionally exposes unavailable ratios and sparse samples.

## Derived measures

`tap installs = newDownloads + redownloads`. `total installs = tap installs + viewInstalls`. Rates always use summed counts, not averages of row ratios. A zero denominator is `null` on the website and `n.a.` in the workbooks. Spend is additive; CPA and conversion rates are not.

The campaign workbook contains all 2,160 LingoLoop records. The advertiser workbook contains 720 prepared daily account totals from the complete CSV, summed across regions and themes. Its source is labeled as prepared data. Neither source tab is overwritten by downstream formulas.

## Time and attribution

Latest 30 days: 2026-08-22 through 2026-09-20. Prior 30 days: 2026-07-23 through 2026-08-21. Both include their endpoints and do not overlap. The snapshot date is 2026-10-20; every reporting date is at least 30 days earlier. Counts are synthetic completed attribution outcomes, not raw event logs or a production attribution implementation. Post-install cohort maturity can require additional time.
