---
title: "Exam Practice Test 2"
weight: 17
---
# Exam Practice Test 2 — Data Loading and Querying

{{< hint info >}}
This practice test covers data loading, stages, file formats, COPY INTO, basic querying, joins, and window functions.
{{< /hint >}}

## Questions

### Question 1
What is a Snowflake stage used for?

- A) Storing query results permanently
- B) A temporary or permanent location for data files before loading
- C) A compute resource for ETL jobs
- D) A type of schema object for views

### Question 2
Which command loads data from a stage into a table?

- A) LOAD DATA
- B) INSERT FROM STAGE
- C) COPY INTO
- D) IMPORT FILE

### Question 3
What does `SKIP_HEADER = 1` do in a CSV file format definition?

- A) Skips the first column of each row
- B) Skips the first row (header) when loading
- C) Skips files starting with '1'
- D) Skips empty lines

### Question 4
Which Snowflake feature automatically loads new files from a stage on a continuous basis?

- A) COPY INTO
- B) Auto-Ingest
- C) Snowpipe
- D) Stream

### Question 5
What is the difference between an internal stage and an external stage?

- A) Internal stages use Snowflake storage; external stages use cloud storage (S3, Azure, GCS)
- B) Internal stages are faster; external stages are cheaper
- C) External stages cannot be used with COPY INTO
- D) There is no difference

### Question 6
Which SQL function calculates a running total within a partition?

- A) `SUM() OVER (PARTITION BY ... ORDER BY ...)`
- B) `RUNNING_TOTAL()`
- C) `CUMULATIVE SUM()`
- D) `ROW_NUMBER()`

### Question 7
What does a LEFT JOIN return?

- A) Only matching rows from both tables
- B) All rows from the left table, with matching rows from the right table (NULLs where no match)
- C) All rows from both tables
- D) Only rows where there is no match in the right table

### Question 8
Which CTE syntax is correct in Snowflake?

- A) `WITH cte_name AS (SELECT ...) SELECT ... FROM cte_name;`
- B) `CTE cte_name AS (SELECT ...) SELECT ... FROM cte_name;`
- C) `DEFINE cte_name AS (SELECT ...) SELECT ... FROM cte_name;`
- D) `WITH cte_name = (SELECT ...) SELECT ... FROM cte_name;`

### Question 9
What is the purpose of `VALIDATION_MODE` in a COPY INTO command?

- A) Validates SQL syntax before loading
- B) Validates files without loading data (for testing)
- C) Validates user permissions
- D) Validates warehouse size

### Question 10
Which file formats does Snowflake natively support for loading? (Select all that apply)

- A) CSV
- B) JSON
- C) Parquet
- D) Avro
- E) ORC

---

## Answer Key

| Q | Answer | Explanation |
|---|--------|-------------|
| 1 | B | A stage is a location for data files before loading |
| 2 | C | `COPY INTO table_name FROM stage` loads data |
| 3 | B | SKIP_HEADER = 1 skips the first row (header) |
| 4 | C | Snowpipe provides continuous, automated data loading |
| 5 | A | Internal = Snowflake storage; External = S3/Azure/GCS |
| 6 | A | Window function with OVER clause for running totals |
| 7 | B | LEFT JOIN preserves all left table rows |
| 8 | A | `WITH cte_name AS (SELECT ...)` is correct CTE syntax |
| 9 | B | VALIDATION_MODE tests file validity without loading |
| 10 | A–E | Snowflake supports CSV, JSON, Parquet, Avro, and ORC |
