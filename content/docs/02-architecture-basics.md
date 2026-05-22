---
title: "Chapter 1: Snowflake Architecture & Basics"
weight: 2
bookFlatSection: false
bookToc: true
---

# Chapter 1: Snowflake Architecture & Basics

## 🎯 Learning Objectives

- Understand Snowflake's unique architecture (separation of storage, compute, services)
- Explain the difference between shared-disk and shared-nothing architectures
- Navigate the Snowsight UI
- Create databases, schemas, tables, and views
- Create and configure virtual warehouses
- Understand users, roles, and the permission model

---

## 1.1 Snowflake's Architecture

Snowflake uses a **hybrid architecture** that combines the best of shared-disk and shared-nothing approaches:

```
                    ┌─────────────────────────────────────┐
                    │        Cloud Services Layer          │
                    │  (Authentication, Metadata, Query    │
                    │   Optimization, Access Control)      │
                    └────────────────┬────────────────────┘
                                     │
                    ┌────────────────┼────────────────────┐
                    │                │                    │
              ┌─────▼──────┐  ┌──────▼───────┐  ┌───────▼──────┐
              │  Virtual    │  │  Virtual     │  │  Virtual     │
              │  Warehouse 1│  │  Warehouse 2 │  │  Warehouse 3 │
              │  (Compute)  │  │  (Compute)   │  │  (Compute)   │
              └─────┬──────┘  └──────┬───────┘  └───────┬──────┘
                    │                │                    │
                    └────────────────┼────────────────────┘
                                     │
                    ┌────────────────▼────────────────────┐
                    │        Storage Layer                 │
                    │  (Compressed, Columnar, Encrypted)   │
                    │  S3 / Azure Blob / GCS              │
                    └─────────────────────────────────────┘
```

### Three Layers

