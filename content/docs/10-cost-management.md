---
title: "Chapter 9: Cost Management"
weight: 10
bookFlatSection: false
bookToc: true
---

# Chapter 9: Cost Management

## 🎯 Learning Objectives

- Understand Snowflake's credit consumption model
- Monitor warehouse, storage, and serverless costs
- Configure auto-suspend and auto-resume for cost control
- Use ACCOUNT_USAGE views to track spending
- Implement cost-saving strategies

---

## 9.1 Understanding Snowflake Costs

Snowflake charges for three main categories:

```
Total Cost
├── Compute (~70-80%)
│   ├── Virtual Warehouses (per credit/hr)
│   ├── Serverless Features (per second)
│   │   ├── Snowpipe
│   │   ├── Tasks
│   │   ├── Materialized Views
│   │   ├── Clustering
│   │   ├── Search Optimization
│   │   └── Dynamic Tables
│   └── Cloud Services (metadata, up to 10% of daily credits)
│
├── Storage (~15-20%)
│   ├── Table Data (compressed size)
│   ├── Time Travel (changed/deleted data)
│   ├── Fail-safe (7 days, free for first 10 TB)
│   ├── Stages
│   └── Clones (shared until modified)
│
└── Cloud Services (< 10%) — waived if < 10% of daily compute
```

### Credit Consumption by Warehouse Size

| Size | Credits/Cluster/Hour | Cost/Hour (approximate) |
|------|---------------------|------------------------|
| X-Small | 1 | ~$2.00 |
| Small | 2 | ~$4.00 |
| Medium | 4 | ~$8.00 |
| Large | 8 | ~$16.00 |
| X-Large | 16 | ~$32.00 |
| 2X-Large | 32 | ~$64.00 |
| 3X-Large | 64 | ~$128.00 |
| 4X-Large | 128 | ~$256.00 |

> **Key insight:** An idle warehouse still consumes credits until auto-suspend kicks in. A MEDIUM warehouse left running for 24 hours costs ~$192 (24 × $8).

---

## 9.2 Monitoring Costs

### ACCOUNT_USAGE Views

```sql
-- Warehouse credit consumption (past 30 days)
SELECT
  WAREHOUSE_NAME,
  SUM(CREDITS_USED) AS total_credits,
  SUM(CREDITS_USED_COMPUTE) AS compute_credits,
  SUM(CREDITS_USED_CLOUD_SERVICES) AS cloud_services_credits
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE START_TIME >= DATEADD('days', -30, CURRENT_TIMESTAMP)
GROUP BY WAREHOUSE_NAME
ORDER BY total_credits DESC;

-- Daily warehouse usage
SELECT
  DATE(START_TIME) AS day,
  WAREHOUSE_NAME,
  SUM(CREDITS_USED) AS credits
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE START_TIME >= DATEADD('days', -30, CURRENT_TIMESTAMP)
GROUP BY day, WAREHOUSE_NAME
ORDER BY day;

-- Storage costs
SELECT
  USAGE_DATE,
  STORAGE_BYTES / 1099511627776 AS storage_tb,
  STAGE_BYTES / 1099511627776 AS stage_tb,
  FAILSAFE_BYTES / 1099511627776 AS failsafe_tb
FROM SNOWFLAKE.ACCOUNT_USAGE.STORAGE_USAGE
ORDER BY USAGE_DATE DESC;

-- Query-level cost
SELECT
  QUERY_ID,
  QUERY_TEXT,
  WAREHOUSE_NAME,
  CREDITS_USED_CLOUD_SERVICES,
  (CREDITS_USED_CLOUD_SERVICES * 2) AS estimated_cost  -- $2/credit average
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE START_TIME >= DATEADD('hours', -24, CURRENT_TIMESTAMP)
ORDER BY CREDITS_USED_CLOUD_SERVICES DESC;
```

### Cost Breakdown by User

```sql
-- Cost per user (last 7 days)
SELECT
  USER_NAME,
  COUNT(*) AS queries,
  SUM(CREDITS_USED_CLOUD_SERVICES) AS credits_used,
  AVG(TOTAL_ELAPSED_TIME) / 1000 AS avg_seconds
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE START_TIME >= DATEADD('days', -7, CURRENT_TIMESTAMP)
GROUP BY USER_NAME
ORDER BY credits_used DESC;
```

---

## 9.3 Auto-Suspend and Auto-Resume

