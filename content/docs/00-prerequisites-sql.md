---
title: "🧱 Prerequisites: SQL Foundation"
weight: 0
bookFlatSection: false
bookToc: true
---

# 🧱 Prerequisites: SQL Foundation

> This chapter covers **everything you need to know about SQL before diving into Snowflake**. If you're new to SQL or need a refresher, this chapter provides the foundation for all subsequent Snowflake topics.

## 🎯 Learning Objectives

- Understand relational database concepts
- Master SELECT, WHERE, GROUP BY, and ORDER BY
- Use JOINs to combine data from multiple tables
- Write CTEs and subqueries
- Use window functions for analytical queries
- Apply date/time and string functions
- Understand NULL handling and data types

---

## 1. Relational Database Concepts

### Tables, Rows, and Columns

A **relational database** stores data in **tables** — think of a table like a spreadsheet:

```sql
-- A table called "employees" with columns and rows
SELECT * FROM employees;

 employee_id | first_name | last_name | department | salary | hire_date
-------------+------------+-----------+------------+--------+------------
           1 | Alice      | Johnson   | Engineering|  95000 | 2021-03-15
           2 | Bob        | Smith     | Marketing  |  72000 | 2022-07-01
           3 | Charlie    | Brown     | Engineering|  88000 | 2020-11-20
```

| Term | Definition |
|------|------------|
| **Table** | A collection of related data organized in rows and columns |
| **Row** | A single record (e.g., one employee) |
| **Column** | A single attribute (e.g., `first_name`) |
| **Primary Key** | Uniquely identifies each row |
| **Foreign Key** | References a primary key in another table |
| **Schema** | A logical grouping of tables inside a database |

### Data Types

SQL data types define what kind of data a column can hold:

| Category | Types | Example |
|----------|-------|---------|
| Numeric | `INT`, `BIGINT`, `DECIMAL`, `FLOAT` | `salary DECIMAL(10,2)` |
| String | `VARCHAR`, `CHAR`, `TEXT` | `name VARCHAR(100)` |
| Date/Time | `DATE`, `TIMESTAMP`, `TIME` | `created_at TIMESTAMP` |
| Boolean | `BOOLEAN` | `is_active BOOLEAN` |
| Semi-structured | `VARIANT`, `OBJECT`, `ARRAY` (Snowflake) | `data VARIANT` |

---

## 2. Basic SELECT Statements

### SELECT and WHERE

```sql
-- Select specific columns
SELECT first_name, last_name, salary
FROM employees;

-- Filter with WHERE
SELECT *
FROM employees
WHERE department = 'Engineering';

-- Multiple conditions
SELECT *
FROM employees
WHERE department = 'Engineering'
  AND salary > 80000;

-- IN operator
SELECT *
FROM employees
WHERE department IN ('Engineering', 'Data Science');

-- LIKE for pattern matching
SELECT *
FROM employees
WHERE last_name LIKE 'S%';  -- Starts with 'S'
```

### ORDER BY and LIMIT

```sql
-- Sort results
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC;

-- Limit the number of rows
SELECT *
FROM employees
ORDER BY hire_date DESC
LIMIT 5;
```

### DISTINCT and NULL Handling

```sql
-- Get unique values
SELECT DISTINCT department
FROM employees;

-- NULL handling
SELECT *
FROM employees
WHERE salary IS NOT NULL;

-- COALESCE: replace NULL with a default
SELECT first_name, COALESCE(salary, 0) AS salary
FROM employees;
```

---

## 3. GROUP BY and Aggregate Functions

Aggregate functions perform calculations across multiple rows and return a single value.

```sql
-- Common aggregate functions
SELECT
  COUNT(*) AS total_employees,
  AVG(salary) AS avg_salary,
  MAX(salary) AS max_salary,
  MIN(salary) AS min_salary,
  SUM(salary) AS total_salary
FROM employees;
```

### GROUP BY

```sql
-- Group by department
SELECT
  department,
  COUNT(*) AS employee_count,
  AVG(salary) AS avg_salary,
  SUM(salary) AS total_salary
FROM employees
GROUP BY department;
```

| department | employee_count | avg_salary | total_salary |
|------------|----------------|------------|--------------|
| Engineering | 2 | 91500.00 | 183000.00 |
| Marketing | 1 | 72000.00 | 72000.00 |

### HAVING (filter groups)

`HAVING` filters after grouping (like `WHERE` for groups):

```sql
SELECT
  department,
  COUNT(*) AS employee_count
FROM employees
GROUP BY department
HAVING COUNT(*) > 1;
```

> **Key difference:** `WHERE` filters rows **before** grouping, `HAVING` filters groups **after** grouping.

---

## 4. JOINs

JOINs combine rows from two or more tables based on a related column.

### Sample Tables

```sql
-- employees table
 employee_id | first_name | department_id | salary
-------------+------------+---------------+--------
           1 | Alice      |             1 |  95000
           2 | Bob        |             2 |  72000
           3 | Charlie    |             1 |  88000

-- departments table
 department_id | department_name
---------------+-----------------
             1 | Engineering
             2 | Marketing
             3 | Sales
```

