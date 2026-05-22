---
title: "Chapter 7: Streams, Tasks & Pipelines"
weight: 8
bookFlatSection: false
bookToc: true
---

# Chapter 7: Streams, Tasks & Pipelines

## 🎯 Learning Objectives

- Create and use streams for change data capture (CDC)
- Schedule SQL execution with tasks
- Build task DAGs (directed acyclic graphs)
- Monitor and troubleshoot data pipelines
- Handle error scenarios in automated pipelines

---

## 7.1 Streams: Change Data Capture

A **stream** records row-level DML changes (INSERT, UPDATE, DELETE) on a table, enabling incremental processing.

### How Streams Work

```
Time →  Row inserted → Row updated → Row deleted
          │               │             │
          ▼               ▼             ▼
    ┌──────────────────────────────────────┐
    │           Stream Object              │
    │                                      │
    │  Row 1: INSERT (before image)        │
    │  Row 1: UPDATE (after image)         │
    │  Row 1: DELETE (before image)        │
    │                                      │
    │  Metadata columns:                   │
    │  - METADATA$ACTION: INSERT/UPDATE/DELETE
    │  - METADATA$ISUPDATE: TRUE/FALSE     │
    │  - METADATA$ROW_ID: unique row ID    │
    └──────────────────────────────────────┘
```

### Creating and Using Streams

```sql
-- Create a stream on a table
CREATE STREAM customer_stream ON TABLE raw.customers;

-- Create a stream with append-only mode (better performance)
CREATE STREAM order_stream ON TABLE raw.orders
  SHOW_INITIAL_ROWS = TRUE;

-- Check stream contents (shows only new/changed rows since last read)
SELECT *
FROM customer_stream;

-- Sample stream output:
-- CUSTOMER_ID | FIRST_NAME | STATUS | METADATA$ACTION | METADATA$ISUPDATE | METADATA$ROW_ID
-- ------------+------------+--------+-----------------+-------------------+-------------------
--        101  | Alice      | ACTIVE | INSERT          | FALSE             | abc123
--        102  | Bob        | ACTIVE | INSERT          | FALSE             | def456
--        103  | Charlie    | ACTIVE | INSERT          | FALSE             | ghi789
```

### Stream Metadata Columns

| Column | Description | Possible Values |
|--------|-------------|-----------------|
| `METADATA$ACTION` | Type of DML operation | `INSERT`, `DELETE` |
| `METADATA$ISUPDATE` | Whether the row is an update | `TRUE` (UPDATE), `FALSE` (INSERT/DELETE) |
| `METADATA$ROW_ID` | Unique identifier for the row | UUID string |

> **Note:** UPDATE is shown as a DELETE (old row) + INSERT (new row) in the stream.

### Processing a Stream

```sql
-- On first read, stream shows ALL rows (if SHOW_INITIAL_ROWS = TRUE)
-- After read, stream is consumed (empty until new DML)

-- Consume stream: read and process changes
CREATE TABLE staging.processed_customers AS
SELECT
  customer_id,
  first_name,
  last_name,
  email,
  METADATA$ACTION AS change_type
FROM customer_stream;

-- After this SELECT, the stream is empty
-- Subsequent DML on base table will appear in the stream
```

---

## 7.2 Tasks: Scheduling SQL Execution

**Tasks** run SQL or stored procedures on a schedule or based on other tasks completing.

### Basic Task

```sql
-- Create a warehouse for the task
CREATE WAREHOUSE task_wh
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE;

-- Create a scheduled task
CREATE TASK process_orders
  WAREHOUSE = task_wh
  SCHEDULE = '5 MINUTE'
AS
  INSERT INTO analytics.daily_orders
  SELECT
    order_id,
    customer_id,
    order_date,
    total_amount,
    CURRENT_TIMESTAMP AS processed_at
  FROM raw.orders
  WHERE order_date >= DATEADD('hours', -1, CURRENT_TIMESTAMP);

-- Start the task
ALTER TASK process_orders RESUME;

-- Stop the task
ALTER TASK process_orders SUSPEND;
```