```sql
-- Auto-suspend after 60 seconds (minimal idle cost)
CREATE WAREHOUSE cost_effective_wh
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60         -- Suspend after 60 seconds idle
  AUTO_RESUME = TRUE        -- Auto-start on next query
  INITIALLY_SUSPENDED = TRUE;

-- Auto-suspend after 5 minutes (good balance)
ALTER WAREHOUSE analytics_wh
  SET AUTO_SUSPEND = 300;

-- Auto-suspend after 1 hour (keep warm for consistent performance)
ALTER WAREHOUSE bi_wh
  SET AUTO_SUSPEND = 3600;

-- Never auto-suspend (use only for critical production workloads)
ALTER WAREHOUSE prod_wh
  SET AUTO_SUSPEND = NULL;  -- Never suspend
```

### Cost Savings from Auto-Suspend

| Scenario | Warehouse Size | Daily Cost (no suspend) | Daily Cost (60s suspend, assuming 8hr active) |
|----------|---------------|------------------------|----------------------------------------------|
| Development | X-Small | ~$48 | ~$16 |
| Analytics | Medium | ~$192 | ~$64 |
| ETL | Large | ~$384 | ~$128 |

---

## 9.4 Serverless Feature Costs

These features use Snowflake-managed compute and are billed per second:

```sql
-- Snowpipe cost
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.PIPE_USAGE_HISTORY
ORDER BY START_TIME DESC;

-- Automatic clustering cost
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.AUTOMATIC_CLUSTERING_HISTORY
ORDER BY START_TIME DESC;

-- Materialized view maintenance cost
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.MATERIALIZED_VIEW_REFRESH_HISTORY
ORDER BY START_TIME DESC;

-- Search optimization cost
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.SEARCH_OPTIMIZATION_HISTORY
ORDER BY START_TIME DESC;

-- Task cost
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.TASK_HISTORY
ORDER BY SCHEDULED_TIME DESC;

-- Dynamic table refresh cost
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.DYNAMIC_TABLE_REFRESH_HISTORY
ORDER BY REFRESH_TIME DESC;
```

---

## 9.5 Storage Cost Management

### Time Travel Storage

```sql
-- Minimize Time Travel for transient tables
ALTER TABLE staging.temp_data
  SET DATA_RETENTION_TIME_IN_DAYS = 0;  -- No Time Travel

-- Only keep what you need
ALTER TABLE raw.events
  SET DATA_RETENTION_TIME_IN_DAYS = 1;  -- 1 day for raw data

ALTER TABLE analytics.customer_summary
  SET DATA_RETENTION_TIME_IN_DAYS = 30; -- 30 days for critical data
```

### Storage Optimization

```sql
-- Check storage by table
SELECT
  TABLE_NAME,
  TABLE_SCHEMA,
  TABLE_CATALOG AS database_name,
  ACTIVE_BYTES / 1099511627776 AS active_tb,
  TIME_TRAVEL_BYTES / 1099511627776 AS time_travel_tb,
  FAILSAFE_BYTES / 1099511627776 AS failsafe_tb,
  IS_TRANSIENT,
  IS_TEMPORARY
FROM SNOWFLAKE.ACCOUNT_USAGE.TABLE_STORAGE_METRICS
ORDER BY ACTIVE_BYTES DESC;

-- Remove unused tables
DROP TABLE IF EXISTS outdated_analytics;

-- Clone cleanup (clones share storage but still count for billing)
SHOW DATABASES;
DROP DATABASE IF EXISTS sales_dev_backup;
```

---

## 9.6 Cost-Saving Strategies

### Quick Wins

```sql
-- 1. Set auto-suspend to 60 seconds on all non-production warehouses
ALTER WAREHOUSE dev_wh SET AUTO_SUSPEND = 60;

-- 2. Use X-Small for development
CREATE WAREHOUSE dev_wh
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60;

-- 3. Reduce Time Travel retention
ALTER DATABASE sales_db
  SET DATA_RETENTION_TIME_IN_DAYS = 1;

-- 4. Use transient tables for staging data
CREATE TRANSIENT TABLE staging.intermediate AS
SELECT * FROM raw.orders WHERE ...;
```

### Strategic Approaches

