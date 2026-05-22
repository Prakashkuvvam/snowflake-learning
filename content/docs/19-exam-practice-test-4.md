---
title: "Exam Practice Test 4"
weight: 19
---
# Exam Practice Test 4 — Time Travel, Cloning, and Streams/Tasks

{{< hint info >}}
This practice test covers Time Travel, zero-copy cloning, streams, tasks, and automated pipelines.
{{< /hint >}}

## Questions

### Question 1
How long is Time Travel retention for Snowflake Enterprise Edition?

- A) 1 day
- B) 7 days
- C) 30 days
- D) 90 days

### Question 2
Which SQL clause allows querying data as it existed at a specific timestamp?

- A) `AT (TIMESTAMP => ...)`
- B) `AS OF (TIMESTAMP => ...)`
- C) `HISTORICAL (TIMESTAMP => ...)`
- D) `SNAPSHOT (TIMESTAMP => ...)`

### Question 3
What is zero-copy cloning?

- A) Cloning data without using a warehouse
- B) Creating a copy of an object that shares underlying storage until changes are made
- C) Cloning data across regions at no cost
- D) Creating a compressed backup

### Question 4
What does the CLONE keyword do?

- A) `CREATE TABLE new_table CLONE source_table;`
- B) Backs up data to external storage
- C) Creates a replica in another region
- D) Exports table schema

### Question 5
What type of changes does a stream track?

- A) Only INSERT operations
- B) INSERT, UPDATE, DELETE operations with metadata
- C) Only schema changes
- D) Only SELECT queries

### Question 6
What happens to stream data after it is consumed in a DML transaction?

- A) It is deleted permanently
- B) It is cleared and ready to track new changes
- C) It remains until the stream is dropped
- D) It is moved to a history table

### Question 7
What is a task in Snowflake?

- A) A scheduled SQL statement or stored procedure
- B) A data loading job
- C) A user notification
- D) A query optimizer

### Question 8
What schedule syntax is correct for a task running every 10 minutes?

- A) `SCHEDULE = '10 MINUTE'`
- B) `SCHEDULE = 'EVERY 10 MINUTES'`
- C) `SCHEDULE = '*/10 * * * *'`
- D) `SCHEDULE = '600 SECONDS'`

### Question 9
How do you create a task DAG (dependency chain)?

- A) `CREATE TASK task2 AFTER task1;`
- B) `LINK TASK task2 TO task1;`
- C) `ADD TASK task2 DEPENDS ON task1;`
- D) Task DAGs cannot be created

### Question 10
What system function returns the current offset for Time Travel?

- A) `CURRENT_TIMESTAMP()`
- B) `TIME_TRAVEL_OFFSET()`
- C) `CURRENT_TIME()`
- D) `TIME_TRAVEL_INFO()`

---

## Answer Key

| Q | Answer | Explanation |
|---|--------|-------------|
| 1 | D | Enterprise Edition: 90 days Time Travel retention |
| 2 | A | `AT (TIMESTAMP => ...)` queries historical data |
| 3 | B | Zero-copy cloning shares storage until modifications |
| 4 | A | `CREATE TABLE ... CLONE source` creates a zero-copy clone |
| 5 | B | Streams track INSERT, UPDATE, and DELETE with metadata |
| 6 | B | Stream offset advances after consuming DML transaction |
| 7 | A | Tasks execute scheduled SQL or stored procedures |
| 8 | A | `SCHEDULE = '10 MINUTE'` runs every 10 minutes |
| 9 | A | `CREATE TASK task2 AFTER task1;` creates dependencies |
| 10 | A | `CURRENT_TIMESTAMP()` can be used with Time Travel |
