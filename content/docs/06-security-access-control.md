---
title: "Chapter 5: Security & Access Control"
weight: 6
bookFlatSection: false
bookToc: true
---

# Chapter 5: Security & Access Control

## 🎯 Learning Objectives

- Design a role hierarchy for your Snowflake account
- Create users, roles, and grant appropriate privileges
- Use future grants to automate permissions
- Implement secure views for data protection
- Create row access policies
- Apply masking policies to sensitive data

---

## 5.1 Role-Based Access Control (RBAC)

Snowflake uses **Role-Based Access Control (RBAC)** — permissions are assigned to roles, and roles are assigned to users.

### Standard Role Hierarchy

```
ORGADMIN
  └── ACCOUNTADMIN
       ├── SYSADMIN         ← Creates and manages objects
       │    └── <CUSTOM_ROLES> ← Organization-specific roles
       └── SECURITYADMIN
            └── USERADMIN    ← Creates users and roles
```

### Creating Custom Roles

```sql
-- Create a role hierarchy for a data platform
CREATE ROLE data_engineer;
CREATE ROLE data_analyst;
CREATE ROLE reporting_user;
CREATE ROLE data_scientist;

-- Build role hierarchy (engineers manage analysts, etc.)
GRANT ROLE data_analyst TO ROLE data_engineer;
GRANT ROLE reporting_user TO ROLE data_analyst;
GRANT ROLE data_engineer TO ROLE SYSADMIN;

-- Create users and assign primary roles
CREATE USER alice
  PASSWORD = 'secure_pass_123'
  DEFAULT_ROLE = data_analyst
  MUST_CHANGE_PASSWORD = TRUE;

CREATE USER bob
  PASSWORD = 'secure_pass_456'
  DEFAULT_ROLE = data_engineer
  MUST_CHANGE_PASSWORD = TRUE;

-- Assign roles to users
GRANT ROLE data_analyst TO USER alice;
GRANT ROLE data_engineer TO USER bob;
GRANT ROLE reporting_user TO USER alice;
```

### Effective Privileges