| Strategy | Savings | Effort |
|----------|---------|--------|
| Set auto-suspend aggressively | 40-60% | Low |
| Right-size warehouses | 20-40% | Low |
| Use X-Small for development | 90% vs Large | Low |
| Reduce Time Travel retention | 10-30% storage | Low |
| Use transient tables | 20-40% storage | Low |
| Monitor and kill runaway queries | Variable | Medium |
| Schedule warehouses to match workload | 30-50% | Medium |
| Use materialized views strategically | Variable | Medium |
| Review and drop unused objects | 5-15% | Medium |
| Implement resource monitors | Variable | High |

### Resource Monitors

```sql
-- Create a resource monitor for a warehouse
CREATE RESOURCE MONITOR weekly_limit
  WITH
    CREDIT_QUOTA = 1000
    FREQUENCY = WEEKLY
    START_TIMESTAMP = '2024-01-01 00:00:00'
    TRIGGERS
      ON 80% DO NOTIFY
      ON 100% DO SUSPEND
      ON 110% DO SUSPEND_IMMEDIATE;

-- Apply to a warehouse
ALTER WAREHOUSE analytics_wh
  SET RESOURCE_MONITOR = weekly_limit;

-- Apply to the account (default for all warehouses)
ALTER ACCOUNT
  SET RESOURCE_MONITOR = weekly_limit;
```

### Setting Alerts

```sql
-- Create a custom alert for unusual spending
CREATE OR REPLACE TASK daily_cost_check
  WAREHOUSE = admin_wh
  SCHEDULE = 'USING CRON 0 8 * * * UTC'
AS
  INSERT INTO admin.cost_alerts
  SELECT
    CURRENT_DATE AS alert_date,
    'High warehouse cost detected' AS message,
    WAREHOUSE_NAME,
    CREDITS_USED
  FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
  WHERE DATE(START_TIME) = CURRENT_DATE
    AND CREDITS_USED > 50;
```

---

## 9.7 Cost Management Best Practices

| Practice | Implementation |
|----------|---------------|
| **Auto-suspend everything** | 60 seconds for dev, 5-10 min for production |
| **Right-size warehouses** | Start X-Small, scale up only as needed |
| **Separate workloads** | Different warehouses for ETL, BI, ad-hoc |
| **Use resource monitors** | Alert and suspend on credit limits |
| **Monitor weekly** | Review ACCOUNT_USAGE views weekly |
| **Reduce Time Travel** | Keep 1 day for raw data, 0 for transient |
| **Clean up clones** | Remove test/dev databases after use |
| **Use Serverless wisely** | Monitor Snowpipe, tasks, clustering costs |
| **Compress data in stages** | Smaller files = faster loads = less compute |
| **Kill runaway queries** | Use SYSTEM$CANCEL_QUERY for long-running queries |

---

## ✅ Chapter 9 Quiz

1. **What is the most significant cost driver in Snowflake?**
   - a) Storage
   - b) Compute (warehouses)
   - c) Cloud Services
   - d) Data transfer

2. **How many credits does a Medium warehouse consume per hour?**
   - a) 2
   - b) 4
   - c) 8
   - d) 16

3. **What does a resource monitor do?**
   - a) Monitors query performance
   - b) Tracks and limits credit consumption
   - c) Monitors disk space
   - d) Tracks user logins

4. **What is the recommended auto-suspend setting for development warehouses?**
   - a) Never suspend
   - b) 60 seconds
   - c) 60 minutes
   - d) 24 hours

5. **True or False:** Cloud Services costs are always waived.

<details>
<summary>📌 Answers</summary>

1. **b** — Compute (warehouse usage) is typically 70-80% of total costs
2. **b** — Medium = 4 credits per hour
3. **b** — Resource monitors track and trigger actions based on credit limits
4. **b** — 60 seconds auto-suspend for development to minimize idle cost
5. **False** — Cloud services costs are waived only if they're < 10% of daily compute
</details>

---

## 📚 Additional Resources

- [Understanding Cost](https://docs.snowflake.com/en/user-guide/cost-understanding)
- [Warehouse Cost Control](https://docs.snowflake.com/en/user-guide/warehouses-considerations)
- [Resource Monitors](https://docs.snowflake.com/en/user-guide/resource-monitors)
- [ACCOUNT_USAGE Views](https://docs.snowflake.com/en/sql-reference/account-usage)

---

*Next → [Chapter 10: Snowpark & Advanced Features]({{< relref "11-snowpark-advanced" >}})*