### INNER JOIN

Returns only rows that match in both tables:

```sql
SELECT e.first_name, e.salary, d.department_name
FROM employees e
INNER JOIN departments d
  ON e.department_id = d.department_id;
```

| first_name | salary | department_name |
|------------|--------|-----------------|
| Alice | 95000 | Engineering |
| Bob | 72000 | Marketing |
| Charlie | 88000 | Engineering |

### LEFT JOIN (LEFT OUTER JOIN)

Returns all rows from the left table, with matching rows from the right (NULL if no match):

```sql
SELECT d.department_name, e.first_name
FROM departments d
LEFT JOIN employees e
  ON d.department_id = e.department_id;
```

| department_name | first_name |
|-----------------|------------|
| Engineering | Alice |
| Engineering | Charlie |
| Marketing | Bob |
| Sales | NULL |

### RIGHT JOIN and FULL OUTER JOIN

```sql
-- RIGHT JOIN: all rows from right table
SELECT e.first_name, d.department_name
FROM employees e
RIGHT JOIN departments d
  ON e.department_id = d.department_id;

-- FULL OUTER JOIN: all rows from both tables
SELECT e.first_name, d.department_name
FROM employees e
FULL OUTER JOIN departments d
  ON e.department_id = d.department_id;
```

### CROSS JOIN

Returns the Cartesian product (every row from A × every row from B):

```sql
SELECT e.first_name, d.department_name
FROM employees e
CROSS JOIN departments d;
```

### Self JOIN

A table joined with itself:

```sql
-- Find employees who are in the same department
SELECT a.first_name AS employee, b.first_name AS colleague
FROM employees a
JOIN employees b
  ON a.department_id = b.department_id
  AND a.employee_id < b.employee_id;
```

---

## 5. Subqueries

A **subquery** is a query nested inside another query.

### Subquery in WHERE

```sql
-- Find employees with salary above the average
SELECT first_name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
```

### Subquery in FROM (Derived Table)

```sql
-- Find departments with above-average employee count
SELECT department_name, employee_count
FROM (
  SELECT
    d.department_name,
    COUNT(*) AS employee_count
  FROM employees e
  JOIN departments d ON e.department_id = d.department_id
  GROUP BY d.department_name
) dept_stats
WHERE employee_count > 1;
```

### Correlated Subquery

A subquery that references the outer query:

```sql
-- Find employees who earn more than the avg in their department
SELECT e.first_name, e.salary, e.department_id
FROM employees e
WHERE salary > (
  SELECT AVG(salary)
  FROM employees
  WHERE department_id = e.department_id
);
```

### EXISTS and NOT EXISTS

```sql
-- Find departments that have at least one employee
SELECT department_name
FROM departments d
WHERE EXISTS (
  SELECT 1
  FROM employees e
  WHERE e.department_id = d.department_id
);
```

---

## 6. Common Table Expressions (CTEs)

CTEs make complex queries more readable by breaking them into named steps:

```sql
WITH dept_stats AS (
  SELECT
    department_id,
    COUNT(*) AS employee_count,
    AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department_id
)
SELECT
  d.department_name,
  ds.employee_count,
  ds.avg_salary
FROM dept_stats ds
JOIN departments d ON ds.department_id = d.department_id
ORDER BY ds.avg_salary DESC;
```

### Multiple CTEs

```sql
WITH
high_salary AS (
  SELECT * FROM employees WHERE salary > 80000
),
engineering_high AS (
  SELECT * FROM high_salary
  WHERE department_id = 1
)
SELECT first_name, salary FROM engineering_high;
```

### Recursive CTE

```sql
-- Generate a sequence of numbers
WITH RECURSIVE numbers(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 10
)
SELECT n FROM numbers;
```

---

## 7. Window Functions

Window functions perform calculations across a set of rows related to the current row — **without collapsing rows like GROUP BY**.

### ROW_NUMBER, RANK, DENSE_RANK

```sql
SELECT
  first_name,
  department_id,
  salary,
  ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
  RANK() OVER (ORDER BY salary DESC) AS rank,
  DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rank
FROM employees;
```

| first_name | department_id | salary | row_num | rank | dense_rank |
|------------|---------------|--------|---------|------|------------|
| Alice | 1 | 95000 | 1 | 1 | 1 |
| Charlie | 1 | 88000 | 2 | 2 | 2 |
| Bob | 2 | 72000 | 3 | 3 | 3 |

### PARTITION BY

```sql
-- Rank employees within each department
SELECT
  first_name,
  department_id,
  salary,
  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dept_rank
FROM employees;
```

### Aggregate Window Functions

```sql
SELECT
  first_name,
  department_id,
  salary,
  AVG(salary) OVER (PARTITION BY department_id) AS dept_avg,
  MAX(salary) OVER (PARTITION BY department_id) AS dept_max,
  SUM(salary) OVER (PARTITION BY department_id) AS dept_total
FROM employees;
```

### LEAD and LAG

Access data from the next or previous row:

