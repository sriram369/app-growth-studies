-- Synthetic data only. All campaign accounts use USD, including GB storefronts.
-- 30-day account review: 2026-08-22 through 2026-09-20, inclusive.
-- Ratios are calculated from summed counts; undefined rates remain NULL.
SELECT appId,
       SUM(impressions) AS impressions,
       SUM(taps) AS taps,
       ROUND(SUM(spend), 2) AS spend,
       SUM(newDownloads) AS new_downloads,
       SUM(redownloads) AS redownloads,
       SUM(newDownloads + redownloads) AS tap_installs,
       SUM(viewInstalls) AS view_installs,
       1.0 * SUM(taps) / NULLIF(SUM(impressions), 0) AS ttr,
       SUM(spend) / NULLIF(SUM(taps), 0) AS avg_cpt,
       1.0 * SUM(newDownloads + redownloads) / NULLIF(SUM(taps), 0) AS cr_tap,
       SUM(spend) / NULLIF(SUM(newDownloads + redownloads), 0) AS avg_cpa_tap
FROM performance
WHERE date BETWEEN '2026-08-22' AND '2026-09-20'
GROUP BY appId
ORDER BY appId;
