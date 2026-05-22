---
title: "Chapter 3: Querying & Transformations"
weight: 4
bookFlatSection: false
bookToc: true
---

# Chapter 3: Querying & Transformations

## 🎯 Learning Objectives

- Write complex queries with Snowflake SQL
- Use Snowflake-specific functions for data transformation
- Create views for reusable analytics
- Build materialized views for performance
- Use dynamic tables for automated transformations
- Implement data quality checks

---

## 3.1 Snowflake SQL Features

Snowflake supports ANSI SQL with powerful extensions designed for analytics:

```sql
-- QUALIFY: Filter window function results (like HAVING for windows)
SELECT name, department, salary
FROM employees
QUALIFY ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) <= 3;

-- LATERAL JOIN with FLATTEN for semi-structured data
SELECT e.name, f.value::STRING AS hobby
FROM employees e,
LATERAL FLATTEN(INPUT => e.hobbies:list) f;

-- SAMPLE/ TABLESAMPLE for quick exploration
SELECT * FROM orders SAMPLE (1%);  -- 1% of rows (approximate)

-- GROUP BY ALL (group by all non-aggregate columns)
SELECT department, status, COUNT(*)
FROM employees
GROUP BY ALL;  -- Same as GROUP BY department, status
```

### Snowflake vs Traditional SQL

| Feature | Traditional SQL | Snowflake SQL |
|---------|----------------|---------------|
| QUALIFY | Not supported | Filter window function results |
| SAMPLE | Some DBs support | Built-in random sampling |
| GROUP BY ALL | Not supported | Group by all non-aggregate columns |
| IFF() | CASE needed | Inline IF: `IFF(condition, true, false)` |
| FLATTEN | Not supported | Expand arrays/objects to rows |
| LATERAL | Some DBs support | Join with inline subqueries |

---

## 3.2 Common Transformations

### Data Cleaning

```sql
-- Handle NULLs
SELECT
  COALESCE(phone, email, 'No Contact') AS contact_info,
  NVL(salary, 0) AS salary_fixed,
  NULLIF(empty_string, '') AS cleaned_string
FROM employees;

-- String cleaning
SELECT
  TRIM(first_name) AS trimmed_name,
  UPPER(email) AS upper_email,
  REPLACE(phone, '-', '') AS clean_phone,
  SPLIT(full_name, ' ') AS name_parts,
  ARRAY_TO_STRING(name_parts, ', ') AS name_csv
FROM employees;

-- Deduplication
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY loaded_at DESC) AS rn
  FROM raw.customers
)
SELECT * FROM ranked WHERE rn = 1;
```

### Date/Time Transformations

```sql
-- Date truncation (critical for time-series analysis)
SELECT
  DATE_TRUNC('hour', order_date) AS hour,
  DATE_TRUNC('day', order_date) AS day,
  DATE_TRUNC('week', order_date) AS week,
  DATE_TRUNC('month', order_date) AS month,
  DATE_TRUNC('quarter', order_date) AS quarter,
  DATE_TRUNC('year', order_date) AS year,
  COUNT(*) AS orders
FROM orders
GROUP BY ALL;

-- Date parts
SELECT
  DATE_PART('year', order_date) AS year,
  DATE_PART('month', order_date) AS month,
  DATE_PART('dow', order_date) AS day_of_week,  -- 0 = Sunday
  DATE_PART('quarter', order_date) AS quarter,
  DATE_PART('week', order_date) AS week_number
FROM orders;

-- Date arithmetic
SELECT
  order_date,
  DATEDIFF('days', order_date, CURRENT_DATE) AS days_since_order,
  DATEADD('month', 1, order_date) AS plus_one_month,
  LAST_DAY(order_date, 'month') AS end_of_month,
  DATE_FROM_PARTS(2024, 1, 1) AS custom_date
FROM orders;
```

### Pivot and Unpivot

