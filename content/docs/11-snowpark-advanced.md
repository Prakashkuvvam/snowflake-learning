---
title: "Chapter 10: Snowpark & Advanced Features"
weight: 11
bookFlatSection: false
bookToc: true
---

# Chapter 10: Snowpark & Advanced Features

## 🎯 Learning Objectives

- Understand Snowpark and its use cases
- Write Snowpark Python transformations
- Create and use stored procedures
- Work with dynamic tables for automated pipelines
- Use Snowflake Cortex AI features
- Set up alerts and notifications

---

## 10.1 What is Snowpark?

**Snowpark** is Snowflake's programming framework that lets you process data using Python, Java, or Scala without moving data out of Snowflake.

```
┌─────────────────────────────────────────────────────┐
│                    Snowpark                          │
│                                                      │
│  Python ───► DataFrame API ───► SQL Generation       │
│  Java   ───► DataFrame API ───► SQL Generation       │
│  Scala  ───► DataFrame API ───► SQL Generation       │
│                                                      │
│  All run inside Snowflake (lazy evaluation)          │
└─────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Lazy Evaluation** | Snowpark builds a query plan, executes when an action is called |
| **DataFrame API** | Similar to pandas or PySpark DataFrames |
| **Pushdown** | All operations run in Snowflake, not locally |
| **UDFs** | User-defined functions in Python, Java, Scala |
| **Stored Procedures** | Combine SQL and procedural logic |

---

## 10.2 Snowpark Python

### Setup

```python
# Install Snowpark
# pip install snowflake-snowpark-python

from snowflake.snowpark import Session
from snowflake.snowpark.functions import col, sum, avg, count

# Create a session
connection_params = {
    "account": "my_account",
    "user": "my_user",
    "password": "my_password",
    "role": "SYSADMIN",
    "warehouse": "analytics_wh",
    "database": "sales_db",
    "schema": "analytics"
}
session = Session.builder.configs(connection_params).create()
```

### DataFrame Operations

```python
# Basic DataFrame operations
df = session.table("orders")

# Select and filter
df = session.table("orders") \
    .select(col("order_id"), col("total_amount"), col("order_date")) \
    .filter(col("total_amount") > 100)

df.show()

# Aggregations
daily_sales = session.table("orders") \
    .group_by(col("order_date")) \
    .agg(
        count("*").alias("order_count"),
        sum("total_amount").alias("total_revenue"),
        avg("total_amount").alias("avg_order_value")
    ) \
    .order_by(col("order_date").desc())

daily_sales.show()

# Joins
customers = session.table("customers")
result = orders.join(customers, orders["customer_id"] == customers["customer_id"]) \
    .select(col("order_id"), col("first_name"), col("last_name"), col("total_amount"))

result.collect()
```

### Snowpark vs pandas vs PySpark

| Feature | Snowpark | pandas | PySpark |
|---------|----------|--------|---------|
| **Execution Location** | Snowflake | Local | Spark Cluster |
| **Data Movement** | None (pushdown) | Loads all data | Distributed |
| **API Style** | DataFrame API | DataFrame API | DataFrame API |
| **Lazy Evaluation** | Yes | No (eager) | Yes |
| **Scale** | Snowflake compute | Single machine | Spark cluster |
| **Best For** | In-database processing | Local analysis | Large-scale ETL |

---

## 10.3 Stored Procedures

```sql
-- Python stored procedure
CREATE OR REPLACE PROCEDURE calculate_customer_segments()
RETURNS STRING
LANGUAGE PYTHON
RUNTIME_VERSION = '3.10'
PACKAGES = ('snowflake-snowpark-python')
HANDLER = 'run'
AS
$$
def run(session):
    # Read data
    customers = session.table("raw.customers")
    orders = session.table("raw.orders")
    
    # Calculate metrics
    customer_metrics = customers.join(
        orders.group_by("customer_id").agg(
            sum("total_amount").alias("lifetime_value"),
            count("*").alias("order_count")
        ),
        on="customer_id",
        how="left"
    ).select(
        col("customer_id"),
        col("first_name"),
        col("last_name"),
        col("lifetime_value"),
        col("order_count"),
        when(col("lifetime_value") > 1000, "Premium")
            .when(col("lifetime_value") > 500, "Gold")
            .otherwise("Standard")
            .alias("segment")
    )
    
    # Save results
    customer_metrics.write.mode("overwrite").save_as_table("analytics.customer_segments")
    return "Customer segments calculated successfully"
