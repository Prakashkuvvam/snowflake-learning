---
title: "Exam Practice Test 5"
weight: 20
---
# Exam Practice Test 5 — Performance Optimization and Cost Management

{{< hint info >}}
This practice test covers warehouse sizing, caching, clustering, query profiles, cost monitoring, and optimization techniques.
{{< /hint >}}

## Questions

### Question 1
Which of the following warehouse sizes provides the most compute resources?

- A) X-Small
- B) Small
- C) Medium
- D) 4X-Large

### Question 2
What is auto-suspend?

- A) Automatically stops the warehouse after a period of inactivity
- B) Pauses all running queries
- C) Suspends user accounts
- D) Reduces warehouse size automatically

### Question 3
Which cache does Snowflake use to speed up repeated identical queries?

- A) Disk cache
- B) Result cache
- C) Warehouse cache
- D) Metadata cache

### Question 4
How long does the Snowflake result cache persist?

- A) 24 hours
- B) Until the underlying data changes
- C) 7 days
- D) Result cache does not exist in Snowflake

### Question 5
What is a micro-partition?

- A) A small table
- B) An immutable storage unit of 50–500 MB of compressed data
- C) A partition of a virtual warehouse
- D) A type of file format

### Question 6
What does clustering do in Snowflake?

- A) Groups related tables together
- B) Organizes micro-partitions to improve query pruning
- C) Clusters warehouses for high availability
- D) Combines multiple databases

### Question 7
What tool does Snowflake provide to analyze slow query performance?

- A) Query Profiler (Query Profile)
- B) Performance Dashboard
- C) SQL Analyzer
- D) Execution Plan Viewer

### Question 8
Which Snowflake view shows warehouse credit usage?

- A) `INFORMATION_SCHEMA.CREDIT_USAGE`
- B) `ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY`
- C) `SNOWFLAKE.USAGE.WAREHOUSES`
- D) `SYSTEM$WAREHOUSE_CREDITS`

### Question 9
What is the cheapest way to learn Snowflake?

- A) Use a Large warehouse
- B) Use an X-Small warehouse with auto-suspend set to 60 seconds
- C) Use multi-cluster warehouses
- D) Always keep a warehouse running

### Question 10
What does the search optimization service improve?

- A) Full table scans
- B) Point lookup queries on large tables
- C) JOIN performance
- D) Data loading speed

---

## Answer Key

| Q | Answer | Explanation |
|---|--------|-------------|
| 1 | D | 4X-Large provides the most compute among these options |
| 2 | A | Auto-suspend stops the warehouse after inactivity |
| 3 | B | Result cache stores results of repeated queries |
| 4 | B | Result cache persists until underlying data changes |
| 5 | B | Micro-partitions are 50–500 MB immutable storage units |
| 6 | B | Clustering organizes micro-partitions for pruning |
| 7 | A | Query Profiler analyzes slow query performance |
| 8 | B | `WAREHOUSE_METERING_HISTORY` shows credit usage |
| 9 | B | X-Small + 60s auto-suspend minimizes cost |
| 10 | B | Search optimization speeds up selective lookups |