When Bob assumes `data_engineer`, he gets:
- All privileges granted directly to `data_engineer`
- All privileges granted to `data_analyst` (because it's in the hierarchy)
- All privileges granted to `reporting_user`

---

## 5.2 Granting Privileges

### Object-Level Privileges

```sql
-- Grant usage at each level of the object hierarchy
GRANT USAGE ON DATABASE sales_db TO ROLE data_analyst;
GRANT USAGE ON SCHEMA sales_db.analytics TO ROLE data_analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA sales_db.analytics TO ROLE data_analyst;
GRANT SELECT ON ALL VIEWS IN SCHEMA sales_db.analytics TO ROLE data_analyst;

-- Grant additional privileges to engineers
GRANT USAGE ON SCHEMA sales_db.raw TO ROLE data_engineer;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA sales_db.raw TO ROLE data_engineer;
GRANT CREATE TABLE ON SCHEMA sales_db.analytics TO ROLE data_engineer;

-- Grant warehouse privileges
GRANT USAGE ON WAREHOUSE analytics_wh TO ROLE data_analyst;
GRANT OPERATE ON WAREHOUSE analytics_wh TO ROLE data_engineer;
GRANT MONITOR ON WAREHOUSE analytics_wh TO ROLE data_analyst;
```

### Future Grants

Future grants automatically apply to new objects created in the future:

```sql
-- All new tables in analytics schema are auto-granted
GRANT SELECT ON FUTURE TABLES IN SCHEMA sales_db.analytics TO ROLE data_analyst;
GRANT SELECT ON FUTURE VIEWS IN SCHEMA sales_db.analytics TO ROLE data_analyst;

-- Future schemas in a database
GRANT USAGE ON FUTURE SCHEMAS IN DATABASE sales_db TO ROLE data_analyst;
```

| Grant Type | Applies To | Existing Objects? | Future Objects? |
|------------|-----------|-------------------|-----------------|
| `GRANT ... ON TABLE` | Existing tables | ✅ | ❌ |
| `GRANT ... ON ALL TABLES` | Current tables | ✅ | ❌ |
| `GRANT ... ON FUTURE TABLES` | New tables | ❌ | ✅ |

---

## 5.3 Secure Views

**Secure views** hide the view definition (SQL text) from non-owners, and they optimize performance by not sharing predicate information:

```sql
-- Standard view (anyone with SELECT can see the definition)
CREATE VIEW analytics.customer_details AS
SELECT customer_id, first_name, last_name, email, signup_date, status
FROM raw.customers;

-- Secure view (definition hidden, optimized for sensitive data)
CREATE SECURE VIEW analytics.customer_revenue AS
SELECT
  customer_id,
  SUM(total_amount) AS lifetime_value,
  COUNT(*) AS order_count
FROM raw.orders
GROUP BY customer_id
HAVING lifetime_value > 100;

-- Non-owners see: "Secure View" in SHOW VIEWS, no SHOW VIEW definition access
SHOW VIEWS LIKE '%customer_revenue%';
DESC VIEW analytics.customer_revenue;  -- Shows columns only, not SQL
```

### When to Use Secure Views

| Use Case | Secure View? |
|----------|--------------|
| Hiding PII from certain roles | ✅ Yes |
| Protecting revenue/profit formulas | ✅ Yes |
| Simple filtering for data access | ❌ No (use regular view) |
| Performance-critical queries | ✅ Yes (predicate pushdown avoided) |

---

## 5.4 Row Access Policies

**Row access policies** restrict which rows a user can see within a table, based on their role or other attributes:

```sql
-- Create a row access policy
CREATE ROW ACCESS POLICY customer_access AS
(customer_status VARCHAR) RETURNS BOOLEAN ->
  CURRENT_ROLE() IN ('ACCOUNTADMIN', 'SYSADMIN', 'DATA_ENGINEER')
  OR customer_status = 'ACTIVE';

-- Apply the policy to a table
ALTER TABLE raw.customers
  SET ROW ACCESS POLICY customer_access ON (status);

-- Users with data_analyst role can only see ACTIVE customers
-- Users with data_engineer role can see ALL customers
-- This is checked at query time — transparent to the user
```

### More Complex Policy

```sql
-- Policy based on user attribute mapping
CREATE TABLE admin.customer_access_map (
  customer_id INTEGER,
  granted_role VARCHAR
);

CREATE ROW ACCESS POLICY mapped_access AS
(customer_id INTEGER) RETURNS BOOLEAN ->
  CURRENT_ROLE() IN ('ACCOUNTADMIN')
  OR EXISTS (
    SELECT 1 FROM admin.customer_access_map m
    WHERE m.customer_id = customer_id
      AND m.granted_role = CURRENT_ROLE()
  );

ALTER TABLE raw.customers
  SET ROW ACCESS POLICY mapped_access ON (customer_id);
```

---

## 5.5 Masking Policies

**Masking policies** control how sensitive data is displayed based on the user's role:

```sql
-- Create a masking policy for PII
CREATE MASKING POLICY email_mask AS
(val STRING) RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('ACCOUNTADMIN', 'SYSADMIN', 'DATA_ENGINEER')
      THEN val  -- Full access for admins/engineers
    WHEN CURRENT_ROLE() = 'DATA_ANALYST'
      THEN CONCAT(LEFT(val, 3), '****@***')  -- Partial mask
    ELSE '***MASKED***'  -- Fully masked
  END;

-- Apply to table column
ALTER TABLE raw.customers
  MODIFY COLUMN email
  SET MASKING POLICY email_mask;

-- Create a numeric masking policy
CREATE MASKING POLICY salary_mask AS
(val NUMBER) RETURNS NUMBER ->
  CASE
    WHEN CURRENT_ROLE() IN ('ACCOUNTADMIN', 'DATA_ENGINEER')
      THEN val  -- Full value
    WHEN CURRENT_ROLE() = 'DATA_ANALYST'
      THEN ROUND(val, -3)  -- Round to nearest 1000
    ELSE 0  -- Zero for others
  END;

ALTER TABLE raw.employees
  MODIFY COLUMN salary
  SET MASKING POLICY salary_mask;
```

### Removing Policies

```sql
-- Unset a masking policy
ALTER TABLE raw.customers
  MODIFY COLUMN email
  UNSET MASKING POLICY;

-- Drop a masking policy (remove from all columns first)
DROP MASKING POLICY email_mask;
```

---

## 5.6 Authentication Options

### Multi-Factor Authentication (MFA)

```sql
-- Force MFA for a user
ALTER USER alice SET MINS_TO_UNLOCK = 10;
-- MFA is managed in Snowflake UI under account settings

-- Require MFA for specific roles
-- (Set in the web interface: Admin → Security → Authentication)
```

### Key-Pair Authentication

```sql
-- 1. Generate RSA key pair
-- openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt
-- openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub

-- 2. Assign public key to user
ALTER USER alice SET RSA_PUBLIC_KEY = 'MIIBIjANBgkqhkiG9w0BAQ...';

-- 3. Connect using private key
-- snowsql -a myaccount -u alice --private-key-path rsa_key.p8
```

### SSO / Federated Authentication

```sql
-- Configure SAML-based SSO in the web interface:
-- Admin → Security → Authentication → Add IdP
-- Supported: Okta, Azure AD, ADFS, Ping, and custom SAML 2.0
```

---

## 5.7 Network Policies

```sql
-- Restrict access to specific IP ranges
CREATE NETWORK POLICY office_only
  ALLOWED_IP_LIST = ('203.0.113.0/24', '198.51.100.0/24')
  BLOCKED_IP_LIST = ('203.0.113.100');

-- Apply to account
ALTER ACCOUNT SET NETWORK POLICY = office_only;

-- Apply to specific user
ALTER USER alice SET NETWORK POLICY = office_only;
```

---

## 5.8 Security Best Practices

| Practice | Implementation |
|----------|---------------|
| **Never use root** | Create IAM admin user first |
| **Use MFA** | Required for all users |
| **Apply least privilege** | Grant minimum permissions needed |
| **Use role hierarchy** | Combine permissions through roles |
| **Audit regularly** | Review granted privileges quarterly |
| **Mask PII** | Apply masking policies to sensitive columns |
| **Use secure views** | Hide sensitive business logic |
| **Network policies** | Restrict by IP range |
| **Key-pair auth** | For automated processes |
| **Rotate credentials** | Regular rotation of passwords and keys |

---

## ✅ Chapter 5 Quiz

1. **What does RBAC stand for in Snowflake?**
   - a) Role-Based Access Control
   - b) Relational Business Access Control
   - c) Resource-Based Architecture Control
   - d) Role-Binding Access Configuration