$$;
```

### SQL Stored Procedure

```sql
-- Simple SQL stored procedure
CREATE OR REPLACE PROCEDURE refresh_daily_metrics()
RETURNS VARCHAR
LANGUAGE SQL
AS
$$
BEGIN
  TRUNCATE TABLE analytics.daily_metrics;
  
  INSERT INTO analytics.daily_metrics
  SELECT
    CURRENT_DATE AS date,
    COUNT(DISTINCT customer_id) AS active_customers,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS revenue
  FROM raw.orders
  WHERE order_date = CURRENT_DATE;
  
  RETURN 'Daily metrics refreshed';
END;
$$;

-- Call the procedure
CALL refresh_daily_metrics();
```

---

## 10.4 User-Defined Functions (UDFs)

```sql
-- Python UDF
CREATE OR REPLACE FUNCTION clean_email(email STRING)
RETURNS STRING
LANGUAGE PYTHON
RUNTIME_VERSION = '3.10'
HANDLER = 'clean_email'
AS
$$
import re
def clean_email(email):
    if email is None:
        return None
    email = email.strip().lower()
    # Basic email validation
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if re.match(pattern, email):
        return email
    return None
$$;

-- SQL UDF
CREATE OR REPLACE FUNCTION calc_discount(amount NUMBER, customer_tier VARCHAR)
RETURNS NUMBER
AS
$$
  SELECT
    CASE
      WHEN customer_tier = 'Premium' THEN amount * 0.2
      WHEN customer_tier = 'Gold' THEN amount * 0.1
      ELSE amount * 0.05
    END
$$;

-- Usage
SELECT
  customer_id,
  clean_email(email) AS valid_email,
  total_amount,
  calc_discount(total_amount, 'Premium') AS discount
FROM raw.orders;
```

---

## 10.5 Dynamic Tables (Advanced)

```sql
-- Multi-table dynamic table
CREATE DYNAMIC TABLE analytics.order_summary
  TARGET_LAG = '5 minutes'
  WAREHOUSE = etl_wh
AS
SELECT
  o.order_id,
  o.customer_id,
  c.first_name || ' ' || c.last_name AS customer_name,
  c.email,
  o.order_date,
  o.total_amount,
  DATE_TRUNC('month', o.order_date) AS month,
  DENSE_RANK() OVER (PARTITION BY o.customer_id ORDER BY o.order_date) AS order_sequence
FROM raw.orders o
JOIN raw.customers c ON o.customer_id = c.customer_id;

-- Dynamic table that depends on another DT
CREATE DYNAMIC TABLE analytics.monthly_summary
  TARGET_LAG = '10 minutes'
  WAREHOUSE = etl_wh
AS
SELECT
  month,
  COUNT(DISTINCT customer_id) AS active_customers,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue,
  AVG(order_sequence) AS avg_orders_per_customer
FROM analytics.order_summary
GROUP BY ALL;

-- Refresh a dynamic table manually
ALTER DYNAMIC TABLE analytics.monthly_summary REFRESH;
```

---

## 10.6 Snowflake Cortex AI

Snowflake Cortex provides AI/ML capabilities directly in SQL:

```sql
-- Sentiment analysis
SELECT
  review_text,
  SNOWFLAKE.CORTEX.SENTIMENT(review_text) AS sentiment_score
FROM product_reviews;

-- Translate text
SELECT
  comment,
  SNOWFLAKE.CORTEX.TRANSLATE(comment, 'en', 'es') AS spanish_translation
FROM customer_feedback;

-- Summarize text
SELECT
  ticket_description,
  SNOWFLAKE.CORTEX.SUMMARIZE(ticket_description) AS summary
FROM support_tickets;

-- Classify text
SELECT
  email_body,
  SNOWFLAKE.CORTEX.CLASSIFY(email_body,
    ['complaint', 'inquiry', 'feedback', 'other']
  ) AS category
FROM customer_emails;

