---
title: "Chapter 13: Real-World Scenarios"
weight: 14
bookFlatSection: false
bookToc: true
---

# Chapter 13: Real-World Scenarios

## 🎯 Learning Objectives

- Apply Snowflake concepts to real-world data challenges
- Design solutions for common data engineering problems
- Troubleshoot performance and pipeline issues
- Implement production-ready patterns

---

## 13.1 Scenario 1: E-commerce Analytics Pipeline

### Problem
An e-commerce company needs a Snowflake pipeline that:
1. Ingests 1M+ events/day (page views, purchases, cart adds)
2. Transforms raw events into analytics-ready tables
3. Updates in near-real-time for dashboards
4. Supports historical analysis with Time Travel

### Solution

```sql
-- 1. Raw data table (VARIANT for schema flexibility)
CREATE TABLE raw.events (
  event_id INTEGER AUTOINCREMENT,
  event_data VARIANT,
  ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. File format for JSON loading
CREATE FILE FORMAT json_format
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE;

-- 3. Snowpipe for continuous loading
CREATE PIPE event_pipe AUTO_INGEST = TRUE AS
  COPY INTO raw.events (event_data)
  FROM @event_stage
  FILE_FORMAT = json_format;

-- 4. Stream for CDC
CREATE STREAM raw.events_stream ON TABLE raw.events;

-- 5. Parsed staging table
CREATE TABLE staging.parsed_events (
  event_id INTEGER,
  event_type VARCHAR(50),
  user_id INTEGER,
  session_id VARCHAR(100),
  page VARCHAR(500),
  product_id INTEGER,
  amount DECIMAL(10,2),
  event_timestamp TIMESTAMP_NTZ
);

-- 6. Task to transform
CREATE TASK parse_events_task
  WAREHOUSE = etl_wh
  SCHEDULE = '1 MINUTE'
WHEN SYSTEM$STREAM_HAS_DATA('raw.events_stream')
AS
  INSERT INTO staging.parsed_events
  SELECT
    event_id,
    event_data:event_type::STRING,
    event_data:user_id::INTEGER,
    event_data:session_id::STRING,
    event_data:page::STRING,
    event_data:product_id::INTEGER,
    event_data:amount::DECIMAL(10,2),
    event_data:timestamp::TIMESTAMP_NTZ
  FROM raw.events_stream
  WHERE METADATA$ACTION = 'INSERT';

-- 7. Analytics view for dashboards
CREATE MATERIALIZED VIEW analytics.realtime_metrics AS
SELECT
  DATE_TRUNC('minute', event_timestamp) AS minute,
  COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
  COUNT(*) FILTER (WHERE event_type = 'purchase') AS purchases,
  COUNT(DISTINCT user_id) AS unique_users,
  SUM(amount) FILTER (WHERE event_type = 'purchase') AS revenue
FROM staging.parsed_events
WHERE event_timestamp >= DATEADD('hours', -24, CURRENT_TIMESTAMP)
GROUP BY ALL;
```

---

## 13.2 Scenario 2: Data Sharing with Multiple Teams

### Problem
A data platform team needs to:
- Share daily sales data with the marketing team
- Share aggregated customer metrics with the finance team
- Share raw transaction data with the data science team
- Restrict PII access for different roles

### Solution

```sql
-- 1. Create roles for each team
CREATE ROLE marketing_role;
CREATE ROLE finance_role;
CREATE ROLE data_science_role;

-- 2. Create secure views for each audience

-- Marketing: aggregated, no PII
CREATE SECURE VIEW sharing.marketing_sales AS
SELECT
  DATE_TRUNC('day', order_date) AS day,
  product_category,
  COUNT(*) AS sales_count,
  SUM(total_amount) AS revenue
FROM analytics.orders
JOIN analytics.products USING (product_id)
GROUP BY ALL;

-- Finance: detailed with customer IDs, no PII
CREATE SECURE VIEW sharing.finance_metrics AS
SELECT
  order_id,
  customer_id,
  order_date,
  total_amount,
  discount_applied,
  net_revenue
FROM analytics.orders
WHERE status != 'CANCELLED';

-- Data science: raw data with masked PII
CREATE SECURE VIEW sharing.ds_orders AS
SELECT
  order_id,
  customer_id,
  order_date,
  total_amount,
  product_id,
  quantity
FROM analytics.orders;

-- 3. Create a share for each team
CREATE SHARE marketing_share;
GRANT USAGE ON DATABASE sales_db TO SHARE marketing_share;
GRANT USAGE ON SCHEMA sales_db.sharing TO SHARE marketing_share;
GRANT SELECT ON VIEW sales_db.sharing.marketing_sales TO SHARE marketing_share;

-- 4. Grant access to internal teams (not via share)
GRANT USAGE ON DATABASE sales_db TO ROLE marketing_role;
GRANT USAGE ON SCHEMA sales_db.sharing TO ROLE marketing_role;
GRANT SELECT ON VIEW sales_db.sharing.marketing_sales TO ROLE marketing_role;
```