2. **How do future grants differ from regular grants?**
   - a) They expire after a set time
   - b) They apply to new objects created in the future
   - c) They only work for databases
   - d) They are less secure

3. **What does a masking policy do?**
   - a) Hides entire tables from users
   - b) Controls how column values are displayed based on role
   - c) Masks the server IP address
   - d) Prevents data loading

4. **Which role should you assign to a user who manages objects?**
   - a) ACCOUNTADMIN
   - b) SYSADMIN
   - c) SECURITYADMIN
   - d) PUBLIC

5. **True or False:** A row access policy restricts which rows a user can see in a table.

<details>
<summary>📌 Answers</summary>

1. **a** — Role-Based Access Control
2. **b** — Future grants auto-apply to newly created objects
3. **b** — Masking policies control column value display based on role
4. **b** — SYSADMIN is for object management; ACCOUNTADMIN has full access
5. **True** — Row access policies filter rows based on user attributes or roles
</details>

---

## 📚 Additional Resources

- [Access Control Overview](https://docs.snowflake.com/en/user-guide/security-access-control-overview)
- [Row Access Policies](https://docs.snowflake.com/en/user-guide/security-row-intro)
- [Masking Policies](https://docs.snowflake.com/en/user-guide/security-column-intro)
- [Network Policies](https://docs.snowflake.com/en/user-guide/network-policies)

---

*Next → [Chapter 6: Time Travel & Cloning]({{< relref "07-time-travel-cloning" >}})*
