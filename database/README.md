# EcoInsight Database Layer

This directory contains the PostgreSQL database architecture for **EcoInsight (SKIT-CS-2023-2027-07)**, owned by **Bhavya Chautharamani**.

This implementation supports the MVP phase (26 September 2026), **Phase 8: Calculator + CSV + Advanced Analytics** (08 October 2026), and **Phase 9: AI Copilot Architecture, Full-Text Search & Token Rate-Limiting** (24 October – 05 November 2026).

## Structure

```
database/
├── schema.sql                         # Complete DDL for all core MVP, Phase 8 & Phase 9 tables
├── seed.sql                           # Realistic development dataset (120+ records, 40+ factors, AI chats)
├── migrations/
│   ├── 001_initial_schema.sql          # Forward initial schema migration
│   ├── 001_initial_schema_down.sql     # Rollback initial schema migration
│   ├── 002_phase8_calculator_csv_expansion.sql      # Phase 8 factor expansion & CSV indexes
│   ├── 002_phase8_calculator_csv_expansion_down.sql # Phase 8 rollback migration
│   ├── 003_phase9_ai_copilot.sql       # Phase 9 AI conversations & messages schema
│   ├── 003_phase9_ai_copilot_down.sql  # Phase 9 rollback migration
│   ├── 004_phase9_ai_search_and_tokens.sql      # Phase 9 full-text search GIN & token indexes
│   └── 004_phase9_ai_search_and_tokens_down.sql # Phase 9 rollback migration
├── queries/
│   ├── users.sql                      # User auth and profile queries
│   ├── emissions.sql                  # Emission CRUD and factor lookups
│   ├── csv_import.sql                 # Bulk CSV validation, lookup, and batch insert queries
│   ├── dashboard.sql                  # Aggregation queries for the dashboard
│   ├── analytics.sql                  # Time-series, location, industry, and YoY analytics
│   ├── ai.sql                         # AI Copilot conversations, full-text search, and token rate-limiting
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
7. `ai_conversations`: User chat sessions with the AI Copilot.
8. `ai_messages`: Sequential conversational messages (user, assistant, system) with token counts.

## Setup & Migration Instructions

Ensure PostgreSQL is running locally, then execute:

```bash
# 1. Create the database
createdb ecoinsight

# 2. Run initial schema migration
psql -U postgres -d ecoinsight -f migrations/001_initial_schema.sql

# 3. Run Phase 8 migration (Calculator + CSV expansion)
psql -U postgres -d ecoinsight -f migrations/002_phase8_calculator_csv_expansion.sql

# 4. Run Phase 9 migration (AI Copilot chat persistence)
psql -U postgres -d ecoinsight -f migrations/003_phase9_ai_copilot.sql

# 5. Run Phase 9 Search & Rate-Limiting migration (GIN full-text search & token indexes)
psql -U postgres -d ecoinsight -f migrations/004_phase9_ai_search_and_tokens.sql

# 6. Insert development seed data
psql -U postgres -d ecoinsight -f seed.sql
```

## Seed & Expanded Factor Dataset Summary

The database layer provides comprehensive datasets for development and testing:
- **10 users** (across different industries) — development password: `EcoInsight@2026`
- **6 categories** & **40+ emission factors** (EPA WARM v15, UK DEFRA 2024, IPCC AR6, CEA India CO2 Baseline 2024)
- **120+ emission records** covering a multi-month date range, producing realistic charts for analytics.
- **CSV & Calculator Query Engine** in `queries/csv_import.sql` and `queries/emissions.sql` with case-insensitive fast activity & unit lookups.
- **AI Copilot Threads** in `queries/ai.sql` and `seed.sql` with realistic user questions and structured sustainability advice.
- **Full-Text Search Engine** in `queries/ai.sql` with English dictionary GIN indexes, `ts_rank` relevance scoring, and highlighted snippet generation (`ts_headline`).
- **Token Rate-Limiting & Quota Auditing** in `queries/ai.sql` with atomic daily/monthly/window aggregations for API protection.
- **Automated Gemini Context Builder** in `queries/ai.sql` summarizing 30-day emissions and top emitting categories for prompt context injection.

## Backend Integration

Node.js (Chetan) connects to this database via `pg`. All queries in `queries/` enforce strict `user_id` scoping for data isolation.

