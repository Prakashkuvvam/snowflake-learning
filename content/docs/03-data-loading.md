---
title: "Chapter 2: Data Loading"
weight: 3
bookFlatSection: false
bookToc: true
---

# Chapter 2: Data Loading

## 🎯 Learning Objectives

- Understand stages and how to use them
- Create and use file formats
- Load data with COPY INTO
- Handle errors during loading
- Use external stages (S3, Azure, GCS)
- Set up Snowpipe for continuous loading

---

## 2.1 Stages: Where Files Live Before Loading

A **stage** is a location where data files are stored before being loaded into Snowflake tables.

### Types of Stages

| Stage Type | Scope | Created By | Persistence |
|------------|-------|------------|-------------|
| **User stage** | One user | Automatic (each user has one) | Files persist until removed |
| **Table stage** | One table | Automatic (each table has one) | Files persist until removed |
| **Internal named stage** | Account-wide | You (explicitly) | Files persist until removed |
| **External stage** | Account-wide | You (references S3/Azure/GCS) | Files live in your cloud storage |

### User Stage (Built-in)

```sql
-- Every user automatically has a stage
LIST @~;

-- Put files (via SnowSQL CLI)
-- !!! PUT file://data/customers.csv @~;

-- List files in user stage
LIST @~;

-- Remove from user stage
REMOVE @~/customers.csv;
```

### Table Stage (Built-in)

```sql
-- Every table has an automatic stage
LIST @%customers;

-- Stage name format: @%<table_name>
```

### Internal Named Stage

```sql
-- Create a named stage
CREATE STAGE my_stage
  COMMENT = 'Stage for loading customer data';

-- List files
LIST @my_stage;

-- Create stage with directory table (for file discovery)
CREATE STAGE my_stage
  DIRECTORY = (ENABLE = TRUE);

-- Alter stage to add directory
ALTER STAGE my_stage
  SET DIRECTORY = (ENABLE = TRUE);
```

### External Stage

```sql
-- AWS S3 external stage
CREATE STAGE s3_stage
  URL = 's3://my-bucket/snowflake-data/'
  CREDENTIALS = (AWS_KEY_ID = '...' AWS_SECRET_KEY = '...');

-- Azure Blob external stage
CREATE STAGE azure_stage
  URL = 'azure://myaccount.blob.core.windows.net/container/path/'
  CREDENTIALS = (AZURE_SAS_TOKEN = '...');

-- GCS external stage
CREATE STAGE gcs_stage
  URL = 'gcs://my-bucket/path/'
  STORAGE_INTEGRATION = my_gcs_integration;
```

> **Best Practice:** Use **storage integrations** instead of inline credentials for external stages — they're more secure and easier to manage.

---

## 2.2 File Formats

A **file format** defines how Snowflake interprets your data files.

```sql
-- Create a CSV file format
CREATE FILE FORMAT csv_format
  TYPE = CSV
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  SKIP_HEADER = 1
  NULL_IF = ('NULL', 'null', '\\N')
  EMPTY_FIELD_AS_NULL = TRUE
  COMPRESSION = AUTO;

-- Create a JSON file format
CREATE FILE FORMAT json_format
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE
  COMPRESSION = AUTO;

-- Create a Parquet file format
CREATE FILE FORMAT parquet_format
  TYPE = PARQUET
  COMPRESSION = SNAPPY;

-- Create an Avro file format
CREATE FILE FORMAT avro_format
  TYPE = AVRO;

-- Create an XML file format
CREATE FILE FORMAT xml_format
  TYPE = XML
  COMPRESSION = AUTO;
```

### File Format Options for CSV

| Option | Values | Description |
|--------|--------|-------------|
| `TYPE` | CSV, JSON, PARQUET, AVRO, ORC, XML | File type |
| `SKIP_HEADER` | 0-1 | Skip first N lines |
| `FIELD_DELIMITER` | ',' or '\|' or '\\t' | Field separator |
| `FIELD_OPTIONALLY_ENCLOSED_BY` | '"', "'", NONE | Text qualifier |
| `NULL_IF` | ('NULL', '') | Strings to treat as NULL |
| `EMPTY_FIELD_AS_NULL` | TRUE/FALSE | Empty fields → NULL |
| `ERROR_ON_COLUMN_COUNT_MISMATCH` | TRUE/FALSE | Fail on column mismatch |
| `COMPRESSION` | AUTO, GZIP, BZ2, DEFLATE, RAW, ZSTD | File compression |
| `VALIDATE_UTF8` | TRUE/FALSE | Validate UTF-8 encoding |
| `ENCODING` | UTF8, ISO-8859-1, etc. | File encoding |