---

## 13.3 Scenario 3: Performance Troubleshooting

### Problem
A dashboard query is running slowly (45 seconds instead of <2 seconds).

### Diagnosis

```sql
-- 1. Check the query profile
SELECT SYSTEM$EXPLAIN_JSON_FRONTEND('query_id_here');

-- 2. Look at recent query history
SELECT *
FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY())
WHERE QUERY_TYPE = 'SELECT'
  AND TOTAL_ELAPSED_TIME > 10000  -- > 10 seconds
ORDER BY START_TIME DESC;

-- 3. Check bytes scanned (too much data?)
SELECT *
FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY())
WHERE QUERY_ID = 'specific_slow_query';

-- 4. Check warehouse size and concurrency
SHOW WAREHOUSES LIKE 'bi_wh';
```

### Common Issues and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| High bytes scanned | No pruning | Add WHERE on date/clustered column |
| High remote spill | Warehouse too small | Increase warehouse size |
| Full table scan on large table | No clustering key | Add clustering on filter column |
| Slow JOIN | Large table joined without filter | Filter first, then join |
| Variable performance | Other queries on same warehouse | Use separate warehouse |

---

## 13.4 Scenario 4: Cost Overrun Response

### Problem
Monthly Snowflake bill doubled unexpectedly.

### Diagnosis

```sql
-- 1. Compare month-over-month warehouse usage
SELECT
  DATE_TRUNC('day', START_TIME) AS day,
  WAREHOUSE_NAME,
  SUM(CREDITS_USED) AS credits
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE START_TIME >= DATEADD('days', -30, CURRENT_TIMESTAMP)
GROUP BY day, WAREHOUSE_NAME
ORDER BY day;

-- 2. Check for warehouses without auto-suspend
SHOW WAREHOUSES;

-- 3. Find most expensive queries
SELECT
  QUERY_TEXT,
  WAREHOUSE_NAME,
  CREDITS_USED_CLOUD_SERVICES,
  TOTAL_ELAPSED_TIME / 1000 AS seconds
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE START_TIME >= DATEADD('days', -7, CURRENT_TIMESTAMP)
ORDER BY CREDITS_USED_CLOUD_SERVICES DESC
LIMIT 20;

-- 4. Check storage increase
SELECT
  USAGE_DATE,
  STORAGE_BYTES / 1099511627776 AS storage_tb
FROM SNOWFLAKE.ACCOUNT_USAGE.STORAGE_USAGE
ORDER BY USAGE_DATE DESC;
```

### Fixes

```sql
-- 1. Set aggressive auto-suspend
ALTER WAREHOUSE dev_wh SET AUTO_SUSPEND = 60;

-- 2. Create resource monitor
CREATE RESOURCE MONITOR monthly_budget
  CREDIT_QUOTA = 500
  FREQUENCY = MONTHLY
  TRIGGERS ON 80% DO NOTIFY ON 100% DO SUSPEND;

-- 3. Reduce Time Travel
ALTER DATABASE sales_db SET DATA_RETENTION_TIME_IN_DAYS = 1;

-- 4. Drop unused clones
DROP DATABASE IF EXISTS sales_dev_backup_old;

-- 5. Set up cost alerts
CREATE ALERT cost_alert
  WAREHOUSE = admin_wh
  SCHEDULE = '1 HOUR'
IF (
  SELECT SUM(CREDITS_USED)
  FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
  WHERE START_TIME >= DATEADD('hours', -1, CURRENT_TIMESTAMP)
) > 50
THEN
  CALL SYSTEM$SEND_EMAIL('email_alert', 'admin@co.com',
    'Cost Alert', 'High credit usage detected');
```

---

## 13.5 Scenario 5: Data Migration from Legacy DB

### Problem
Migrate an on-premises PostgreSQL database to Snowflake.

### Strategy

