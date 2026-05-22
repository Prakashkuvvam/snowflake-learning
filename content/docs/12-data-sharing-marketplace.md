---
title: "Chapter 11: Data Sharing & Marketplace"
weight: 12
bookFlatSection: false
bookToc: true
---

# Chapter 11: Data Sharing & Marketplace

## 🎯 Learning Objectives

- Understand Snowflake's data sharing model
- Create and manage secure shares
- Use reader accounts for data sharing
- Browse and use Snowflake Marketplace datasets
- Manage data clean rooms

---

## 11.1 Data Sharing Overview

Snowflake's unique architecture allows **reading another account's data without copying it**:

```
Provider Account (NYC)
┌────────────────────┐
│  sales_data (table) │── Share ──► Consumer Account (London)
└────────────────────┘             └────────────────────────┐
                                   │  SELECT * FROM          │
                                   │  shared.sales_data     │
                                   └────────────────────────┘
```

### Benefits of Data Sharing

| Benefit | Description |
|---------|-------------|
| **Zero Copy** | No data movement — consumers see live data |
| **Real-Time** | Consumers always see the latest data |
| **No Storage Cost** | Consumers don't pay for the data |
| **Secure** | Only shared objects are visible |
| **Cross-Region** | Share across regions and cloud platforms |

---

## 11.2 Creating Secure Shares

### Provider Side

```sql
-- Step 1: Create a share
CREATE SHARE sales_share;

-- Step 2: Grant usage on the database/schema
GRANT USAGE ON DATABASE sales_db TO SHARE sales_share;
GRANT USAGE ON SCHEMA sales_db.analytics TO SHARE sales_share;

-- Step 3: Grant SELECT on specific objects (not the entire schema!)
GRANT SELECT ON TABLE sales_db.analytics.daily_sales TO SHARE sales_share;
GRANT SELECT ON VIEW sales_db.analytics.customer_summary TO SHARE sales_share;
GRANT SELECT ON TABLE sales_db.analytics.product_metrics TO SHARE sales_share;

-- Step 4: Add accounts to the share
ALTER SHARE sales_share
  SET ACCOUNTS = XY12345;  -- Consumer's account locator

-- Step 5: (Optional) Share with all accounts in an organization
ALTER SHARE sales_share
  SET ACCOUNTS = ORG_NAME.ACCOUNT_NAME;

-- View share details
SHOW SHARES;
DESC SHARE sales_share;
```

### Share Permissions

| Permission | Purpose |
|------------|---------|
| `USAGE ON DATABASE` | Allows viewing and using the database |
| `USAGE ON SCHEMA` | Allows viewing and using the schema |
| `SELECT ON TABLE` | Allows reading table data |
| `SELECT ON VIEW` | Allows reading view data |
| `SELECT ON SECURE VIEW` | Allows reading secure view data |

> **Important:** You must grant permissions at each level of the hierarchy (database → schema → object).

---

## 11.3 Consumer Side

### Receiving a Share

```sql
-- List available shares for your account
SHOW SHARES;

-- Create a database from the share
CREATE DATABASE shared_sales_db FROM SHARE XY54321.sales_share;

-- Or use fully qualified name
CREATE DATABASE shared_sales_db FROM SHARE ORG_NAME.PROVIDER_ACCOUNT.sales_share;

-- Query the shared data
SELECT * FROM shared_sales_db.analytics.daily_sales;

-- Object metadata (you can see column names, types)
DESC TABLE shared_sales_db.analytics.daily_sales;
```

### Limitations for Consumers

| Limitation | Details |
|------------|---------|
| **Read-only** | Cannot INSERT, UPDATE, DELETE shared data |
| **DDL restrictions** | Cannot alter, drop, or modify shared objects |
| **Ownership** | Consumers never own the shared data |
| **Time Travel** | Depends on provider's retention policy |
| **Cloning** | Can clone the database from a share (creates independent copy) |

---

## 11.4 Reader Accounts

**Reader accounts** let you share data with parties who don't have their own Snowflake account:

```sql
-- Provider: Create a reader account
CREATE MANAGED ACCOUNT nyc_reader_account
  ADMIN_NAME = 'readonly_admin'
  ADMIN_PASSWORD = 'secure_password123'
  TYPE = READER;

-- Get the account locator
SHOW MANAGED ACCOUNTS;

-- Grant access to the reader account
ALTER SHARE sales_share
  SET ACCOUNTS = XY54321.READER_ACCOUNT_LOCATOR;

-- The recipient logs in at a different URL (managed account URL)
-- They have limited functionality:
-- - Can only query shared data
-- - Cannot create warehouses (they use provider's)
-- - No storage or compute costs
```

### Reader Account Limitations

| Feature | Available? |
|---------|-----------|
| Query shared data | ✅ Yes |
| Create local tables | ❌ No |
| Create warehouses | ❌ No (uses provider compute) |
| Pay for compute | ✅ Yes (consumer pays) |
| Full Snowflake access | ❌ No |