---

## 2.3 COPY INTO: Loading Data

### Basic COPY INTO

```sql
-- Create destination table
CREATE TABLE raw.customers (
  customer_id INTEGER,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  signup_date DATE
);

-- Load data from stage
COPY INTO raw.customers
FROM @my_stage/customers.csv
FILE_FORMAT = csv_format;

-- Load all files matching a pattern
COPY INTO raw.customers
FROM @my_stage
FILE_FORMAT = csv_format
PATTERN = '.*customers.*\\.csv';
```

### COPY INTO with Validation

```sql
-- Validate without loading (dry run)
COPY INTO raw.customers
FROM @my_stage/customers.csv
FILE_FORMAT = csv_format
VALIDATION_MODE = RETURN_ERRORS;

-- Validate first N rows
COPY INTO raw.customers
FROM @my_stage/customers.csv
FILE_FORMAT = csv_format
VALIDATION_MODE = RETURN_5_ROWS;
```

### Error Handling

```sql
-- Skip errors (continue loading good rows)
COPY INTO raw.customers
FROM @my_stage/customers.csv
FILE_FORMAT = csv_format
ON_ERROR = 'SKIP_FILE';

-- Other error options:
-- 'SKIP_FILE' — Skip files with errors (default)
-- 'SKIP_FILE_<N>' — Skip files with more than N errors
-- 'CONTINUE' — Skip bad rows, continue with good rows
-- 'ABORT_STATEMENT' — Roll back entire load

-- Rejected records
COPY INTO raw.customers
FROM @my_stage/customers.csv
FILE_FORMAT = csv_format
ON_ERROR = 'CONTINUE'
VALIDATE_MODE = RETURN_ERRORS;

-- View rejected records
SELECT * FROM TABLE(VALIDATE(raw.customers, JOB_ID => '...'));
```

### COPY INTO with Transformation

```sql
-- Column reordering and casting
COPY INTO raw.orders (order_id, customer_id, order_date, amount)
FROM (
  SELECT
    $1::INTEGER AS order_id,
    $2::INTEGER AS customer_id,
    $3::TIMESTAMP_NTZ AS order_date,
    $4::DECIMAL(10,2) AS amount
  FROM @my_stage/orders.csv
)
FILE_FORMAT = csv_format;

-- Add metadata columns during load
COPY INTO raw.customers (customer_id, first_name, last_name, email, loaded_at)
FROM (
  SELECT
    $1::INTEGER,
    $2::VARCHAR,
    $3::VARCHAR,
    $4::VARCHAR,
    CURRENT_TIMESTAMP  -- Add load timestamp
  FROM @my_stage/new_customers.csv
)
FILE_FORMAT = csv_format;
```

### Loading JSON Data

```sql
-- Create a table for JSON data
CREATE TABLE raw.events (
  raw_data VARIANT
);

-- Load JSON files
COPY INTO raw.events
FROM @my_stage/events.json
FILE_FORMAT = json_format;

-- Query JSON data
SELECT
  raw_data:event_type::STRING AS event_type,
  raw_data:user_id::INTEGER AS user_id,
  raw_data:timestamp::TIMESTAMP_NTZ AS event_time
FROM raw.events;
```

---

## 2.4 Snowpipe: Continuous Loading

**Snowpipe** automatically loads data as soon as files arrive in a stage.

```sql
-- Step 1: Create a pipe
CREATE PIPE customer_pipe
  AUTO_INGEST = TRUE
AS
  COPY INTO raw.customers
  FROM @my_stage
  FILE_FORMAT = csv_format;

-- Step 2: Check pipe status
SHOW PIPES;
SELECT SYSTEM$PIPE_STATUS('customer_pipe');

-- Step 3: Manually refresh pipe (for backfills)
ALTER PIPE customer_pipe REFRESH;

-- Step 4: Monitor pipe
SELECT *
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'raw.customers',
  START_TIME => DATEADD('hours', -24, CURRENT_TIMESTAMP)
));
```