### Task Scheduling Options

```sql
-- Run every 5 minutes
CREATE TASK every_5_min
  WAREHOUSE = task_wh
  SCHEDULE = '5 MINUTE'
AS ...

-- Run every hour
CREATE TASK hourly_task
  WAREHOUSE = task_wh
  SCHEDULE = '60 MINUTE'
AS ...

-- Run using CRON expression
CREATE TASK daily_at_midnight
  WAREHOUSE = task_wh
  SCHEDULE = 'USING CRON 0 0 * * * UTC'
AS ...

-- CRON format: minute hour day-of-month month day-of-week
-- Examples:
-- 'USING CRON 0 9 * * 1-5 America/New_York'   -- Weekdays at 9 AM ET
-- 'USING CRON 0 */2 * * * UTC'                 -- Every 2 hours
-- 'USING CRON 0 0 1 * * UTC'                   -- First day of month
```

---

## 7.3 Task DAGs: Multi-Step Pipelines

**Task DAGs** chain tasks together so they run in a specific order:

```
┌─────────────────────────────────────────────────────┐
│                   Task DAG                           │
│                                                      │
│  load_customers ──► transform_customers ──► load_analytics │
│       │                                                    │
│       └──► load_orders ──► transform_orders ──►───────────┘
│                                                      │
│  daily_cleanup (runs after all above) ◄──────────────┘
└─────────────────────────────────────────────────────┘
```

```sql
-- Task 1: Root task (scheduled)
CREATE TASK load_raw_data
  WAREHOUSE = task_wh
  SCHEDULE = '10 MINUTE'
AS
  INSERT INTO raw.customers
  SELECT $1, $2, $3, $4, $5
  FROM @data_stage/customers.csv
  FILE_FORMAT = csv_format;

-- Task 2: Runs after Task 1 succeeds
CREATE TASK transform_customers
  WAREHOUSE = task_wh
  AFTER load_raw_data
AS
  MERGE INTO staging.clean_customers t
  USING (
    SELECT
      customer_id,
      INITCAP(first_name) AS first_name,
      INITCAP(last_name) AS last_name,
      LOWER(email) AS email,
      CURRENT_TIMESTAMP AS processed_at
    FROM raw.customers
    WHERE customer_id IS NOT NULL
  ) s ON t.customer_id = s.customer_id
  WHEN MATCHED THEN UPDATE SET
    first_name = s.first_name,
    last_name = s.last_name,
    email = s.email,
    processed_at = s.processed_at
  WHEN NOT MATCHED THEN INSERT
    (customer_id, first_name, last_name, email, processed_at)
    VALUES (s.customer_id, s.first_name, s.last_name, s.email, s.processed_at);

-- Task 3: Runs after Task 2 succeeds
CREATE TASK load_analytics
  WAREHOUSE = task_wh
  AFTER transform_customers
AS
  MERGE INTO analytics.customer_summary t
  USING staging.clean_customers s ON t.customer_id = s.customer_id
  WHEN MATCHED THEN UPDATE SET
    first_name = s.first_name,
    last_name = s.last_name,
    email = s.email,
    updated_at = CURRENT_TIMESTAMP
  WHEN NOT MATCHED THEN INSERT
    (customer_id, first_name, last_name, email, created_at)
    VALUES (s.customer_id, s.first_name, s.last_name, s.email, CURRENT_TIMESTAMP);

-- Resume the DAG (resume root task first, children auto-resume)
ALTER TASK load_raw_data RESUME;
ALTER TASK transform_customers RESUME;
ALTER TASK load_analytics RESUME;

-- View task DAG
SHOW TASKS;
SELECT *
FROM TABLE(INFORMATION_SCHEMA.TASK_DEPENDENTS_ENABLE(
  TASK_NAME => 'load_raw_data',
  CURRENT_RUN => FALSE
));
```