```sql
-- 1. Export from PostgreSQL to CSV/Parquet
-- pg_dump --data-only --format=custom ... > export.dump

-- 2. Create Snowflake tables matching source schema
CREATE TABLE raw.legacy_customers (
  customer_id INTEGER,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  signup_date DATE,
  status VARCHAR(20),
  notes VARCHAR(1000),
  legacy_id VARCHAR(50)
);

-- 3. Stage the exported files
-- PUT file://export/customers.csv @migration_stage;
-- PUT file://export/orders.csv @migration_stage;

-- 4. Load with error handling
COPY INTO raw.legacy_customers
FROM @migration_stage/customers.csv
FILE_FORMAT = csv_format
ON_ERROR = 'CONTINUE';

-- 5. Validate data quality
SELECT
  COUNT(*) AS total,
  COUNT(DISTINCT customer_id) AS unique_customers,
  COUNT(*) FILTER (WHERE email IS NULL) AS missing_emails
FROM raw.legacy_customers;

-- 6. Transform to production schema
INSERT INTO raw.customers
SELECT
  customer_id,
  first_name,
  last_name,
  email,
  signup_date,
  status,
  CURRENT_TIMESTAMP AS migrated_at
FROM raw.legacy_customers;
```

---

## 13.6 Scenario 6: Real-Time Alerting

### Problem
Set up real-time alerts when unusual patterns are detected in streaming data.

### Solution

```sql
-- 1. Create a table for anomaly detection
CREATE TABLE raw.anomaly_events (
  event_id INTEGER AUTOINCREMENT,
  metric_name VARCHAR(100),
  metric_value FLOAT,
  event_timestamp TIMESTAMP_NTZ,
  entity_id VARCHAR(100)
);

-- 2. Create stream
CREATE STREAM raw.anomaly_stream ON TABLE raw.anomaly_events;

-- 3. Create alerting table
CREATE TABLE admin.alerts (
  alert_id INTEGER AUTOINCREMENT,
  alert_type VARCHAR(100),
  alert_message VARCHAR(500),
  severity VARCHAR(20),
  entity_id VARCHAR(100),
  metric_value FLOAT,
  threshold FLOAT,
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Task to detect anomalies
CREATE TASK detect_anomalies
  WAREHOUSE = etl_wh
  SCHEDULE = '1 MINUTE'
WHEN SYSTEM$STREAM_HAS_DATA('raw.anomaly_stream')
AS
  INSERT INTO admin.alerts (alert_type, alert_message, severity,
    entity_id, metric_value, threshold)
  SELECT
    'High Value',
    metric_name || ' exceeded threshold on ' || entity_id,
    CASE
      WHEN metric_value > 1000 THEN 'CRITICAL'
      WHEN metric_value > 500 THEN 'HIGH'
      ELSE 'WARNING'
    END,
    entity_id,
    metric_value,
    100 AS threshold
  FROM raw.anomaly_stream
  WHERE metric_value > 100;
```

---

## 13.7 Scenario 7: Multi-Environment Setup

### Problem
Set up DEV, STAGING, and PROD environments in Snowflake with proper data isolation.

### Solution

```sql
-- Development environment (clone of prod, 0-day Time Travel)
CREATE DATABASE dev_db CLONE prod_db;
ALTER DATABASE dev_db SET DATA_RETENTION_TIME_IN_DAYS = 0;
CREATE WAREHOUSE dev_wh
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60;

-- Staging (refreshed periodically, 1-day Time Travel)
CREATE DATABASE staging_db;
ALTER DATABASE staging_db SET DATA_RETENTION_TIME_IN_DAYS = 1;
-- Refresh staging from prod:
-- CREATE OR REPLACE DATABASE staging_db CLONE prod_db;

-- Production (full protection)
CREATE DATABASE prod_db;
ALTER DATABASE prod_db SET DATA_RETENTION_TIME_IN_DAYS = 30;
CREATE WAREHOUSE prod_wh
  WAREHOUSE_SIZE = 'MEDIUM'
  AUTO_SUSPEND = 300;

-- Role separation
CREATE ROLE dev_role;
CREATE ROLE staging_role;
CREATE ROLE prod_readonly;

-- Grant appropriate access for each environment
GRANT USAGE ON DATABASE dev_db TO ROLE dev_role;
GRANT ALL PRIVILEGES ON SCHEMA dev_db.public TO ROLE dev_role;
```

---

## 📚 Additional Resources

- [Snowflake Patterns & Best Practices](https://docs.snowflake.com/en/user-guide/patterns)
- [Loading Best Practices](https://docs.snowflake.com/en/user-guide/data-load-considerations)
- [Performance Optimization Guide](https://docs.snowflake.com/en/user-guide/performance-query)
- [Cost Management Best Practices](https://docs.snowflake.com/en/user-guide/cost-management)
