---
title: "Chapter 8: Performance Optimization"
weight: 9
bookFlatSection: false
bookToc: true
---

# Chapter 8: Performance Optimization

## 🎯 Learning Objectives

- Understand micro-partitions and how they enable pruning
- Use clustering to improve large table performance
- Read and interpret query profiles
- Leverage result caching and warehouse caching
- Use search optimization for selective lookups
- Apply best practices for query performance

---

## 8.1 Micro-Partitions

Snowflake automatically splits table data into **micro-partitions** — small, compressed, columnar files of 50-500 MB.

### How Micro-Partitions Work

```
Table: orders (10M rows, 500 GB)
┌──────────────────────────────────────────────────────────────┐
│  Micro-partition 1: rows 1-500,000                          │
│  Columns: order_id, customer_id, order_date, total_amount   │
│  Metadata: min order_date: 2024-01-01, max: 2024-01-15     │
│           min customer_id: 1, max: 500                      │
├──────────────────────────────────────────────────────────────┤
│  Micro-partition 2: rows 500,001-1,000,000                  │
│  Metadata: min order_date: 2024-01-16, max: 2024-01-31     │
│           min customer_id: 501, max: 1000                   │
├──────────────────────────────────────────────────────────────┤
│  ... (more micro-partitions)                                │
└──────────────────────────────────────────────────────────────┘
```

### Metadata for Pruning

Each micro-partition stores metadata about its contents:
- Min/max values for each column
- Null count
- Distinct values count

```sql
-- View micro-partition metadata
SELECT *
FROM TABLE(INFORMATION_SCHEMA.AUTOMATIC_CLUSTERING_HISTORY())
WHERE TABLE_NAME = 'ORDERS';

-- View table storage details
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.TABLE_STORAGE_METRICS
WHERE TABLE_NAME = 'ORDERS';
```

### Automatic Pruning

When you run a query with a filter, Snowflake's metadata allows it to **prune** (skip) micro-partitions that don't contain matching data:

```sql
-- Snowflake checks micro-partition metadata
-- Only reads partitions where min/max order_date includes '2024-06-01'
SELECT *
FROM orders
WHERE order_date = '2024-06-01';
```

---

## 8.2 Clustering

For very large tables (1 TB+), automatic clustering may not be sufficient. **Clustering** explicitly organizes micro-partitions to improve pruning.

### When to Cluster

```sql
-- Large table with poor query performance due to full scans
-- Symptoms:
-- - Queries with filters still scan many micro-partitions
-- - Automatic clustering is falling behind
-- - Table is > 1 TB with frequent range queries

CREATE TABLE large_events (
  event_id INTEGER,
  event_date DATE,
  user_id INTEGER,
  event_type VARCHAR(50),
  event_data VARIANT
);
```

### Enabling Clustering

```sql
-- Define a clustering key (Enterprise Edition required)
ALTER TABLE large_events
  CLUSTER BY (event_date, event_type);

-- Cluster by multiple columns (order matters — first column is most important)
ALTER TABLE large_events
  CLUSTER BY (event_date, event_type, user_id);

-- Check clustering status
SELECT SYSTEM$CLUSTERING_INFORMATION('large_events');

-- Check clustering depth (lower = better clustered)
SELECT SYSTEM$CLUSTERING_DEPTH('large_events', '(event_date)');

-- Re-cluster a table manually
ALTER TABLE large_events RECLUSTER;
```

### Clustering Best Practices

| Guideline | Explanation |
|-----------|-------------|
| **Cluster by date first** | Most queries filter by date range |
| **Avoid high-cardinality columns** | Clustering on unique IDs isn't helpful |
| **Use 2-3 columns max** | More columns = diminishing returns |
| **Monitor clustering depth** | Aim for depth < 10 on large tables |
| **Let Snowflake auto-cluster** | Only manual cluster when auto falls behind |

> **Cost:** Clustering consumes credits. Auto-clustering runs in the background using Snowflake-managed compute.

---

## 8.3 Query Profile