---

## 7.4 Stream + Task: The ELT Pattern

Combining streams and tasks creates a powerful CDC-based ELT pipeline:

```sql
-- Step 1: Create a stream on the raw table
CREATE STREAM raw.orders_stream ON TABLE raw.orders;

-- Step 2: Create a task that processes the stream
CREATE TASK process_orders_stream
  WAREHOUSE = task_wh
  SCHEDULE = '1 MINUTE'
WHEN
  SYSTEM$STREAM_HAS_DATA('raw.orders_stream')  -- Only run if there's data
AS
  MERGE INTO analytics.orders t
  USING (
    SELECT
      order_id,
      customer_id,
      order_date,
      total_amount,
      CASE
        WHEN METADATA$ACTION = 'DELETE' THEN 'DELETED'
        ELSE COALESCE(status, 'NEW')
      END AS status,
      METADATA$ACTION AS change_type,
      CURRENT_TIMESTAMP AS processed_at
    FROM raw.orders_stream
  ) s ON t.order_id = s.order_id
  WHEN MATCHED AND s.change_type = 'DELETE' THEN DELETE
  WHEN MATCHED THEN UPDATE SET
    customer_id = s.customer_id,
    order_date = s.order_date,
    total_amount = s.total_amount,
    status = s.status,
    updated_at = CURRENT_TIMESTAMP
  WHEN NOT MATCHED THEN INSERT
    (order_id, customer_id, order_date, total_amount, status, created_at)
    VALUES (s.order_id, s.customer_id, s.order_date, s.total_amount, s.status, CURRENT_TIMESTAMP);

-- Start the pipeline
ALTER TASK process_orders_stream RESUME;
```

### Complete ELT Pipeline Example

```sql
-- 1. Raw table (data lands here via COPY INTO or Snowpipe)
CREATE TABLE raw.events (
  event_id INTEGER AUTOINCREMENT,
  event_data VARIANT,
  loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Stream on raw table
CREATE STREAM raw.events_stream ON TABLE raw.events;

-- 3. Staging table for parsed data
CREATE TABLE staging.parsed_events (
  event_id INTEGER,
  event_type VARCHAR(50),
  user_id INTEGER,
  event_timestamp TIMESTAMP_NTZ,
  browser VARCHAR(50),
  page_url VARCHAR(500)
);

-- 4. Task to parse and transform
CREATE TASK parse_events
  WAREHOUSE = task_wh
  SCHEDULE = '1 MINUTE'
WHEN SYSTEM$STREAM_HAS_DATA('raw.events_stream')
AS
  INSERT INTO staging.parsed_events
  SELECT
    event_id,
    event_data:event_type::STRING,
    event_data:user_id::INTEGER,
    event_data:timestamp::TIMESTAMP_NTZ,
    event_data:metadata.browser::STRING,
    event_data:page::STRING
  FROM raw.events_stream
  WHERE METADATA$ACTION = 'INSERT';
```

---

## 7.5 Monitoring Pipelines

```sql
-- View task history
SELECT *
FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY(
  SCHEDULED_TIME_RANGE_START => DATEADD('days', -7, CURRENT_TIMESTAMP),
  RESULT_LIMIT => 100
))
ORDER BY SCHEDULED_TIME DESC;

-- View task dependencies
SHOW TASKS;

-- Check if a stream has data
SELECT SYSTEM$STREAM_HAS_DATA('raw.orders_stream');

-- View stream metadata
SHOW STREAMS;

-- Check task run status (SIMPLE method)
-- 0 = scheduled, 1 = running, 2 = succeeded, 3 = cancelled, 4 = failed
SELECT *
FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY())
WHERE STATE = 'FAILED'
ORDER BY SCHEDULED_TIME DESC;

-- View copy history (for Snowpipe loads)
SELECT *
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'raw.orders',
  START_TIME => DATEADD('days', -1, CURRENT_TIMESTAMP)
));
```

