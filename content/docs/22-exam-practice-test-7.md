---
title: "Exam Practice Test 7"
weight: 22
---
# Exam Practice Test 7 — Comprehensive Final Assessment

{{< hint info >}}
This comprehensive practice test covers all Snowflake topics from architecture to advanced features. Questions are more challenging and scenario-based.
{{< /hint >}}

## Questions

### Question 1
A company needs to run large analytical queries on 10 TB of data during business hours and smaller ad-hoc queries overnight. What is the most cost-effective approach?

- A) Use a single Large warehouse 24/7
- B) Use a Large warehouse during business hours and an X-Small warehouse (auto-suspend enabled) overnight
- C) Use a single X-Small warehouse for everything
- D) Use multi-cluster warehouses at all times

### Question 2
Which statement correctly combines a stream and a task for CDC?

- A) Create stream on source table → Create task that reads from stream → Task DML consumes stream
- B) Create task → Create stream → Link them
- C) Create stream → Enable CDC on table → Create task
- D) Streams and tasks cannot be combined

### Question 3
A data engineer needs to share live data with an external partner who does not have a Snowflake account. What should they use?

- A) A secure view
- B) A data share with a reader account
- C) Export data to CSV
- D) A database clone

### Question 4
What happens when a zero-copy clone of a table is created and then the original table is modified?

- A) Both tables show the modification
- B) Only the clone shows the modification
- C) Only the original table shows the modification; the clone retains the original data
- D) The clone is dropped

### Question 5
Which of the following costs are associated with Snowflake usage? (Select all that apply)

- A) Warehouse compute (credit usage)
- B) Storage for table data
- C) Time Travel storage
- D) Fail-safe storage
- E) Cloud Services (up to 10% of daily compute)

### Question 6
A query is running slowly on a large table with frequent IN filter lookups. What feature would most likely help?

- A) Increase warehouse size
- B) Enable search optimization
- C) Create a materialized view
- D) Use a larger file format

### Question 7
What is the maximum number of days for Time Travel retention across all Snowflake editions?

- A) 1 day
- B) 7 days
- C) 90 days
- D) 365 days

### Question 8
Which Snowflake object type allows you to run Python code for data transformation?

- A) Snowflake Cortex
- B) Snowpark DataFrame API in a stored procedure
- C) Dynamic table
- D) External function

### Question 9
A task must run after another task completes successfully. How is this configured?

- A) `CREATE TASK task2 AFTER task1;` (both tasks in same schema)
- B) Define the dependency in the task definition using `DEPENDS_ON`
- C) Use a single task with multiple statements
- D) Use Snowpipe instead

### Question 10
What is the purpose of the `ACCOUNT_USAGE` schema?

- A) Stores user account settings
- B) Provides views for querying account-level usage and metadata (query history, warehouse usage, etc.)
- C) Manages account billing
- D) Stores database backups

---

## Answer Key

| Q | Answer | Explanation |
|---|--------|-------------|
| 1 | B | Different workloads need different warehouse sizes; auto-suspend saves cost |
| 2 | A | Stream tracks changes → Task consumes stream → DML advances offset |
| 3 | B | Reader accounts allow non-Snowflake users to consume shares |
| 4 | C | Zero-copy clones share storage; modifications are independent |
| 5 | A–E | All listed items contribute to Snowflake costs |
| 6 | B | Search optimization speeds up point lookups |
| 7 | C | 90 days maximum (Enterprise Edition and above) |
| 8 | B | Snowpark stored procedures run Python code |
| 9 | A | `CREATE TASK task2 AFTER task1;` creates dependency |
| 10 | B | ACCOUNT_USAGE schema provides historical usage views |
