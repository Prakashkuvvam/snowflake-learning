---
title: "Example Projects"
weight: 60
---
# Example Projects: Snowflake

{{< hint info >}}
Real-world Snowflake project examples to study and adapt for your own use cases.
{{< /hint >}}

## Example 1: E-Commerce Analytics Pipeline

**Scenario:** An e-commerce company needs to analyze customer behavior, sales trends, and inventory levels.

### Architecture

```
OLTP Database → Snowpipe (Continuous Ingestion) → Raw Tables
                                                     ↓
                                              Stream + Task
                                                     ↓
                                           Clean Tables (ELT)
                                                     ↓
                                        Analytics Views / Materialized Views
                                                     ↓
                                              BI Tool (Tableau)
```

### Implementation

```sql
-- Raw data tables
CREATE DATABASE ecommerce;
CREATE SCHEMA ecommerce.raw;

CREATE TABLE ecommerce.raw.orders (
  order_id STRING,
  customer_id STRING,
  order_ts TIMESTAMP,
  total_amount DECIMAL(10,2),
  status STRING,
  items VARIANT
);

CREATE TABLE ecommerce.raw.customers (
  customer_id STRING,
  name STRING,
  email STRING,
  signup_date DATE,
  tier STRING
);

-- Transformation layer
CREATE SCHEMA ecommerce.analytics;

CREATE VIEW ecommerce.analytics.daily_sales AS
SELECT
  DATE(order_ts) AS sale_date,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM ecommerce.raw.orders
WHERE status = 'COMPLETED'
GROUP BY DATE(order_ts);

CREATE VIEW ecommerce.analytics.top_customers AS
SELECT
  c.customer_id,
  c.name,
  c.tier,
  COUNT(o.order_id) AS total_orders,
  SUM(o.total_amount) AS lifetime_value,
  RANK() OVER (ORDER BY SUM(o.total_amount) DESC) AS rank
FROM ecommerce.raw.customers c
JOIN ecommerce.raw.orders o ON c.customer_id = o.customer_id
WHERE o.status = 'COMPLETED'
GROUP BY c.customer_id, c.name, c.tier;
```

**Key takeaways:**
- Use Snowpipe for continuous ingestion from S3
- Separate raw and analytics schemas
- Use views for transformations (or dynamic tables for automation)
- Track costs with ACCOUNT_USAGE views

---

## Example 2: Data Engineering Lakehouse

**Scenario:** A data team maintains a data lake on S3 and uses Snowflake for structured analytics.

### Architecture

```
S3 Data Lake (Parquet) → External Stage → COPY INTO (Incremental)
                                               ↓
                                        External Tables
                                               ↓
                                        CTAS Transformations
                                               ↓
                                        Consumption Layer
```

### Implementation

```sql
-- External stage pointing to S3
CREATE STAGE s3_data_lake
  URL = 's3://company-data-lake/sales/'
  CREDENTIALS = (AWS_KEY_ID = '...' AWS_SECRET_KEY = '...');

-- File format for Parquet
CREATE FILE FORMAT parquet_format
  TYPE = PARQUET;

-- External table over S3 data
CREATE EXTERNAL TABLE sales_ext
  WITH LOCATION = @s3_data_lake
  FILE_FORMAT = parquet_format;

-- Transform into structured table
CREATE TABLE analytics.sales_clean AS
SELECT
  value:order_id::STRING AS order_id,
  value:customer_id::STRING AS customer_id,
  value:amount::DECIMAL(10,2) AS amount,
  value:order_date::DATE AS order_date,
  value:product_category::STRING AS category
FROM sales_ext;
```

**Key takeaways:**
- External tables query data directly in cloud storage
- Parquet format provides columnar performance
- Use CTAS (CREATE TABLE AS) for ELT transformations

---

## Example 3: Real-Time Analytics with Snowpipe + Streams

**Scenario:** A SaaS company needs near real-time dashboards on user activity.

### Architecture