---

## 11.5 Snowflake Marketplace

The **Snowflake Marketplace** lets you discover and access third-party datasets.

### Listing Your Data

```sql
-- Prerequisites: Must be a Snowflake Marketplace provider
-- 1. Complete provider listing form in Snowflake UI
-- 2. Create a share with professional listing

-- Create a listing-ready share
CREATE SHARE market_listing_share;

-- Add objects to the share
GRANT USAGE ON DATABASE weather_data TO SHARE market_listing_share;
GRANT USAGE ON SCHEMA weather_data.public TO SHARE market_listing_share;
GRANT SELECT ON TABLE weather_data.public.historical TO SHARE market_listing_share;

-- Publish via Snowflake UI: Marketplace → Add Listing
```

### Using Marketplace Data

```sql
-- Browse the Marketplace in Snowsight
-- Data → Marketplace → Browse
-- Or directly search for datasets

-- Once you find a dataset:
-- 1. Click "Get" on the listing
-- 2. Choose a database name
-- 3. The data appears in your account

-- Query marketplace data
SELECT *
FROM weather_data.public.forecast
WHERE city = 'New York'
  AND date = CURRENT_DATE;

-- Combine marketplace data with your data
SELECT
  c.city,
  s.total_sales,
  w.temperature
FROM my_db.sales s
JOIN weather_data.public.historical w
  ON s.city = w.city AND s.sale_date = w.date
WHERE w.temperature > 30;
```

---

## 11.6 Private Data Exchange

For controlled sharing within an organization:

```sql
-- Create a private data exchange
-- (Requires Snowflake Business Critical or higher and manual setup via Snowflake)

-- In the exchange:
-- 1. Define data products (collections of shares)
-- 2. Control which accounts can access each product
-- 3. Provide documentation and metadata for each dataset
-- 4. Monitor usage analytics

-- Data exchange benefits:
-- - Centralized data catalog
-- - Self-service access
-- - Usage tracking
-- - Access audits
```

---

## 11.7 Data Clean Room

For privacy-preserving data collaboration:

```sql
-- Clean rooms allow two parties to analyze combined data
-- without seeing each other's raw data

-- 1. Create clean room (via Snowflake UI)
-- 2. Add shared data from each party
-- 3. Define allowed queries (aggregations only, no row-level access)
-- 4. Run analysis in the clean room
-- 5. Results are shared, raw data stays private

-- Clean room use cases:
-- - Ad targeting analysis (combine customer lists)
-- - Fraud detection (compare transaction patterns)
-- - Supply chain optimization (share demand forecasts)
```

---

## 11.8 Data Sharing Best Practices

| Practice | Why |
|----------|-----|
| **Share views, not base tables** | Control what columns/rows consumers see |
| **Use secure views** | Hide business logic |
| **Limit to specific objects** | Don't share entire schemas |
| **Document shared data** | Column descriptions, update frequency |
| **Monitor usage** | Track which accounts are querying |
| **Set row access policies** | If sharing within different teams |
| **Use reader accounts** | For customers without Snowflake |
| **Consider refresh frequency** | Real-time sharing costs compute |

---

## ✅ Chapter 11 Quiz

1. **What is the main advantage of Snowflake data sharing over traditional data sharing?**
   - a) It's faster to transfer files
   - b) No data is copied — consumers read the provider's data
   - c) It's free
   - d) It works across all databases

2. **What is a reader account?**
   - a) A full Snowflake account
   - b) A limited account for consumers without Snowflake
   - c) A backup account
   - d) A development account

3. **Can a consumer modify data shared with them?**
   - a) Yes, with INSERT
   - b) Yes, with UPDATE
   - c) No, shared data is read-only
   - d) Yes, but only the provider can see changes

4. **What is the Snowflake Marketplace?**
   - a) A place to buy Snowflake credits
   - b) A marketplace of third-party datasets
   - c) A plugin store
   - d) A job board

5. **True or False:** A consumer can clone a shared database.

<details>
<summary>📌 Answers</summary>

1. **b** — Data sharing is zero-copy; consumers read provider's data directly
2. **b** — Reader accounts are limited accounts for consumers without their own Snowflake
3. **c** — Shared data is read-only for consumers
4. **b** — The Marketplace offers third-party datasets for purchase or free access
5. **True** — Consumers can clone shared data into their own account (creates an independent copy)
</details>

---

## 📚 Additional Resources

- [Data Sharing Overview](https://docs.snowflake.com/en/user-guide/data-sharing-intro)
- [Secure Data Sharing](https://docs.snowflake.com/en/user-guide/data-sharing-grant-privileges)
- [Reader Accounts](https://docs.snowflake.com/en/user-guide/data-sharing-reader-accounts)
- [Marketplace](https://docs.snowflake.com/en/user-guide/data-marketplace)

---

*Next → [Chapter 12: Exam Preparation Guide]({{< relref "13-exam-preparation" >}})*