The **query profile** shows you exactly how a query executed — which operations took the longest and how much data was processed.

```sql
-- Generate a query profile URL
SELECT SYSTEM$EXPLAIN_JSON_FRONTEND(
  (SELECT QUERY_ID FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
   WHERE QUERY_TAG = 'slow_query' ORDER BY START_TIME DESC LIMIT 1)
);

-- View query statistics
SELECT *
FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY(
  END_TIME_RANGE_START => DATEADD('hours', -1, CURRENT_TIMESTAMP)
))
WHERE QUERY_TYPE = 'SELECT'
ORDER BY TOTAL_ELAPSED_TIME DESC;

-- Query profile key metrics (view in Snowsight UI):
-- 1. Bytes scanned (how much data was read)
-- 2. Pruning ratio (% of partitions skipped)
-- 3. Execution time by operator
-- 4. Spilled data (query used local/remote disk)
```

### Common Query Profile Red Flags

| Metric | Bad Sign | Fix |
|--------|----------|-----|
| Bytes scanned >> result size | Poor pruning | Add clustering, optimize WHERE |
| High % remote spill | Warehouse too small | Increase warehouse size |
| High % local spill | Slightly too small | Increase or optimize |
| Full table scan | No pruning | Add filter on clustered column |
| Long time in JOIN | Inefficient join | Check join order, small table first |

---

## 8.4 Caching in Snowflake

Snowflake has multiple caching layers:

### Result Cache

Stores query results for **24 hours** (even if data changes):

```sql
-- First run: scans data
SELECT customer_id, COUNT(*)
FROM orders
GROUP BY customer_id;

-- Second run (same query): returns cached results (instant)
-- Works even if warehouse is suspended
SELECT customer_id, COUNT(*)
FROM orders
GROUP BY customer_id;

-- Result caching conditions:
-- 1. Same SQL text (exact match)
-- 2. Same database/schema context
-- 3. Underlying table data hasn't changed
-- 4. No non-deterministic functions (CURRENT_TIMESTAMP, etc.)
```

### Warehouse Cache

Virtual warehouses cache data from cloud storage to their local SSD:

```sql
-- First query on a warehouse: slower (reads from cloud storage)
-- Subsequent queries: faster (data cached on warehouse SSD)
-- Warehouse cache is lost when warehouse is suspended

-- Keep warehouse warm for consistent performance
ALTER WAREHOUSE analytics_wh
  SET AUTO_SUSPEND = 3600;  -- 1 hour timeout
```

### Metadata Cache

Cloud services layer caches metadata (table row counts, micro-partition metadata):

```sql
-- These queries don't need a warehouse (use metadata cache)
SELECT COUNT(*) FROM orders;  -- Uses metadata if table hasn't changed
SELECT MAX(order_date) FROM orders;
SELECT MIN(order_id) FROM orders;
```

| Cache Type | Duration | Persists? | Cost Impact |
|------------|----------|-----------|-------------|
| **Result Cache** | 24 hours | Survives warehouse suspend | Reduces compute cost |
| **Warehouse Cache** | Until warehouse suspend | Local SSD | Faster queries |
| **Metadata Cache** | Continuous | Cloud services layer | Free |

---

## 8.5 Search Optimization

The **search optimization service** improves point lookup queries on large tables:

```sql
-- Enable search optimization on a table
ALTER TABLE large_events
  ADD SEARCH OPTIMIZATION;

-- Enable on specific columns (Enterprise+)
ALTER TABLE large_orders
  ADD SEARCH OPTIMIZATION ON EQUALITY(customer_id, email);

-- Check search optimization status
SHOW TABLES LIKE '%large_events%';
```

### When to Use Search Optimization

| Query Pattern | Without Search Opt | With Search Opt |
|--------------|-------------------|-----------------|
| `WHERE customer_id = 12345` | Full table scan | Direct lookup |
| `WHERE email = 'user@example.com'` | Full scan | Direct lookup |
| `WHERE id = 999999 AND status = 'ACTIVE'` | Scan + filter | Combined lookup |