| Layer | What It Does | Managed By |
|-------|-------------|------------|
| **Storage** | Stores table data, results, metadata in compressed, columnar format | Snowflake (in your cloud provider's storage) |
| **Compute** | Virtual warehouses that execute queries, DML, and data loading | You (create/manage warehouses) |
| **Cloud Services** | Authentication, query parsing, optimization, metadata management | Snowflake (always running) |

### Key Differences from Traditional Databases

| Feature | Traditional DB | Snowflake |
|---------|---------------|-----------|
| Storage/Compute | Coupled (can't scale independently) | **Decoupled** — scale each separately |
| Scaling | Vertical (bigger server) | **Horizontal** (add more warehouses) |
| Concurrency | Limited by server capacity | **Multiple warehouses** access same data |
| Data Sharing | Complex (copy data) | **Instant** (no data movement) |
| Maintenance | Patching, backups, tuning | **Zero management** (Snowflake handles it) |

> **💡 Why this matters:** You can have one warehouse for ETL, another for BI dashboards, and a third for ad-hoc analytics — all querying the same data without conflict.

---

## 1.2 Organizing Your Snowflake Account

### Organizations and Accounts

```
Organization
  └── Account 1 (dev)
  └── Account 2 (prod)
       └── Users
       └── Roles
       └── Databases
            └── Schemas
                 └── Tables
                 └── Views
                 └── Stages
                 └── Streams
                 └── Tasks
```

### Databases and Schemas

```sql
-- Create a database
CREATE DATABASE sales_db;

-- Create schemas (logical groupings)
CREATE SCHEMA sales_db.raw;         -- Raw ingested data
CREATE SCHEMA sales_db.analytics;   -- Clean, transformed data
CREATE SCHEMA sales_db.staging;     -- Intermediate processing

-- List databases and schemas
SHOW DATABASES;
SHOW SCHEMAS IN sales_db;

-- Set context
USE DATABASE sales_db;
USE SCHEMA sales_db.analytics;
```

### Best Practice: Schema Organization

| Schema | Purpose | Access |
|--------|---------|--------|
| `raw` | Raw data as loaded (immutable) | ELT processes only |
| `staging` | Intermediate transformations | Data engineers |
| `analytics` | Clean, modeled data | Analysts, BI tools |
| `reporting` | Aggregated views | Business users |
| `shared` | Data for sharing externally | Controlled access |

---

## 1.3 Tables in Snowflake

### Creating Tables

```sql
-- Standard table
CREATE TABLE sales_db.raw.customers (
  customer_id INTEGER,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  signup_date DATE,
  status VARCHAR(20)
);

-- Table with constraints (Snowflake supports but doesn't enforce)
CREATE TABLE sales_db.raw.orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(customer_id),
  order_date TIMESTAMP_NTZ,
  total_amount DECIMAL(10,2),
  status VARCHAR(20)
);

-- Transient table (no Fail-safe, lower storage cost)
CREATE TRANSIENT TABLE sales_db.staging.temp_orders (
  order_id INTEGER,
  order_date TIMESTAMP_NTZ
);

-- Temporary table (session-only, dropped when session ends)
CREATE TEMPORARY TABLE temp_export AS
SELECT * FROM sales_db.analytics.daily_sales;
```

### Table Types

| Feature | Permanent | Transient | Temporary |
|---------|-----------|-----------|-----------|
| Time Travel | 0-90 days | 0-1 day | 0-1 day |
| Fail-safe | 7 days | None | None |
| Storage Cost | Full | Lower | Lowest |
| Persistence | Until dropped | Until dropped | Session only |
| Use Case | Production data | Staging/intermediate | Query results |

### Clustering and Data Organization

Snowflake automatically organizes table data into **micro-partitions** (compressed columnar files, 50-500 MB each):

```
Table: orders
┌────────────────────────────────────────────┐
│  Micro-partition 1: order_id 1-10000       │
│  (order_date: 2024-01-01 to 2024-01-15)    │
├────────────────────────────────────────────┤
│  Micro-partition 2: order_id 10001-25000   │
│  (order_date: 2024-01-16 to 2024-02-01)    │
├────────────────────────────────────────────┤
│  Micro-partition 3: order_id 25001-40000   │
│  (order_date: 2024-02-02 to 2024-02-20)    │
└────────────────────────────────────────────┘
```

---

## 1.4 Views

```sql
-- Standard view (logical, no data stored)
CREATE VIEW sales_db.analytics.active_customers AS
SELECT customer_id, first_name, last_name, email
FROM sales_db.raw.customers
WHERE status = 'ACTIVE';

-- Secure view (definition is hidden from non-owners)
CREATE SECURE VIEW sales_db.analytics.customer_revenue AS
SELECT
  c.customer_id,
  c.first_name || ' ' || c.last_name AS customer_name,
  SUM(o.total_amount) AS lifetime_value
FROM sales_db.raw.customers c
JOIN sales_db.raw.orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name;

-- Materialized view (stores pre-computed results)
CREATE MATERIALIZED VIEW sales_db.analytics.daily_sales AS
SELECT
  DATE_TRUNC('day', order_date) AS sale_day,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue
FROM sales_db.raw.orders
GROUP BY DATE_TRUNC('day', order_date);
```

| View Type | Data Stored? | Auto-Refreshed? | Cost |
|-----------|-------------|-----------------|------|
| Standard | No | Always up-to-date | No storage cost |
| Secure | No | Always up-to-date | No storage cost (but hides definition) |
| Materialized | Yes | Yes (automatically) | Storage + maintenance credits |

---

## 1.5 Virtual Warehouses

### What is a Warehouse?

A **virtual warehouse** is a cluster of compute resources (CPU, memory, temporary storage) that executes queries, DML operations, and data loading/unloading.

```sql
-- Create a warehouse
CREATE WAREHOUSE analytics_wh
  WAREHOUSE_SIZE = 'SMALL'
  MAX_CLUSTER_COUNT = 3
  AUTO_SUSPEND = 300     -- 5 minutes
  AUTO_RESUME = TRUE
  INITIALLY_SUSPENDED = TRUE;

-- Alter warehouse settings
ALTER WAREHOUSE analytics_wh
  SET WAREHOUSE_SIZE = 'MEDIUM';

ALTER WAREHOUSE analytics_wh
  SET AUTO_SUSPEND = 60;  -- Suspend after 1 minute idle

-- Suspend/resume manually
ALTER WAREHOUSE analytics_wh SUSPEND;
ALTER WAREHOUSE analytics_wh RESUME;
```

### Warehouse Sizes

| Size | Credit/hr (per cluster) | Compute Resources | Use Case |
|------|------------------------|-------------------|----------|
| X-Small | 1 | 1 server | Development, light queries |
| Small | 2 | 2 servers | Small data loads, analytics |
| Medium | 4 | 4 servers | Moderate workloads |
| Large | 8 | 8 servers | Heavy ETL, large queries |
| X-Large | 16 | 16 servers | Complex joins, big aggregations |
| 2X-Large | 32 | 32 servers | Large data processes |
| 3X-Large | 64 | 64 servers | Very large data |
| 4X-Large | 128 | 128 servers | Massive workloads |

### Multi-Cluster Warehouses

For high concurrency, warehouses can have multiple clusters:

```sql
CREATE WAREHOUSE high_concurrency_wh
  WAREHOUSE_SIZE = 'SMALL'
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 10
  SCALING_POLICY = 'STANDARD'

  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE;
```

| Setting | Description |
|---------|-------------|
| `MIN_CLUSTER_COUNT` | Minimum clusters running |
| `MAX_CLUSTER_COUNT` | Maximum clusters (up to 10) |
| `SCALING_POLICY` | `STANDARD` (aggressive) or `ECONOMY` (conservative) |

> **📝 Key insight:** Multiple clusters can run simultaneously on the same data because storage is shared and independent from compute.

### Warehouse Monitoring

```sql
-- Check warehouse usage
SHOW WAREHOUSES;

-- View warehouse metrics
SELECT *
FROM TABLE(INFORMATION_SCHEMA.WAREHOUSE_METERING_HISTORY(
  DATE_RANGE_START => DATEADD('days', -7, CURRENT_DATE),
  WAREHOUSE_NAME => 'analytics_wh'
));

-- View query history for a warehouse
SELECT *
FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY())
WHERE WAREHOUSE_NAME = 'analytics_wh'
  AND START_TIME >= DATEADD('hours', -1, CURRENT_TIMESTAMP)
ORDER BY START_TIME DESC;
```

---

## 1.6 Users, Roles, and Grants

### The Role Hierarchy

Snowflake uses a **role-based access control (RBAC)** model:

```
ORGADMIN         ← Top-level: manage accounts
  └── ACCOUNTADMIN   ← Account-level: full access
       ├── SYSADMIN       ← System admin: create objects
       │    ├── ANALYST_ROLE  ← Custom role
       │    └── ENGINEER_ROLE ← Custom role
       └── SECURITYADMIN  ← Security admin: manage users & grants
            └── USERADMIN      ← User admin: create users
```

### Creating Users and Roles

```sql
-- Create roles
CREATE ROLE analyst_role;
CREATE ROLE engineer_role;
CREATE ROLE reporting_role;

-- Create users
CREATE USER jane_doe
  PASSWORD = 'secure_password123'
  DEFAULT_ROLE = analyst_role
  MUST_CHANGE_PASSWORD = TRUE;

-- Assign roles to users
GRANT ROLE analyst_role TO USER jane_doe;
GRANT ROLE engineer_role TO USER john_smith;

-- Grant roles to other roles (role hierarchy)
GRANT ROLE analyst_role TO ROLE SYSADMIN;
```

### Granting Privileges

```sql
-- Grant usage on objects
GRANT USAGE ON DATABASE sales_db TO ROLE analyst_role;
GRANT USAGE ON SCHEMA sales_db.analytics TO ROLE analyst_role;

-- Grant SELECT on tables
GRANT SELECT ON ALL TABLES IN SCHEMA sales_db.analytics TO ROLE analyst_role;

-- Grant specific privileges
GRANT INSERT, UPDATE ON TABLE sales_db.raw.orders TO ROLE engineer_role;
GRANT CREATE TABLE ON SCHEMA sales_db.staging TO ROLE engineer_role;

-- Grant warehouse usage
GRANT USAGE ON WAREHOUSE analytics_wh TO ROLE analyst_role;
GRANT OPERATE ON WAREHOUSE analytics_wh TO ROLE engineer_role;

-- Future grants (automatically applied to new objects)
GRANT SELECT ON FUTURE TABLES IN SCHEMA sales_db.analytics TO ROLE analyst_role;
```

### Privilege Types

| Privilege | Effect |
|-----------|--------|
| `USAGE` | Access the object (but not its contents) |
| `SELECT` | Read data from a table/view |
| `INSERT` | Add rows to a table |
| `UPDATE` | Modify existing rows |
| `DELETE` | Remove rows |
| `CREATE TABLE` | Create tables in a schema |
| `MODIFY` | Change object properties |
| `OWNERSHIP` | Full control (can grant to others) |
| `OPERATE` | Start/stop/suspend/resume warehouse |
| `MONITOR` | View usage and history |

---

## 1.7 Information Schema and Account Usage

Snowflake provides system views for metadata:

```sql
-- INFORMATION_SCHEMA (database-specific)
SELECT * FROM sales_db.INFORMATION_SCHEMA.TABLES;
SELECT * FROM sales_db.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'customers';
SELECT * FROM sales_db.INFORMATION_SCHEMA.VIEWS;

-- ACCOUNT_USAGE (account-wide, 1-hour delay)
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE START_TIME > DATEADD('hours', -24, CURRENT_TIMESTAMP)
ORDER BY START_TIME DESC;

SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY;
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.STORAGE_USAGE;
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY;
```

---

## ✅ Chapter 1 Quiz

1. **What are the three layers of Snowflake's architecture?**
   - a) Storage, Compute, Networking
   - b) Storage, Compute, Cloud Services
   - c) Databases, Warehouses, Users
   - d) Ingestion, Transformation, Analytics

