---
title: "Exam Practice Test 1"
weight: 16
---
# Exam Practice Test 1 — Snowflake Fundamentals

{{< hint info >}}
This practice test covers Snowflake architecture, warehouses, databases, schemas, tables, and basic SQL. Each question has one correct answer unless stated otherwise.
{{< /hint >}}

## Questions

### Question 1
What is the correct order of Snowflake's three architectural layers?

- A) Compute → Storage → Cloud Services
- B) Storage → Compute → Cloud Services
- C) Cloud Services → Storage → Compute
- D) Storage → Cloud Services → Compute

### Question 2
Which Snowflake object provides compute resources for executing queries?

- A) Database
- B) Schema
- C) Virtual Warehouse
- D) Stage

### Question 3
What SQL command pauses a running warehouse without dropping it?

- A) DROP WAREHOUSE
- B) STOP WAREHOUSE
- C) ALTER WAREHOUSE ... SUSPEND
- D) ALTER WAREHOUSE ... SET STATUS = PAUSED

### Question 4
Which of the following is true about Snowflake's storage layer?

- A) Storage is tied to a specific warehouse
- B) Data is stored in a proprietary format managed by Snowflake
- C) Storage costs are included in warehouse compute costs
- D) Data must be loaded into all regions

### Question 5
What is the default retention period for Snowflake Standard Edition Time Travel?

- A) 7 days
- B) 1 day
- C) 90 days
- D) 30 days

### Question 6
Which role is the default account-level administrative role in Snowflake?

- A) SYSADMIN
- B) ORGADMIN
- C) USERADMIN
- D) ACCOUNTADMIN

### Question 7
What does `AUTO_SUSPEND = 60` do on a warehouse?

- A) Suspends the warehouse after 60 seconds of inactivity
- B) Suspends the warehouse after 60 minutes of inactivity
- C) Resumes the warehouse after 60 seconds
- D) Sets the maximum runtime to 60 minutes

### Question 8
Which SQL clause is used to grant a role to a user?

- A) ASSIGN ROLE
- B) GRANT ROLE ... TO USER
- C) ADD ROLE ... TO USER
- D) LINK ROLE ... USER

### Question 9
What is a schema in Snowflake?

- A) A virtual warehouse configuration
- B) A logical grouping of database objects like tables and views
- C) A type of user role
- D) A file format definition

### Question 10
Which statement correctly creates a table in Snowflake?

- A) `CREATE NEW TABLE customers (id INT, name STRING);`
- B) `CREATE TABLE customers (id INT, name STRING);`
- C) `DEFINE TABLE customers (id INT, name STRING);`
- D) `BUILD TABLE customers (id INTEGER, name TEXT);`

---

## Answer Key

| Q | Answer | Explanation |
|---|--------|-------------|
| 1 | B | Snowflake separates Storage → Compute → Cloud Services |
| 2 | C | Virtual warehouses provide compute resources |
| 3 | C | `ALTER WAREHOUSE ... SUSPEND` pauses a warehouse |
| 4 | B | Data is stored in Snowflake's proprietary format in cloud storage |
| 5 | B | Standard Edition: 1 day; Enterprise+: 90 days |
| 6 | D | ACCOUNTADMIN is the top-level account admin role |
| 7 | A | AUTO_SUSPEND = 60 means 60 seconds of inactivity |
| 8 | B | `GRANT ROLE role_name TO USER user_name;` |
| 9 | B | A schema groups database objects |
| 10 | B | Standard `CREATE TABLE` syntax with column definitions |