> **Cost:** Search optimization uses Snowflake-managed compute credits. Only enable on large tables with frequent point-lookup queries.

---

## 8.6 Performance Best Practices

### Query Optimization

```sql
-- 1. Filter early with WHERE
-- Bad: Scans all rows then filters
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC)
  FROM orders
) WHERE rn = 1 AND order_date >= '2024-01-01';

-- Good: Filters before window function
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC)
  FROM orders WHERE order_date >= '2024-01-01'
) WHERE rn = 1;

-- 2. Use approximate functions for large datasets
SELECT APPROX_COUNT_DISTINCT(customer_id) FROM orders;
-- Much faster than COUNT(DISTINCT customer_id)

-- 3. Use HAVING vs WHERE appropriately
-- WHERE filters before GROUP BY, HAVING filters after

-- 4. Limit data early
SELECT * FROM events
WHERE event_date >= '2024-06-01'
LIMIT 100;  -- Stop scanning after finding 100 rows
```

### Warehouse Optimization

```sql
-- Right-size your warehouse
-- Too small: queries spill to remote disk (very slow)
-- Too large: wasted credits

-- Use multi-cluster for concurrent workloads
CREATE WAREHOUSE concurrent_wh
  WAREHOUSE_SIZE = 'SMALL'
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 5
  SCALING_POLICY = 'STANDARD';

-- Use different warehouses for different workloads
CREATE WAREHOUSE etl_wh     WAREHOUSE_SIZE = 'MEDIUM';   -- ETL
CREATE WAREHOUSE bi_wh      WAREHOUSE_SIZE = 'LARGE';    -- BI dashboards
CREATE WAREHOUSE adhoc_wh   WAREHOUSE_SIZE = 'XSMALL';   -- Ad-hoc queries
```

### General Tips

| Tip | Impact |
|-----|--------|
| **Select only needed columns** | Reduces data scanned by 50-90% |
| **Use filters on clustered columns** | Enables partition pruning |
| **Avoid SELECT DISTINCT on large tables** | Expensive operation |
| **Use binding variables** | Enables result cache reuse |
| **Monitor with query profile** | Identify expensive operations |
| **Use materialized views** | Pre-compute expensive aggregations |
| **Compress data in stages** | Faster loading with GZIP/ZSTD |

---

## ✅ Chapter 8 Quiz

1. **What size are Snowflake micro-partitions?**
   - a) 1-10 MB
   - b) 50-500 MB
   - c) 1-5 GB
   - d) 10-50 GB

2. **Which cache persists even when the warehouse is suspended?**
   - a) Warehouse cache
   - b) Result cache
   - c) Both caches
   - d) Neither cache

3. **What does pruning mean in Snowflake?**
   - a) Deleting old data
   - b) Skipping irrelevant micro-partitions during query execution
   - c) Compressing data to save space
   - d) Cloning only a subset of data

4. **When should you enable search optimization?**
   - a) On all tables
   - b) On large tables with frequent point-lookup queries
   - c) Only on transient tables
   - d) On small tables only

5. **True or False:** Clustering requires Enterprise Edition.

<details>
<summary>📌 Answers</summary>

1. **b** — Micro-partitions are 50-500 MB
2. **b** — Result cache persists (24 hours), warehouse cache is lost on suspend
3. **b** — Pruning skips micro-partitions that don't contain relevant data
4. **b** — Search optimization is for large tables with selective lookups
5. **True** — Clustering is an Enterprise Edition feature
</details>

---

## 📚 Additional Resources

- [Query Performance](https://docs.snowflake.com/en/user-guide/performance-query)
- [Clustering Overview](https://docs.snowflake.com/en/user-guide/tables-clustering)
- [Understanding Query Profile](https://docs.snowflake.com/en/user-guide/ui-query-profile)
- [Search Optimization](https://docs.snowflake.com/en/user-guide/search-optimization)

---

*Next → [Chapter 9: Cost Management]({{< relref "10-cost-management" >}})*
