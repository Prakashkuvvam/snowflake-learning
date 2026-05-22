---
title: "Exam Practice Test 3"
weight: 18
---
# Exam Practice Test 3 — Semi-Structured Data and Security

{{< hint info >}}
This practice test covers semi-structured data (JSON, VARIANT, FLATTEN), roles, grants, secure views, and access control.
{{< /hint >}}

## Questions

### Question 1
Which Snowflake data type is used to store semi-structured data like JSON?

- A) STRING
- B) OBJECT
- C) VARIANT
- D) ARRAY

### Question 2
How do you access a JSON field `name` from a VARIANT column `data`?

- A) `data.name`
- B) `data:name`
- C) `GET(data, 'name')`
- D) `EXTRACT(data, 'name')`

### Question 3
What does the FLATTEN function do?

- A) Compresses data for storage
- B) Expands nested arrays/objects into multiple rows
- C) Converts VARIANT to STRING
- D) Merges two tables

### Question 4
Which command creates a role in Snowflake?

- A) `CREATE ROLE analyst;`
- B) `DEFINE ROLE analyst;`
- C) `NEW ROLE analyst;`
- D) `ADD ROLE analyst;`

### Question 5
What is a future grant?

- A) A grant that expires after a set time
- B) A grant that applies to all future objects created in a schema
- C) A grant that only applies during business hours
- D) A grant that must be approved by ACCOUNTADMIN

### Question 6
What is the purpose of a secure view?

- A) It encrypts the data in the view
- B) It prevents the view definition from being shown to non-owners
- C) It requires MFA to access
- D) It is only accessible from specific IPs

### Question 7
Which of the following correctly grants SELECT on all tables in a schema?

- A) `GRANT SELECT ON ALL TABLES IN SCHEMA ... TO ROLE ...;`
- B) `GRANT SELECT ON SCHEMA ... TO ROLE ...;`
- C) `GRANT ALL TABLES TO ROLE ...;`
- D) `GRANT TABLE ACCESS TO ROLE ...;`

### Question 8
What is a row access policy?

- A) Limits which rows a user can query based on a condition
- B) Encrypts individual rows
- C) Creates read-only rows
- D) Copies rows to another table

### Question 9
What does the LATERAL keyword do when used with FLATTEN?

- A) Creates a horizontal join
- B) Allows the FLATTEN to reference columns from preceding tables in the FROM clause
- C) Flips rows and columns
- D) Improves query performance

### Question 10
Which role is typically used for day-to-day object creation and management?

- A) ACCOUNTADMIN
- B) SECURITYADMIN
- C) SYSADMIN
- D) PUBLIC

---

## Answer Key

| Q | Answer | Explanation |
|---|--------|-------------|
| 1 | C | VARIANT is the data type for semi-structured data |
| 2 | B | Colon notation `data:name` accesses JSON fields |
| 3 | B | FLATTEN expands nested arrays/objects into rows |
| 4 | A | `CREATE ROLE role_name;` creates a new role |
| 5 | B | Future grants apply to all future objects in a schema |
| 6 | B | Secure views hide the view definition from non-owners |
| 7 | A | `GRANT SELECT ON ALL TABLES IN SCHEMA ...` |
| 8 | A | Row access policies filter rows based on conditions |
| 9 | B | LATERAL lets FLATTEN reference preceding FROM columns |
| 10 | C | SYSADMIN is used for day-to-day object management |
