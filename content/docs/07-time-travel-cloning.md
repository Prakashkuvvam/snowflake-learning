---
title: "Chapter 6: Time Travel & Cloning"
weight: 7
bookFlatSection: false
bookToc: true
---

# Chapter 6: Time Travel & Cloning

## 🎯 Learning Objectives

- Query historical data using Time Travel
- Restore dropped/accidentally modified tables
- Understand Fail-safe and its limitations
- Use zero-copy cloning for testing and development
- Clone databases, schemas, and tables

---

## 6.1 Time Travel Overview

**Time Travel** allows you to access and query historical versions of your data within a configurable retention period.

```
                    Now
                     │
    ┌────────────────▼────────────────┐
    │      Time Travel Window          │
    │  (0 to 90 days, configurable)   │
    │                                  │
    │  AT => Query at a point in time  │
    │  BEFORE => Query before an action│
    │  OFFSET => Query N seconds ago   │
    └────────────────┬─────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │         Fail-safe               │
    │   (7 days, Snowflake-managed)   │
    │   Not queryable by user         │
    └─────────────────────────────────┘
```

### Time Travel Retention Periods

| Edition | Default Retention | Max Retention |
|---------|------------------|---------------|
| Standard | 1 day | 1 day |
| Enterprise | 1 day | 90 days |
| Business Critical | 1 day | 90 days |
| Virtual Private | 1 day | 90 days |

---

## 6.2 Querying Historical Data

### AT and BEFORE Clauses

```sql
-- AT: Query at a specific point in time
-- Using timestamp
SELECT * FROM orders
  AT (TIMESTAMP => '2024-06-15 10:30:00'::TIMESTAMP);

-- Using offset (seconds ago)
SELECT * FROM orders
  AT (OFFSET => -3600);  -- 1 hour ago

-- Using statement ID
SELECT * FROM orders
  AT (STATEMENT => '0190abcd-1234-5678-9abc-def012345678');

-- BEFORE: Query before an action
-- Using timestamp
SELECT * FROM orders
  BEFORE (TIMESTAMP => '2024-06-15 11:00:00'::TIMESTAMP);

-- Using statement
SELECT * FROM orders
  BEFORE (STATEMENT => '0190abcd-1234-5678-9abc-def012345678');
```

### Practical Time Travel Examples

```sql
-- 1. Compare current data with yesterday's data
WITH yesterday AS (
  SELECT *
  FROM orders
  AT (OFFSET => -86400)
)
SELECT
  COALESCE(y.order_id, o.order_id) AS order_id,
  y.status AS old_status,
  o.status AS new_status
FROM orders o
FULL OUTER JOIN yesterday y ON o.order_id = y.order_id
WHERE y.status IS DISTINCT FROM o.status;

-- 2. Find what changed in the last hour
SELECT *
FROM orders
AT (OFFSET => -3600)
MINUS
SELECT *
FROM orders;  -- current version minus historical = what was deleted/changed

-- 3. Check data before a specific load
SELECT COUNT(*), SUM(total_amount)
FROM orders
BEFORE (STATEMENT => '0190abcd-1234-5678-9abc-def012345678');
```

---

## 6.3 Restoring Data

### Undrop Objects

```sql
-- Undrop a table (restores from Time Travel)
DROP TABLE orders;
UNDROP TABLE orders;

-- Undrop a schema (restores all tables within)
DROP SCHEMA analytics;
UNDROP SCHEMA analytics;

-- Undrop a database
DROP DATABASE sales_db;
UNDROP DATABASE sales_db;
```

### Restore to a Point in Time

```sql
-- Option 1: Clone from a specific time
CREATE TABLE orders_restored CLONE orders
  AT (OFFSET => -3600);

-- Option 2: Swap restored data into place
CREATE TABLE orders_recovery CLONE orders
  AT (TIMESTAMP => '2024-06-15 10:00:00'::TIMESTAMP);

ALTER TABLE orders RENAME TO orders_corrupted;
ALTER TABLE orders_recovery RENAME TO orders;

-- Option 3: Use INSERT to merge specific rows
INSERT INTO orders
SELECT * FROM orders
  AT (OFFSET => -7200)
WHERE order_id NOT IN (SELECT order_id FROM orders);
```

### Setting Retention Period

```sql
-- Set Time Travel retention on a table
ALTER TABLE orders
  SET DATA_RETENTION_TIME_IN_DAYS = 30;

-- Set at schema level (inherited by new tables)
ALTER SCHEMA sales_db.analytics
  SET DATA_RETENTION_TIME_IN_DAYS = 15;

-- Set at database level
ALTER DATABASE sales_db
  SET DATA_RETENTION_TIME_IN_DAYS = 7;

-- Minimize retention for transient data (reduces storage cost)
ALTER TABLE staging.temp_events
  SET DATA_RETENTION_TIME_IN_DAYS = 0;
```

---

## 6.4 Fail-safe

**Fail-safe** is a 7-day period after Time Travel where Snowflake stores data for disaster recovery. Unlike Time Travel, you **cannot query** data in Fail-safe — it's only for Snowflake to recover data in extreme scenarios.

