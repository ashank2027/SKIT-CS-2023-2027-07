# EcoInsight Database Layer

This directory contains the PostgreSQL database architecture for **EcoInsight (SKIT-CS-2023-2027-07)**, owned by **Bhavya Chautharamani**.

This implementation supports the current MVP phase (Target: 26 September 2026).

## Structure

```
database/
├── schema.sql                     # Complete DDL for all core MVP tables
├── seed.sql                       # Realistic development dataset (120+ records)
├── migrations/
│   ├── 001_initial_schema.sql      # Forward migration
│   └── 001_initial_schema_down.sql # Rollback migration
├── queries/
│   ├── users.sql                  # User auth and profile queries
│   ├── emissions.sql              # Emission CRUD and factor lookups
│   ├── dashboard.sql              # Aggregation queries for the dashboard
│   ├── analytics.sql              # Time-series and breakdown analytics
│   ├── tasks.sql                  # Background task metadata (C++ Scheduler)
│   └── reports.sql                # Report generation metadata
└── README.md                      # This documentation
```

## Core Tables (MVP)

1. `users`: Auth and profile data.
2. `emission_categories`: Activities classification (Electricity, Transport, etc).
3. `emission_factors`: Conversion rates (quantity -> CO2e).
4. `emission_records`: Actual user emission logs.
5. `tasks`: Jobs queued for the C++ scheduling engine.
6. `reports`: Generated PDF report metadata.

## Setup Instructions

Ensure PostgreSQL is running locally, then execute:

```bash
# 1. Create the database
createdb ecoinsight

# 2. Run the initial migration (or schema.sql)
psql -U postgres -d ecoinsight -f migrations/001_initial_schema.sql

# 3. Insert development seed data
psql -U postgres -d ecoinsight -f seed.sql
```

## Seed Data Summary

The `seed.sql` file provides realistic data for immediate frontend/backend development:
- **10 users** (across different industries) — password: `EcoInsight@2026`
- **6 categories** & **18 emission factors**
- **123 emission records** covering a 7-month date range, producing realistic charts for analytics.

## Backend Integration

Node.js (Chetan) should connect to this database via `pg` or an ORM. The queries in the `queries/` folder serve as a blueprint for the exact SQL needed to satisfy the API contract. All queries enforce `user_id` scoping to ensure data isolation.
