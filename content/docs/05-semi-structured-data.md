---
title: "Chapter 4: Semi-Structured Data"
weight: 5
bookFlatSection: false
bookToc: true
---

# Chapter 4: Semi-Structured Data

## 🎯 Learning Objectives

- Understand the VARIANT data type and when to use it
- Query JSON data using dot notation and bracket notation
- Use FLATTEN to expand arrays and nested objects
- Load JSON, Parquet, Avro, and XML files
- Transform semi-structured data into relational tables

---

## 4.1 The VARIANT Data Type

Snowflake's native **VARIANT** type can store any semi-structured data (JSON, Parquet, Avro, ORC, XML) without predefining a schema.

```sql
-- Create a table with a VARIANT column
CREATE TABLE raw.json_events (
  event_id INTEGER AUTOINCREMENT,
  raw_data VARIANT,
  ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert JSON data directly
INSERT INTO raw.json_events (raw_data) VALUES
  (PARSE_JSON('{
    "event_type": "page_view",
    "user_id": 1234,
    "page": "/home",
    "metadata": {
      "browser": "Chrome",
      "ip": "192.168.1.1",
      "referrer": "google.com"
    },
    "tags": ["welcome", "new-user"]
  }')),
  (PARSE_JSON('{
    "event_type": "purchase",
    "user_id": 5678,
    "page": "/checkout",
    "amount": 49.99,
    "metadata": {
      "browser": "Firefox",
      "ip": "10.0.0.1",
      "payment_method": "credit_card"
    },
    "tags": ["sale", "premium"]
  }'));

-- Or use OBJECT_CONSTRUCT to build from relational data
INSERT INTO raw.json_events (raw_data) VALUES
  (OBJECT_CONSTRUCT(
    'event_type', 'signup',
    'user_id', 9012,
    'timestamp', CURRENT_TIMESTAMP::STRING
  ));
```

### Other Semi-Structured Types

| Type | Description | Use Case |
|------|-------------|----------|
| `VARIANT` | Can hold any semi-structured data | JSON, dynamic schemas |
| `OBJECT` | Key-value pairs (a specific type of VARIANT) | When schema is known to be key-value |
| `ARRAY` | Ordered list of values (a specific type of VARIANT) | Lists, arrays |

---

## 4.2 Querying JSON Data

### Dot Notation

```sql
SELECT
  raw_data:event_type::STRING AS event_type,
  raw_data:user_id::INTEGER AS user_id,
  raw_data:page::STRING AS page,
  raw_data:amount::DECIMAL(10,2) AS amount,
  raw_data:metadata.browser::STRING AS browser,
  raw_data:metadata.ip::STRING AS ip_address
FROM raw.json_events;

-- Access array elements with dot notation
SELECT
  raw_data:tags[0]::STRING AS first_tag,
  raw_data:tags[1]::STRING AS second_tag
FROM raw.json_events;
```

### Bracket Notation

```sql
-- Same as dot notation but uses brackets
SELECT
  raw_data['event_type']::STRING AS event_type,
  raw_data['user_id']::INTEGER AS user_id,
  raw_data['metadata']['browser']::STRING AS browser
FROM raw.json_events;
```

### Dot vs Bracket Notation

| Feature | Dot Notation (`:`) | Bracket Notation (`['']`) |
|---------|-------------------|--------------------------|
| Syntax | `column:key.subkey` | `column['key']['subkey']` |
| Case Sensitivity | Case-insensitive key lookup | Case-sensitive key lookup |
| Special Characters | Fails on spaces/hyphens | Handles special characters |
| Performance | Equivalent | Equivalent |

> **Best Practice:** Use bracket notation when keys have special characters or spaces. Use dot notation for clean, simple keys.

---

## 4.3 FLATTEN: Expanding Nested Data

`FLATTEN` is a table function that expands arrays and nested objects into multiple rows:

```sql
-- Flatten an array
SELECT
  raw_data:event_type::STRING AS event_type,
  f.value::STRING AS tag
FROM raw.json_events,
LATERAL FLATTEN(INPUT => raw_data:tags) f;

-- Result:
-- page_view   | welcome
-- page_view   | new-user
-- purchase    | sale
-- purchase    | premium
```