2. **What happens to a TRANSIENT table when it's dropped?**
   - a) It goes to Fail-safe for 7 days
   - b) It is immediately and permanently removed
   - c) It stays in Time Travel for 90 days
   - d) It moves to another database

3. **How many credits per hour does an X-Small warehouse consume?**
   - a) 0.5
   - b) 1
   - c) 2
   - d) 4

4. **Which privilege allows a role to read data from a table?**
   - a) USAGE
   - b) SELECT
   - c) READ
   - d) ACCESS

5. **True or False:** A virtual warehouse must be running for you to create a table.

6. **What is the purpose of multi-cluster warehouses?**
   - a) To store more data
   - b) To handle high concurrency
   - c) To reduce storage costs
   - d) To enable cross-region queries

<details>
<summary>📌 Answers</summary>

1. **b** — Storage, Compute, Cloud Services
2. **b** — Transient tables have no Fail-safe
3. **b** — X-Small = 1 credit per hour
4. **b** — SELECT allows reading data
5. **False** — You can create tables without a warehouse (DDL uses cloud services layer)
6. **b** — Multi-cluster warehouses handle high concurrency by distributing queries across clusters
</details>

---

## 📚 Additional Resources

- [Snowflake Architecture Overview](https://docs.snowflake.com/en/user-guide/intro-key-concepts)
- [Snowflake in 20 Minutes Tutorial](https://docs.snowflake.com/en/user-guide/tutorials/snowflake-in-20min)
- [Virtual Warehouse Sizing Guide](https://docs.snowflake.com/en/user-guide/warehouses-considerations)
- [Role-Based Access Control](https://docs.snowflake.com/en/user-guide/security-access-control-overview)

---

*Next → [Chapter 2: Data Loading]({{< relref "03-data-loading" >}})*
