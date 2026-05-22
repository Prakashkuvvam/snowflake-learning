---
title: "Exam Practice Test 6"
weight: 21
---
# Exam Practice Test 6 — Snowpark, Dynamic Tables, and Advanced Features

{{< hint info >}}
This practice test covers Snowpark, dynamic tables, Snowflake Cortex, data sharing, and advanced topics.
{{< /hint >}}

## Questions

### Question 1
What is Snowpark?

- A) A SQL-only interface
- B) A set of libraries for data processing in Python, Java, and Scala using DataFrames
- C) A new type of warehouse
- D) A visualization tool

### Question 2
Which of the following languages does Snowpark support?

- A) Python
- B) Java
- C) Scala
- D) All of the above

### Question 3
What is a dynamic table?

- A) A table whose schema changes automatically
- B) A table that automatically refreshes based on a query
- C) A temporary table
- D) A table with dynamic columns

### Question 4
What Snowflake feature provides AI/ML capabilities like sentiment analysis?

- A) Snowpark ML
- B) Snowflake Cortex
- C) Dynamic Tables
- D) Snowpipe

### Question 5
What is a secure share?

- A) A share that requires a password
- B) A share that provides read-only access to data without copying it
- C) A share between warehouses
- D) A share that encrypts data in transit

### Question 6
What is a reader account?

- A) An account that can read all databases
- B) A full Snowflake account for consuming shared data without being a Snowflake customer
- C) A read-only role
- D) A account for Snowsight readers

### Question 7
Which of the following is a Snowflake Cortex function?

- A) `CORTEX.SENTIMENT()`
- B) `CORTEX.COMPLETE()`
- C) `CORTEX.SUMMARIZE()`
- D) All of the above

### Question 8
What does `CREATE OR REPLACE` do in Snowflake?

- A) Creates an object or replaces it if it already exists
- B) Creates a backup before replacing
- C) Only replaces existing objects
- D) Creates a clone if the object exists

### Question 9
What is a stored procedure in Snowflake?

- A) A saved query
- B) A reusable block of SQL or Snowpark code with procedural logic
- C) A type of view
- D) A scheduled task

### Question 10
What is the purpose of `SYSTEM$WAIT` in Snowflake?

- A) Waits for a query to complete
- B) Pauses execution for a specified number of seconds (useful in stored procedures)
- C) Delays warehouse startup
- D) Waits for data to load

---

## Answer Key

| Q | Answer | Explanation |
|---|--------|-------------|
| 1 | B | Snowpark is a DataFrame API for Python, Java, Scala |
| 2 | D | Snowpark supports Python, Java, and Scala |
| 3 | B | Dynamic tables auto-refresh based on a defining query |
| 4 | B | Snowflake Cortex provides AI/ML capabilities |
| 5 | B | Secure shares provide read-only access without copying |
| 6 | B | Reader accounts consume shared data without being a Snowflake customer |
| 7 | D | Cortex includes SENTIMENT, COMPLETE, SUMMARIZE, and more |
| 8 | A | CREATE OR REPLACE creates or replaces an object |
| 9 | B | Stored procedures are reusable procedural code blocks |
| 10 | B | SYSTEM$WAIT pauses execution for N seconds |