```
Application → Event Stream (JSON) → S3 Bucket
                                         ↓
                                   Snowpipe
                                         ↓
                                Raw Events Table
                                         ↓
                                Stream on Events
                                         ↓
                                Task (every 1 min)
                                         ↓
                              Aggregated Metrics Table
                                         ↓
                                Dashboard (Snowsight)
```

### Implementation

```sql
-- Pipe for continuous ingestion
CREATE PIPE event_pipe
  AUTO_INGEST = TRUE
AS
  COPY INTO raw.user_events
  FROM @event_stage
  FILE_FORMAT = json_format;

-- Stream for CDC
CREATE STREAM event_stream ON TABLE raw.user_events;

-- Aggregation task
CREATE TASK aggregate_events
  WAREHOUSE = analytics_wh
  SCHEDULE = '1 MINUTE'
WHEN
  SYSTEM$STREAM_HAS_DATA('event_stream')
AS
  MERGE INTO analytics.daily_metrics t
  USING (
    SELECT
      event_data:event_type::STRING AS event_type,
      COUNT(*) AS event_count,
      CURRENT_DATE AS metric_date
    FROM event_stream
    GROUP BY event_data:event_type::STRING
  ) s ON t.event_type = s.event_type AND t.metric_date = s.metric_date
  WHEN MATCHED THEN UPDATE SET event_count = t.event_count + s.event_count
  WHEN NOT MATCHED THEN INSERT (event_type, metric_date, event_count)
    VALUES (s.event_type, s.metric_date, s.event_count);
```

**Key takeaways:**
- Snowpipe + streams + tasks = fully automated pipeline
- MERGE handles incremental upserts
- Schedule tasks appropriately for your latency requirements

---

## Example 4: Data Sharing with External Partners

**Scenario:** A financial services company shares anonymized market data with research partners.

### Implementation

```sql
-- Create a secure view for sharing
CREATE SECURE VIEW shared.market_summary AS
SELECT
  ticker,
  date,
  open,
  close,
  volume
FROM analytics.market_data
WHERE is_anonymized = TRUE;

-- Create a share
CREATE SHARE market_data_share;

-- Grant usage
GRANT USAGE ON DATABASE shared_db TO SHARE market_data_share;
GRANT USAGE ON SCHEMA shared_db.shared TO SHARE market_data_share;
GRANT SELECT ON VIEW shared_db.shared.market_summary TO SHARE market_data_share;

-- Add accounts to the share
ALTER SHARE market_data_share
  SET ACCOUNTS = PARTNER_ACCOUNT_LOCATOR;
```

**Key takeaways:**
- Secure views protect sensitive data definitions
- Shares provide read-only access without copying data
- Reader accounts allow non-Snowflake users to access shares

---

## Example 5: Cost Optimization Strategy

**Scenario:** A growing startup needs to control Snowflake costs without sacrificing performance.

### Implementation

```sql
-- Set warehouse auto-suspend aggressively
ALTER WAREHOUSE analytics_wh
  SET AUTO_SUSPEND = 60;

-- Set resource monitors
CREATE RESOURCE MONITOR monthly_budget
  WITH
    CREDIT_QUOTA = 500
    FREQUENCY = MONTHLY
    START_TIMESTAMP = '2024-01-01 00:00:00'
    TRIGGERS ON 80 PERCENT DO NOTIFY
             ON 90 PERCENT DO NOTIFY
             ON 100 PERCENT DO SUSPEND;

ALTER WAREHOUSE analytics_wh
  SET RESOURCE_MONITOR = monthly_budget;

-- Monitor storage costs
SELECT
  OBJECT_DATABASE,
  OBJECT_SCHEMA,
  OBJECT_NAME,
  OBJECT_TYPE,
  BYTES / 1099511627776 AS storage_gb
FROM SNOWFLAKE.ACCOUNT_USAGE.TABLE_STORAGE_METRICS
WHERE OBJECT_TYPE = 'TABLE'
ORDER BY storage_gb DESC;
```

**Key takeaways:**
- Auto-suspend is the #1 cost saver
- Resource monitors prevent bill shock
- Regularly review storage usage for orphaned tables
- Use ACCOUNT_USAGE views for cost tracking