### FLATTEN Options

```sql
-- FLATTEN with key
SELECT
  f.key,
  f.value::STRING,
  f.this,
  f.path
FROM raw.json_events,
LATERAL FLATTEN(INPUT => raw_data, OUTER => TRUE) f;

-- Recursive FLATTEN (flattens nested objects too)
SELECT
  f.key,
  f.value::STRING,
  f.index
FROM raw.json_events,
LATERAL FLATTEN(INPUT => raw_data, RECURSIVE => TRUE) f;
```

### FLATTEN Output Columns

| Column | Description |
|--------|-------------|
| `SEQ` | Sequence number of the input row |
| `KEY` | Key of the element (for objects) |
| `PATH` | Path to the element within the structure |
| `INDEX` | Index of the element (for arrays) |
| `VALUE` | Value of the element |
| `THIS` | The element being iterated over |

---

## 4.4 Working with Complex JSON

### Nested Objects

```sql
-- Sample JSON with nested structure:
-- {
--   "customer": {
--     "id": 123,
--     "name": "Alice",
--     "address": {
--       "street": "123 Main St",
--       "city": "San Francisco",
--       "state": "CA",
--       "coordinates": {"lat": 37.77, "lng": -122.41}
--     }
--   },
--   "orders": [
--     {"id": 1, "total": 29.99},
--     {"id": 2, "total": 49.99}
--   ]
-- }

-- Query nested objects
SELECT
  raw_data:customer.id::INTEGER AS customer_id,
  raw_data:customer.name::STRING AS customer_name,
  raw_data:customer.address.city::STRING AS city,
  raw_data:customer.address.coordinates.lat::FLOAT AS latitude,
  raw_data:customer.orders[0].id::INTEGER AS first_order_id
FROM raw.customer_data;

-- Flatten orders array
SELECT
  raw_data:customer.id::INTEGER AS customer_id,
  f.value:id::INTEGER AS order_id,
  f.value:total::DECIMAL(10,2) AS order_total
FROM raw.customer_data,
LATERAL FLATTEN(INPUT => raw_data:customer.orders) f;
```

### JSON to Relational Transformation

```sql
-- Transform nested JSON into clean relational tables
CREATE VIEW analytics.customers AS
SELECT DISTINCT
  raw_data:customer.id::INTEGER AS customer_id,
  raw_data:customer.name::STRING AS customer_name,
  raw_data:customer.address.city::STRING AS city,
  raw_data:customer.address.state::STRING AS state
FROM raw.customer_data;

CREATE VIEW analytics.orders AS
SELECT
  raw_data:customer.id::INTEGER AS customer_id,
  f.value:id::INTEGER AS order_id,
  f.value:total::DECIMAL(10,2) AS amount
FROM raw.customer_data,
LATERAL FLATTEN(INPUT => raw_data:customer.orders) f;
```

---

## 4.5 Working with Arrays

```sql
-- Array functions
SELECT
  ARRAY_SIZE(raw_data:tags) AS tag_count,
  raw_data:tags::ARRAY AS tags_array,
  ARRAY_SORT(raw_data:tags) AS sorted_tags,
  ARRAY_CONTAINS('premium'::VARIANT, raw_data:tags) AS has_premium_tag,
  ARRAY_POSITION('welcome'::VARIANT, raw_data:tags) AS welcome_position,
  ARRAY_CAT(raw_data:tags, ['new-tag']::ARRAY) AS extended_tags
FROM raw.json_events;

-- ARRAY_AGG: Aggregate values into an array
SELECT
  customer_id,
  ARRAY_AGG(order_id) AS order_ids,
  ARRAY_AGG(DISTINCT product_id) AS unique_products
FROM orders
GROUP BY customer_id;

-- OBJECT_AGG: Create an object from key-value pairs
SELECT
  OBJECT_AGG(key, value) AS config_object
FROM (VALUES ('timeout', '30'), ('retries', '3'), ('debug', 'true')) AS t(key, value);
```

---

## 4.6 Loading Semi-Structured Files