### Snowpipe Setup for S3 (Auto-Ingest)

```sql
-- 1. Create a storage integration
CREATE STORAGE INTEGRATION s3_integration
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = S3
  ENABLED = TRUE
  STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::123456789012:role/my-snowflake-role'
  STORAGE_ALLOWED_LOCATIONS = ('s3://my-bucket/snowflake/');

-- 2. Get the AWS IAM user ARN and external ID
DESC STORAGE INTEGRATION s3_integration;

-- 3. Create external stage with integration
CREATE STAGE snowpipe_stage
  URL = 's3://my-bucket/snowflake/'
  STORAGE_INTEGRATION = s3_integration;

-- 4. Create pipe with auto-ingest
CREATE PIPE auto_pipe
  AUTO_INGEST = TRUE
AS
  COPY INTO raw.customers
  FROM @snowpipe_stage
  FILE_FORMAT = csv_format;

-- 5. Get the SQS queue ARN from SHOW PIPES
SHOW PIPES;
-- Copy the SQS queue ARN and add it as event notification on your S3 bucket
```

### Snowpipe Costs

| Aspect | Cost |
|--------|------|
| Compute | Snowflake-managed (no warehouse needed) |
| Billing | 1 credit per 1,000 pipe-seconds (prorated per second) |
| Minimum | Billed only when pipes are actively processing |

---

## 2.5 Loading Data from the Web Interface

```sql
-- Snowsight UI also supports drag-and-drop loading:
-- 1. Open Snowsight
-- 2. Go to Data → Databases → [your DB] → [your schema]
-- 3. Click "+ Data" → "Load Data"
-- 4. Drag and drop a CSV file
-- 5. Configure the load settings
-- 6. Click "Load"
```

---

## 2.6 Data Loading Best Practices

| Practice | Why |
|----------|-----|
| **Use named stages** | Better organization than user/table stages |
| **Create file formats** | Reusable, consistent parsing |
| **Validate before loading** | Use VALIDATION_MODE to check errors |
| **Separate raw and transformed data** | Raw stays immutable, transform in staging |
| **Monitor COPY history** | Track load status, errors, row counts |
| **Use Snowpipe for automation** | No manual loading needed |
| **Compress files** | GZIP or ZSTD reduces transfer time |
| **Split large files** | Multiple files of 100-250 MB load faster |
| **Use storage integrations** | More secure than inline credentials |

---

## ✅ Chapter 2 Quiz

1. **What type of stage is automatically created for each Snowflake user?**
   - a) Table stage
   - b) Named stage
   - c) User stage
   - d) External stage

2. **Which FILE FORMAT option handles column count mismatches?**
   - a) SKIP_HEADER
   - b) ERROR_ON_COLUMN_COUNT_MISMATCH
   - c) NULL_IF
   - d) FIELD_OPTIONALLY_ENCLOSED_BY

3. **What does Snowpipe use to detect new files in S3?**
   - a) Scheduled polling
   - b) SQS event notifications
   - c) S3 bucket scanning
   - d) Lambda triggers

4. **Which COPY INTO option allows you to validate without loading?**
   - a) VALIDATION_MODE
   - b) DRY_RUN
   - c) PREVIEW
   - d) TEST_MODE

5. **True or False:** Snowpipe requires a running warehouse to load data.

<details>
<summary>📌 Answers</summary>

1. **c** — Each user has an automatic user stage (@~)
2. **b** — ERROR_ON_COLUMN_COUNT_MISMATCH controls behavior when column count differs
3. **b** — SQS event notifications from S3 trigger Snowpipe
4. **a** — VALIDATION_MODE performs a dry run without loading data
5. **False** — Snowpipe uses Snowflake-managed compute, not a user warehouse
</details>

---

## 📚 Additional Resources

- [Introduction to Data Loading](https://docs.snowflake.com/en/user-guide/data-load-considerations)
- [COPY INTO Reference](https://docs.snowflake.com/en/sql-reference/sql/copy-into-table)
- [Snowpipe Documentation](https://docs.snowflake.com/en/user-guide/data-load-snowpipe)
- [File Format Options](https://docs.snowflake.com/en/sql-reference/sql/create-file-format)

---

*Next → [Chapter 3: Querying & Transformations]({{< relref "04-querying-transformations" >}})*
