---
title: "Hands-On Labs"
weight: 50
---
# Hands-On Labs: Snowflake

{{< hint info >}}
Get practical experience with Snowflake through these guided lab exercises. Each lab builds on the previous one.
{{< /hint >}}

## Lab 1: Getting Started with Snowsight

**Objective:** Sign up for a free Snowflake trial and explore the Snowsight interface.

1. Go to [signup.snowflake.com](https://signup.snowflake.com) and create a free trial account
2. Choose AWS as your cloud provider and any region
3. Log in to Snowsight
4. Explore the Worksheets tab and create a new worksheet
5. Run `SELECT CURRENT_VERSION();` to verify your environment

---

## Lab 2: Creating Core Objects

**Objective:** Create databases, schemas, warehouses, and tables.

```sql
-- Create a warehouse
CREATE WAREHOUSE lab_wh
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE;

-- Create database and schema
CREATE DATABASE lab_db;
CREATE SCHEMA lab_db.raw;

-- Create a table
CREATE TABLE lab_db.raw.customers (
  customer_id INTEGER AUTOINCREMENT,
  name STRING,
  email STRING,
  signup_date DATE
);
```

---

## Lab 3: Loading CSV Data

**Objective:** Upload and load a CSV file into Snowflake.

1. Download a sample CSV (or create one with customer data)
2. Create an internal stage:
   ```sql
   CREATE STAGE lab_stage;
   ```
3. Upload the file via Snowsight (Data → Databases → lab_db → raw → Stages → lab_stage)
4. Create a file format and load:
   ```sql
   CREATE FILE FORMAT lab_csv
     TYPE = CSV
     SKIP_HEADER = 1;

   COPY INTO lab_db.raw.customers
   FROM @lab_stage
   FILE_FORMAT = lab_csv;
   ```

---

## Lab 4: Querying and Transforming Data

**Objective:** Write analytic queries using joins and window functions.

```sql
-- Create an orders table
CREATE TABLE lab_db.raw.orders (
  order_id INTEGER,
  customer_id INTEGER,
  amount DECIMAL(10,2),
  order_date DATE
);

-- Write analytic query
SELECT
  c.name,
  COUNT(o.order_id) AS order_count,
  SUM(o.amount) AS total_spent,
  RANK() OVER (ORDER BY SUM(o.amount) DESC) AS spending_rank
FROM lab_db.raw.customers c
JOIN lab_db.raw.orders o ON c.customer_id = o.customer_id
GROUP BY c.name;
```

---

## Lab 5: Working with JSON Data

**Objective:** Load and query nested JSON data.

```sql
-- Create table for JSON
CREATE TABLE lab_db.raw.events (
  event_id INTEGER,
  event_data VARIANT
);

-- Insert sample JSON
INSERT INTO lab_db.raw.events VALUES
(1, PARSE_JSON('{"type": "click", "user": {"id": 101, "name": "Alice"}, "page": "/home"}'));

-- Query JSON
SELECT
  event_data:type::STRING AS event_type,
  event_data:user.name::STRING AS user_name
FROM lab_db.raw.events;

-- Flatten nested arrays
SELECT
  event_id,
  VALUE::STRING AS tag
FROM lab_db.raw.events,
LATERAL FLATTEN(INPUT => event_data:tags);
```

---

## Lab 6: Setting Up Access Control

**Objective:** Create roles and grants for a multi-user environment.

```sql
CREATE ROLE analyst;
CREATE ROLE viewer;

GRANT USAGE ON WAREHOUSE lab_wh TO ROLE analyst;
GRANT USAGE ON DATABASE lab_db TO ROLE analyst;
GRANT USAGE ON SCHEMA lab_db.raw TO ROLE analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA lab_db.raw TO ROLE analyst;

GRANT USAGE ON WAREHOUSE lab_wh TO ROLE viewer;
GRANT SELECT ON VIEW lab_db.raw.active_customers TO ROLE viewer;

GRANT ROLE analyst TO USER your_username;
```

---

## Lab 7: Time Travel and Cloning

**Objective:** Use Time Travel to query historical data and clone tables.

```sql
-- Check current data
SELECT COUNT(*) FROM lab_db.raw.customers;

-- Simulate a mistake
DELETE FROM lab_db.raw.customers;

-- Recover using Time Travel
SELECT COUNT(*) FROM lab_db.raw.customers
  AT (OFFSET => -60);

-- Clone a table for testing
CREATE TABLE lab_db.raw.customers_dev CLONE lab_db.raw.customers;
```

---

## Lab 8: Building a Pipeline with Streams and Tasks

**Objective:** Automate data transformations.

```sql
-- Create stream on source table
CREATE STREAM lab_db.raw.customer_stream
  ON TABLE lab_db.raw.customers;

-- Create target table
CREATE TABLE lab_db.analytics.active_customers AS
  SELECT * FROM lab_db.raw.customers WHERE 1=0;

-- Create task
CREATE TASK process_customers
  WAREHOUSE = lab_wh
  SCHEDULE = '5 MINUTE'
WHEN
  SYSTEM$STREAM_HAS_DATA('lab_db.raw.customer_stream')
AS
  INSERT INTO lab_db.analytics.active_customers
  SELECT * FROM lab_db.raw.customer_stream
  WHERE status = 'ACTIVE';

-- Start the task
ALTER TASK process_customers RESUME;
```

---

## Lab 9: Monitoring Performance

**Objective:** Use query profiles to understand and optimize queries.

```sql
-- Check current warehouse load
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
  WHERE WAREHOUSE_NAME = 'LAB_WH'
  ORDER BY START_TIME DESC;

-- Find slow queries
SELECT
  QUERY_ID,
  QUERY_TEXT,
  EXECUTION_TIME,
  BYTES_SCANNED,
  PARTITIONS_SCANNED
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
  WHERE WAREHOUSE_NAME = 'LAB_WH'
  AND EXECUTION_TIME > 5000
  ORDER BY EXECUTION_TIME DESC;
```

---

## Lab 10: Final Project — End-to-End Pipeline

**Objective:** Build a complete Snowflake pipeline combining all skills.

**Steps:**

1. Create database, schema, warehouse
2. Load customer and order CSV files from stage
3. Clean data with transformations
4. Create analytics views (daily sales, top customers)
5. Set up stream + task for incremental updates
6. Create roles and grant permissions
7. Write summary queries for reporting
8. Monitor warehouse usage
9. Set auto-suspend to minimize cost