### Loading JSON

```sql
-- Create file format
CREATE FILE FORMAT json_format
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE
  COMPRESSION = AUTO;

-- Load JSON into a VARIANT column
CREATE TABLE raw.json_data (
  src VARIANT,
  filename STRING,
  loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP
);

COPY INTO raw.json_data (src, filename)
FROM (
  SELECT $1, METADATA$FILENAME
  FROM @data_stage
)
FILE_FORMAT = json_format;
```

### Loading Parquet

```sql
CREATE FILE FORMAT parquet_format
  TYPE = PARQUET;

-- Load Parquet (preserves schema)
CREATE TABLE raw.parquet_data USING TEMPLATE (
  SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
  FROM TABLE(
    INFER_SCHEMA(
      LOCATION => '@data_stage',
      FILE_FORMAT => 'parquet_format'
    )
  )
);

COPY INTO raw.parquet_data
FROM @data_stage
FILE_FORMAT = parquet_format
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;

-- Or query Parquet directly:
SELECT $1:column_name::TYPE AS column_alias
FROM @data_stage (FILE_FORMAT => parquet_format);
```

### Schema Inference

```sql
-- Infer schema from staged files
SELECT *
FROM TABLE(
  INFER_SCHEMA(
    LOCATION => '@data_stage',
    FILE_FORMAT => 'parquet_format'
  )
);

-- Generate CREATE TABLE from inferred schema
SELECT GENERATE_COLUMN_DESCRIPTION(
  ARRAY_AGG(OBJECT_CONSTRUCT(*)),
  'table'
) AS create_statement
FROM TABLE(
  INFER_SCHEMA(
    LOCATION => '@data_stage',
    FILE_FORMAT => 'parquet_format'
  )
);
```

---

## 4.7 Best Practices for Semi-Structured Data

| Practice | Why |
|----------|-----|
| **Use explicit casting** | `::STRING` ensures correct data types |
| **Parse JSON on load** | Use `PARSE_JSON()` for string-to-VARIANT conversion |
| **Flatten at query time** | Keep raw data in VARIANT, flatten when needed |
| **Use STRIP_OUTER_ARRAY** | Remove unnecessary array wrapping in JSON files |
| **Index with GIN** | Not available; use search optimization instead |
| **Monitor VARIANT size** | Keep individual records under 16 MB |

---

## ✅ Chapter 4 Quiz

1. **Which data type stores semi-structured data in Snowflake?**
   - a) STRING
   - b) VARIANT
   - c) JSON
   - d) SEMI

2. **What does the FLATTEN function do?**
   - a) Compresses data
   - b) Expands arrays/objects into multiple rows
   - c) Removes NULL values
   - d) Converts JSON to CSV

3. **Which notation is case-insensitive for JSON field access?**
   - a) Dot notation (:)
   - b) Bracket notation ([])
   - c) Both are case-insensitive
   - d) Neither — use UPPER()

4. **What is the maximum size for a VARIANT column value?**
   - a) 1 MB
   - b) 16 MB
   - c) 100 MB
   - d) Unlimited

5. **True or False:** You must define the schema before loading JSON into a VARIANT column.

<details>
<summary>📌 Answers</summary>

1. **b** — VARIANT stores any semi-structured data
2. **b** — FLATTEN expands arrays and nested objects into separate rows
3. **a** — Dot notation is case-insensitive; bracket notation is case-sensitive
4. **b** — 16 MB (compressed size may be larger at source)
5. **False** — VARIANT is schema-less; you can load JSON directly without defining columns
</details>

---

## 📚 Additional Resources

- [Semi-Structured Data Overview](https://docs.snowflake.com/en/user-guide/semistructured-intro)
- [FLATTEN Function](https://docs.snowflake.com/en/sql-reference/functions/flatten)
- [VARIANT Data Type](https://docs.snowflake.com/en/sql-reference/data-types-semistructured)
- [Infer Schema Documentation](https://docs.snowflake.com/en/sql-reference/functions/infer_schema)

---

*Next → [Chapter 5: Security & Access Control]({{< relref "06-security-access-control" >}})*