| Feature | Time Travel | Fail-safe |
|---------|-------------|-----------|
| Duration | Configurable (0-90 days) | 7 days (fixed) |
| Queryable | ✅ Yes | ❌ No |
| User-Controlled | ✅ Yes | ❌ No (Snowflake-managed) |
| Storage Cost | You pay | Snowflake covers |
| Use Case | Self-service recovery | Disaster recovery only |

> **Key insight:** To recover data from Fail-safe, you must contact Snowflake Support. It's an emergency process, not a backup strategy.

---

## 6.5 Zero-Copy Cloning

**Zero-copy cloning** creates a copy of a database, schema, or table that shares the underlying storage with the original — no data is physically copied until changes are made (copy-on-write).

```sql
-- Clone a table (instant, no data copy)
CREATE TABLE orders_dev CLONE orders;

-- Clone a schema
CREATE SCHEMA analytics_dev CLONE analytics;

-- Clone an entire database
CREATE DATABASE sales_dev CLONE sales_db;
```

### How Zero-Copy Cloning Works

```
Original table: orders (100 GB)
        │
        ├── Clone command (instant)
        │
        ▼
orders (original) ────┬──── Shared Storage ──── orders_clone
                      │        (100 GB)
                      │
                      ▼
             When you INSERT into orders_clone:
             New data written = 1 MB
             Order clone now = 100 GB (shared) + 1 MB (new)
```

### Practical Clone Use Cases

```sql
-- 1. Development/testing
CREATE DATABASE sales_dev CLONE sales_db;
-- Developers can experiment without affecting production

-- 2. Refresh staging from production
CREATE OR REPLACE DATABASE staging CLONE sales_db;
-- WARNING: This drops the current staging database!

-- 3. Create a point-in-time backup
CREATE DATABASE sales_backup_20240615 CLONE sales_db
  AT (TIMESTAMP => '2024-06-15 23:59:59'::TIMESTAMP);

-- 4. Testing schema changes
CREATE SCHEMA analytics_test CLONE analytics;
-- Apply migrations to analytics_test, validate, then apply to analytics

-- 5. Create read-only snapshot for reporting
CREATE DATABASE sales_reporting CLONE sales_db;
GRANT USAGE ON DATABASE sales_reporting TO ROLE reporting_user;
-- Report users get a consistent snapshot
```

### Cloning with Time Travel

```sql
-- Clone as of a specific time
CREATE TABLE orders_yesterday CLONE orders
  AT (OFFSET => -86400);

-- Clone before a specific DML operation
CREATE TABLE orders_before_update CLONE orders
  BEFORE (STATEMENT => '0190abcd-1234-5678-9abc-def012345678');

-- Clone from Fail-safe (requires Snowflake Support)
-- Not possible directly — contact support
```

---

## 6.6 Storage Costs for Time Travel and Cloning

| Feature | Storage Impact | Cost Consideration |
|---------|---------------|-------------------|
| Time Travel data | Additional storage for changed/deleted rows | Longer retention = more cost |
| Clones | No extra storage until changes made | Very cost-effective for dev/test |
| Clone with changes | Only new/changed data stored | Scales with data modified |

```sql
-- Monitor Time Travel storage
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.TABLE_STORAGE_METRICS
WHERE TABLE_NAME = 'ORDERS'
  AND TABLE_SCHEMA = 'RAW';

-- Clone storage: same as original until you modify the clone
```

---

## ✅ Chapter 6 Quiz

1. **What is the maximum Time Travel retention period for Enterprise edition?**
   - a) 1 day
   - b) 7 days
   - c) 30 days
   - d) 90 days

2. **Can you query data in Fail-safe?**
   - a) Yes, with SELECT
   - b) Yes, but only ACCOUNTADMIN
   - c) No, only Snowflake can access it
   - d) Yes, with special privileges

3. **What is zero-copy cloning?**
   - a) Cloning without copying any data at all
   - b) Cloning that shares storage until changes are made
   - c) Cloning that compresses data
   - d) Cloning that only copies metadata

4. **Which SQL command restores a dropped table?**
   - a) RESTORE TABLE
   - b) RECOVER TABLE
   - c) UNDROP TABLE
   - d) REVIVE TABLE

5. **True or False:** When you clone a 1 TB database, it immediately uses 1 TB of additional storage.

<details>
<summary>📌 Answers</summary>

1. **d** — Enterprise edition supports up to 90 days
2. **c** — Fail-safe is Snowflake-managed and not user-queryable
3. **b** — Zero-copy cloning shares underlying storage until modifications occur
4. **c** — UNDROP TABLE restores a dropped table
5. **False** — Zero-copy cloning shares storage; no additional storage is used until data is modified
</details>

---

## 📚 Additional Resources

- [Time Travel Documentation](https://docs.snowflake.com/en/user-guide/data-time-travel)
- [Fail-safe Documentation](https://docs.snowflake.com/en/user-guide/data-failsafe)
- [Zero-Copy Cloning](https://docs.snowflake.com/en/user-guide/object-clone)
- [UNDROP Command](https://docs.snowflake.com/en/sql-reference/sql/undrop-table)

---

*Next → [Chapter 7: Streams, Tasks & Pipelines]({{< relref "08-streams-tasks" >}})*