---

## 7.6 Error Handling and Best Practices

```sql
-- Use SYSTEM$STREAM_HAS_DATA to avoid unnecessary runs
CREATE TASK smart_task
  WAREHOUSE = task_wh
  SCHEDULE = '5 MINUTE'
WHEN
  SYSTEM$STREAM_HAS_DATA('raw.my_stream')
AS ...

-- Add error logging
CREATE TABLE admin.task_errors (
  task_name VARCHAR,
  error_message VARCHAR,
  error_time TIMESTAMP_NTZ
);

-- Use stored procedures for complex error handling
CREATE OR REPLACE PROCEDURE safe_process_stream()
RETURNS VARCHAR
LANGUAGE SQL
AS
$$
BEGIN
  -- Process stream
  INSERT INTO staging.clean_data SELECT * FROM raw.my_stream;
  -- Log success
  INSERT INTO admin.task_log (task_name, status, run_time)
  VALUES ('safe_process_stream', 'SUCCESS', CURRENT_TIMESTAMP);
  RETURN 'SUCCESS';
EXCEPTION
  WHEN OTHER THEN
    -- Log failure
    INSERT INTO admin.task_errors
    VALUES ('safe_process_stream', :SQLERRM, CURRENT_TIMESTAMP);
    RETURN 'FAILED: ' || :SQLERRM;
END;
$$;
```

### Best Practices for Pipelines

| Practice | Why |
|----------|-----|
| **Use streams for CDC** | Avoid full table scans for incremental loads |
| **Conditional tasks** | Use WHEN to run only when data exists |
| **Monitor task history** | Catch failures early |
| **Use MERGE** | Handle inserts and updates in one statement |
| **Start with small schedules** | Test at 5-10 min, then adjust |
| **Document your DAG** | Pipeline dependencies get complex |
| **Alert on failures** | Set up notifications for failed tasks |
| **Use appropriate warehouses** | Right-size compute for the workload |

---

## ✅ Chapter 7 Quiz

1. **What does a stream record?**
   - a) Query execution history
   - b) DML changes on a table
   - c) User login activity
   - d) Warehouse usage

2. **What is the purpose of the WHEN clause in a task?**
   - a) Schedule the task
   - b) Conditionally skip execution
   - c) Set the warehouse size
   - d) Define error handling

3. **How are tasks chained into a DAG?**
   - a) Using the AFTER keyword
   - b) Using the CHAIN keyword
   - c) Using the DEPENDS_ON keyword
   - d) Tasks cannot be chained

4. **What metadata column indicates whether a stream row is an UPDATE?**
   - a) METADATA$ACTION
   - b) METADATA$ISUPDATE
   - c) METADATA$TYPE
   - d) METADATA$OPERATION

5. **True or False:** A task runs even if the previous task in the DAG fails.

<details>
<summary>📌 Answers</summary>

1. **b** — Streams capture INSERT, UPDATE, DELETE operations on a table
2. **b** — The WHEN clause conditionally executes the task (e.g., only when stream has data)
3. **a** — The AFTER keyword creates parent-child task dependencies
4. **b** — METADATA$ISUPDATE is TRUE for UPDATE operations
5. **False** — A task only runs if its predecessor succeeds (unless configured otherwise)
</details>

---

## 📚 Additional Resources

- [Streams Overview](https://docs.snowflake.com/en/user-guide/streams)
- [Tasks Overview](https://docs.snowflake.com/en/user-guide/tasks)
- [Task DAGs](https://docs.snowflake.com/en/user-guide/tasks-intro)
- [Stream + Task Tutorial](https://docs.snowflake.com/en/user-guide/streams-tasks)

---

*Next → [Chapter 8: Performance Optimization]({{< relref "09-performance-optimization" >}})*