```sql
-- PIVOT: Convert rows to columns
SELECT *
FROM monthly_sales
PIVOT(SUM(amount) FOR month IN ('Jan', 'Feb', 'Mar', 'Apr'))
ORDER BY year;

-- UNPIVOT: Convert columns to rows
SELECT *
FROM yearly_sales
UNPIVOT(amount FOR month IN (jan, feb, mar, apr, may, jun));
```

---

## 3.3 Creating Analytics-Ready Views

### Standard Views

```sql
CREATE VIEW analytics.customer_summary AS
SELECT
  c.customer_id,
  c.first_name || ' ' || c.last_name AS full_name,
  c.email,
  c.signup_date,
  DATEDIFF('days', c.signup_date, CURRENT_DATE) AS days_as_customer,
  COUNT(o.order_id) AS total_orders,
  SUM(o.total_amount) AS lifetime_value,
  AVG(o.total_amount) AS avg_order_value,
  MAX(o.order_date) AS last_order_date,
  CASE
    WHEN MAX(o.order_date) >= DATEADD('months', -3, CURRENT_DATE) THEN 'Active'
    WHEN MAX(o.order_date) >= DATEADD('months', -6, CURRENT_DATE) THEN 'At Risk'
    ELSE 'Churned'
  END AS customer_segment
FROM raw.customers c
LEFT JOIN raw.orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.signup_date;

-- Secure view (definition hidden from non-owners)
CREATE SECURE VIEW analytics.revenue_metrics AS
SELECT
  DATE_TRUNC('month', order_date) AS month,
  COUNT(DISTINCT customer_id) AS active_customers,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS revenue,
  SUM(total_amount) / NULLIF(COUNT(DISTINCT customer_id), 0) AS revenue_per_customer
FROM raw.orders
GROUP BY ALL;
```

### Materialized Views

Materialized views store pre-computed results and automatically refresh when base data changes:

```sql
CREATE MATERIALIZED VIEW analytics.daily_metrics AS
SELECT
  DATE_TRUNC('day', o.order_date) AS day,
  COUNT(DISTINCT o.customer_id) AS unique_customers,
  COUNT(*) AS order_count,
  SUM(o.total_amount) AS revenue,
  COUNT(DISTINCT oi.product_id) AS products_sold
FROM raw.orders o
JOIN raw.order_items oi ON o.order_id = oi.order_id
GROUP BY ALL;

-- Using materialized views is transparent to the user:
SELECT * FROM analytics.daily_metrics
WHERE day >= '2024-01-01'
ORDER BY day;
```

| Feature | Standard View | Materialized View |
|---------|--------------|-------------------|
| Data Stored | No (runs query each time) | Yes (pre-computed) |
| Performance | Slower (recalculates) | Fast (reads stored data) |
| Freshness | Always up-to-date | Auto-refreshes on changes |
| Cost | No storage cost | Storage + maintenance credits |
| Use Case | Simple abstractions | Expensive aggregations |

---

## 3.4 Dynamic Tables

**Dynamic tables** automatically maintain the result of a query, refreshing incrementally as source data changes:

```sql
-- Create a dynamic table that refreshes every 5 minutes
CREATE DYNAMIC TABLE analytics.daily_summary
  TARGET_LAG = '5 minutes'
  WAREHOUSE = analytics_wh
AS
SELECT
  DATE_TRUNC('day', order_date) AS day,
  COUNT(*) AS orders,
  SUM(total_amount) AS revenue,
  COUNT(DISTINCT customer_id) AS customers
FROM raw.orders
GROUP BY ALL;
```

### Dynamic Table Refresh Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `TARGET_LAG = '5 minutes'` | Refreshes as often as needed to stay within 5 min of source | Near-real-time pipelines |
| `TARGET_LAG = '1 hour'` | Less frequent refreshes | Hourly reporting |
| `TARGET_LAG = '1 day'` | Daily refresh | Daily summaries |
| `TARGET_LAG = 'DOWNSTREAM'` | Only refreshes when downstream targets need it | On-demand refresh |

### Dynamic Table vs Materialized View