```sql
SELECT
  first_name,
  hire_date,
  LAG(hire_date) OVER (ORDER BY hire_date) AS prev_hire,
  LEAD(hire_date) OVER (ORDER BY hire_date) AS next_hire
FROM employees;
```

### FIRST_VALUE and LAST_VALUE

```sql
SELECT
  first_name,
  department_id,
  salary,
  FIRST_VALUE(salary) OVER (PARTITION BY department_id ORDER BY salary DESC) AS highest_in_dept,
  LAST_VALUE(salary) OVER (PARTITION BY department_id ORDER BY salary DESC
    RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS lowest_in_dept
FROM employees;
```

---

## 8. Date/Time Functions

```sql
-- Current date and time
SELECT CURRENT_DATE, CURRENT_TIMESTAMP;

-- Extract parts
SELECT
  hire_date,
  EXTRACT(YEAR FROM hire_date) AS year,
  EXTRACT(MONTH FROM hire_date) AS month,
  EXTRACT(DAY FROM hire_date) AS day
FROM employees;

-- Date arithmetic
SELECT
  hire_date,
  hire_date + INTERVAL '30 days' AS plus_30_days,
  hire_date - INTERVAL '1 year' AS minus_1_year,
  DATEDIFF('days', hire_date, CURRENT_DATE) AS days_since_hire
FROM employees;

-- Date truncation
SELECT DATE_TRUNC('month', hire_date) AS month_start
FROM employees;
```

---

## 9. String Functions

```sql
-- Concatenation
SELECT first_name || ' ' || last_name AS full_name
FROM employees;

-- Case conversion
SELECT UPPER(first_name), LOWER(last_name)
FROM employees;

-- Substring
SELECT SUBSTRING(first_name, 1, 3) AS short_name
FROM employees;

-- TRIM, REPLACE, LENGTH
SELECT
  TRIM('  hello  ') AS trimmed,
  REPLACE('hello world', 'world', 'SQL') AS replaced,
  LENGTH('hello') AS len;
```

---

## 10. CASE Statements

```sql
SELECT
  first_name,
  salary,
  CASE
    WHEN salary < 50000 THEN 'Low'
    WHEN salary BETWEEN 50000 AND 100000 THEN 'Medium'
    ELSE 'High'
  END AS salary_band
FROM employees;
```

---

## 11. UNION and SET Operations

```sql
-- UNION (deduplicates)
SELECT first_name FROM employees_2023
UNION
SELECT first_name FROM employees_2024;

-- UNION ALL (keeps duplicates)
SELECT first_name FROM employees_2023
UNION ALL
SELECT first_name FROM employees_2024;
```

---

## 12. Snowflake-Specific SQL Extensions

Snowflake supports standard SQL plus these additions you'll encounter:

| Extension | Purpose | Example |
|-----------|---------|---------|
| `QUALIFY` | Filter window functions (like HAVING for windows) | `QUALIFY ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) = 1` |
| `LATERAL` | Join with a subquery that references preceding FROM items | `LEFT JOIN LATERAL FLATTEN(...)` |
| `SAMPLE` | Get a random sample of rows | `SELECT * FROM employees SAMPLE (10%)` |
| `PIVOT`/`UNPIVOT` | Rotate rows to columns and vice versa | `SELECT * FROM sales PIVOT(SUM(amount) FOR month IN (...))` |

---

## ✅ SQL Mastery Checklist

- [ ] Can write SELECT with WHERE, GROUP BY, ORDER BY
- [ ] Can use INNER, LEFT, RIGHT, and FULL JOINs
- [ ] Can write subqueries in WHERE, FROM, and SELECT
- [ ] Can write CTEs with multiple steps
- [ ] Can use ROW_NUMBER, RANK, and aggregate window functions
- [ ] Can write CASE statements
- [ ] Can use date/time functions
- [ ] Understands NULL behavior in SQL

---

## 📝 Practice Problems

### Problem 1: Employee Analysis

```sql
-- Given tables: employees(id, name, dept_id, salary, hire_date)
--             departments(id, name)

-- 1. Find the top 3 highest-paid employees in each department
-- 2. Calculate the running total of salary by hire date
-- 3. Find departments where the average salary is above the company average
-- 4. Find employees hired in the last 90 days
```

### Problem 2: Sales Analysis

```sql
-- Given tables: orders(id, customer_id, order_date, total)
--             customers(id, name, signup_date)

-- 1. Find the total revenue per customer
-- 2. Find customers who haven't ordered in 6 months
-- 3. Show month-over-month revenue growth
-- 4. Find the top 10% of customers by total spend
```

---

## 📚 Additional Resources

- [Snowflake SQL Reference](https://docs.snowflake.com/en/sql-reference)
- [SQL Tutorial (W3Schools)](https://www.w3schools.com/sql/)
- [PostgreSQL Tutorial (excellent for SQL practice)](https://www.postgresqltutorial.com/)
- [LeetCode SQL Problems](https://leetcode.com/problemset/database/)

---

*Next → [🚀 Start Here: Your Snowflake Journey]({{< relref "01-start-here" >}})*
