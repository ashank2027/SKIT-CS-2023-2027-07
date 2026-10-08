# EcoInsight Database Layer

This directory contains the PostgreSQL database architecture for **EcoInsight (SKIT-CS-2023-2027-07)**, owned by **Bhavya Chautharamani**.

This implementation supports the MVP phase (26 September 2026) and **Phase 8: Calculator + CSV + Advanced Analytics** (as of 08 October 2026).

## Structure

```
database/
├── schema.sql                         # Complete DDL for all core MVP & Phase 8 tables
├── seed.sql                           # Realistic development dataset (120+ records, 40+ factors)
├── migrations/
│   ├── 001_initial_schema.sql          # Forward initial schema migration
│   ├── 001_initial_schema_down.sql     # Rollback initial schema migration
│   ├── 002_phase8_calculator_csv_expansion.sql      # Phase 8 factor expansion & CSV indexes
│   └── 002_phase8_calculator_csv_expansion_down.sql # Phase 8 rollback migration
├── queries/
│   ├── users.sql                      # User auth and profile queries
│   ├── emissions.sql                  # Emission CRUD and factor lookups
│   ├── csv_import.sql                 # Bulk CSV validation, lookup, and batch insert queries
│   ├── dashboard.sql                  # Aggregation queries for the dashboard
│   ├── analytics.sql                  # Time-series, location, industry, and YoY analytics
│   ├── tasks.sql                      # Background task metadata (C++ Scheduler)
│   └── reports.sql                    # Report generation metadata
└── README.md                          # This documentation
```

## Core Tables

1. `users`: Auth and profile data (Name, Email, Industry, Location, Organization).
2. `emission_categories`: Activity classification (Electricity, Transportation, Fuel, Waste, Water, Natural Gas).
3. `emission_factors`: Conversion rates across metric and imperial units (quantity -> CO2e).
4. `emission_records`: Core user emission logs.
5. `tasks`: Background compute jobs queued for the C++ scheduling engine.
6. `reports`: Generated PDF report metadata.

## Setup & Migration Instructions

Ensure PostgreSQL is running locally, then execute:

```bash
# 1. Create the database
createdb ecoinsight

# 2. Run initial schema migration
psql -U postgres -d ecoinsight -f migrations/001_initial_schema.sql

# 3. Run Phase 8 migration (Calculator + CSV expansion)
psql -U postgres -d ecoinsight -f migrations/002_phase8_calculator_csv_expansion.sql

# 4. Insert development seed data
psql -U postgres -d ecoinsight -f seed.sql
```

## Seed & Expanded Factor Dataset Summary

The database layer provides comprehensive datasets for development and testing:
- **10 users** (across different industries) — development password: `EcoInsight@2026`
- **6 categories** & **40+ emission factors** (EPA WARM v15, UK DEFRA 2024, IPCC AR6, CEA India CO2 Baseline 2024)
- **120+ emission records** covering a multi-month date range, producing realistic charts for analytics.
- **CSV & Calculator Query Engine** in `queries/csv_import.sql` and `queries/emissions.sql` with case-insensitive fast activity & unit lookups.

## Backend Integration

Node.js (Chetan) connects to this database via `pg`. All queries in `queries/` enforce strict `user_id` scoping for data isolation.