-- Generate text with LLM
SELECT SNOWFLAKE.CORTEX.COMPLETE(
  'llama2-70b',
  'Write a SQL query to find the top 5 customers by revenue'
) AS query_suggestion;
```

---

## 10.7 Alerts and Notifications

```sql
-- Create a notification integration (email)
CREATE OR REPLACE NOTIFICATION INTEGRATION email_alert
  TYPE = EMAIL
  ENABLED = TRUE
  ALLOWED_RECIPIENTS = ('admin@company.com', 'engineering@company.com');

-- Create an alert
CREATE OR REPLACE ALERT anomalous_cost_alert
  WAREHOUSE = admin_wh
  SCHEDULE = '10 MINUTE'
IF (
  EXISTS (
    SELECT 1
    FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
    WHERE START_TIME >= DATEADD('minutes', -10, CURRENT_TIMESTAMP)
    GROUP BY WAREHOUSE_NAME
    HAVING SUM(CREDITS_USED) > 10
  )
)
THEN
  CALL SYSTEM$SEND_EMAIL(
    'email_alert',
    'admin@company.com',
    'High Warehouse Cost Alert',
    'Warehouse cost exceeded threshold in the last 10 minutes.'
  );

-- Enable the alert
ALTER ALERT anomalous_cost_alert RESUME;
```

---

## 10.8 External Functions

Call external APIs directly from Snowflake SQL:

```sql
-- Create API integration
CREATE OR REPLACE API INTEGRATION geo_api
  API_PROVIDER = AWS_API_GATEWAY
  API_AWS_ROLE_ARN = 'arn:aws:iam::123456789012:role/snowflake-geo'
  API_ALLOWED_PREFIXES = ('https://api.example.com/geo/')
  ENABLED = TRUE;

-- Create external function
CREATE OR REPLACE EXTERNAL FUNCTION geocode(address STRING)
  RETURNS VARIANT
  API_INTEGRATION = geo_api
  HEADERS = ('Content-Type' = 'application/json')
  CONTEXT_HEADERS = (CURRENT_USER)
  AS 'https://api.example.com/geo/geocode';

-- Use in queries
SELECT
  customer_id,
  address,
  geocode(address):lat::FLOAT AS latitude,
  geocode(address):lng::FLOAT AS longitude
FROM raw.customers;
```

---

## ✅ Chapter 10 Quiz

1. **What is the key benefit of Snowpark?**
   - a) It runs Python locally on your machine
   - b) It processes data inside Snowflake without moving data
   - c) It replaces SQL entirely
   - d) It only works with Java

2. **What does lazy evaluation mean in Snowpark?**
   - a) Queries are executed immediately
   - b) Queries are deferred until an action is called
   - c) Queries are cached for performance
   - d) Queries run slowly

3. **Which Cortex AI function performs sentiment analysis?**
   - a) CORTEX.COMPLETE
   - b) CORTEX.SENTIMENT
   - c) CORTEX.CLASSIFY
   - d) CORTEX.SUMMARIZE

4. **What language can you use for stored procedures in Snowflake?**
   - a) SQL, Python, Java, Scala
   - b) Only SQL
   - c) Only Python
   - d) Only Java

5. **True or False:** Dynamic tables can depend on other dynamic tables.

<details>
<summary>📌 Answers</summary>

1. **b** — Snowpark processes data in Snowflake with no data movement
2. **b** — Lazy evaluation defers execution until a terminal action is called
3. **b** — CORTEX.SENTIMENT returns a sentiment score for text
4. **a** — Snowflake supports SQL, Python, Java, and Scala for stored procedures
5. **True** — Dynamic tables can be chained (DT1 → DT2 → DT3)
</details>

---

## 📚 Additional Resources

- [Snowpark Python](https://docs.snowflake.com/en/developer-guide/snowpark/python/index)
- [Stored Procedures](https://docs.snowflake.com/en/sql-reference/sql/create-procedure)
- [Cortex AI Functions](https://docs.snowflake.com/en/user-guide/snowflake-cortex)
- [Dynamic Tables](https://docs.snowflake.com/en/user-guide/dynamic-tables)

---

*Next → [Chapter 11: Data Sharing & Marketplace]({{< relref "12-data-sharing-marketplace" >}})*