| Feature | Materialized View | Dynamic Table |
|---------|------------------|---------------|
| Refresh | Automatic on base table changes | Configurable target lag |
| Join Support | Single table (most cases) | Multiple tables, complex queries |
| Source | Single table typically | Tables, views, other DTs |
| Control | Less control | TARGET_LAG, warehouse config |
| When to Use | Simple, single-table aggregations | Complex transformations, multi-table |

---

## 3.5 Data Quality Checks

```sql
-- Row count validation
SELECT 'orders' AS table_name, COUNT(*) AS row_count FROM raw.orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM raw.order_items;

-- NULL checks
SELECT
  COUNT(*) FILTER (WHERE customer_id IS NULL) AS null_customer_ids,
  COUNT(*) FILTER (WHERE order_date IS NULL) AS null_dates,
  COUNT(*) FILTER (WHERE total_amount <= 0) AS zero_or_negative_amounts
FROM raw.orders;

-- Duplicate check
SELECT order_id, COUNT(*)
FROM raw.orders
GROUP BY order_id
HAVING COUNT(*) > 1;

-- Referential integrity check
SELECT o.order_id
FROM raw.orders o
LEFT JOIN raw.customers c ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL;
```

---

## 3.6 Putting It Together: ELT Pipeline

```sql
-- Step 1: Raw data loaded (from COPY INTO)
-- Step 2: Clean and transform
CREATE VIEW staging.clean_orders AS
SELECT
  order_id,
  customer_id,
  TRY_CAST(order_date AS TIMESTAMP_NTZ) AS order_date,  -- Handle bad dates
  NULLIF(TRIM(total_amount::VARCHAR), '')::DECIMAL(10,2) AS total_amount,
  COALESCE(status, 'PENDING') AS status,
  CURRENT_TIMESTAMP AS processed_at
FROM raw.orders
WHERE order_id IS NOT NULL;  -- Remove null rows

-- Step 3: Create analytics model
CREATE VIEW analytics.order_facts AS
SELECT
  DATE_TRUNC('day', o.order_date) AS order_day,
  o.customer_id,
  c.customer_segment,
  COUNT(*) AS order_count,
  SUM(o.total_amount) AS total_revenue
FROM staging.clean_orders o
JOIN analytics.customer_summary c ON o.customer_id = c.customer_id
GROUP BY ALL;
```

---

## ✅ Chapter 3 Quiz

1. **What does the QUALIFY clause do?**
   - a) Validates data quality
   - b) Filters window function results
   - c) Qualifies column names
   - d) Checks permissions

2. **Which object stores pre-computed query results and auto-refreshes?**
   - a) Standard view
   - b) Materialized view
   - c) Table
   - d) Stage

3. **What is the main advantage of dynamic tables over materialized views?**
   - a) No storage cost
   - b) Support complex joins and multiple source tables
   - c) Faster query performance
   - d) Can be shared across accounts

4. **Which function converts rows to columns?**
   - a) FLATTEN
   - b) UNPIVOT
   - c) PIVOT
   - d) SPLIT

5. **True or False:** Standard views store data on disk.

<details>
<summary>📌 Answers</summary>

1. **b** — QUALIFY filters the results of window functions
2. **b** — Materialized views store pre-computed data and auto-refresh
3. **b** — Dynamic tables support complex joins and multiple source tables
4. **c** — PIVOT converts rows to columns, UNPIVOT does the reverse
5. **False** — Standard views are logical (no data stored), materialized views store data
</details>

---

## 📚 Additional Resources

- [Snowflake Query Reference](https://docs.snowflake.com/en/sql-reference/query-syntax)
- [Snowflake Functions](https://docs.snowflake.com/en/sql-reference/functions)
- [Dynamic Tables Overview](https://docs.snowflake.com/en/user-guide/dynamic-tables)
- [Materialized Views](https://docs.snowflake.com/en/user-guide/views-materialized)

---

*Next → [Chapter 4: Semi-Structured Data]({{< relref "05-semi-structured-data" >}})*
