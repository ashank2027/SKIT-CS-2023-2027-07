# EcoInsight Database Layer

This directory contains the PostgreSQL database architecture for **EcoInsight (SKIT-CS-2023-2027-07)**, designed and owned by **Bhavya Chautharamani** (Lead Database Engineer).

This implementation supports:
- **MVP Phase** (26 September 2026): Core authentication, emission logs, and KPI dashboard.
- **Phase 8: Calculator + CSV + Advanced Analytics** (08 October 2026): 40+ international factors, bulk import engine, and multi-dimensional analytics.
- **Phase 9: AI Copilot Architecture, Search, Token Rate-Limiting & Real-Time Streaming** (24 October – 20 November 2026): SSE streaming lifecycle, latency SLA percentiles, and multi-turn context budgeting.
- **Phase 10: Forecasting Data Layer & Historical Feeds** (21 November – 18 December 2026): Time-series model feeds, 90-day predictive projections, confidence intervals, and actual-vs-predicted comparative analysis.
- **Phase 11: Reports & PDF Export Metadata** (19 December – 30 December 2026): Background scheduler task linkage, audit downloads, PDF payload tracking, and single-query comprehensive period reporting.

## Structure

```
database/
├── schema.sql                         # Complete DDL for all 9 core tables, constraints & triggers
├── seed.sql                           # Comprehensive development dataset (144 records, 40+ factors, chats, forecasts, reports)
├── migrations/
│   ├── 001_initial_schema.sql          # Forward initial schema migration (MVP)
│   ├── 001_initial_schema_down.sql     # Rollback initial schema migration
│   ├── 002_phase8_calculator_csv_expansion.sql      # Phase 8 factor expansion & fast CSV indexes
│   ├── 002_phase8_calculator_csv_expansion_down.sql # Phase 8 rollback migration
│   ├── 003_phase9_ai_copilot.sql       # Phase 9 AI conversations & messages schema
│   ├── 003_phase9_ai_copilot_down.sql  # Phase 9 rollback migration
│   ├── 004_phase9_ai_search_and_tokens.sql      # Phase 9 full-text search GIN & token indexes
│   ├── 004_phase9_ai_search_and_tokens_down.sql # Phase 9 search & token rollback migration
│   ├── 005_phase9_ai_streaming_integration.sql      # Phase 9 real-time streaming, latency & SLA indexes
│   ├── 005_phase9_ai_streaming_integration_down.sql # Phase 9 streaming rollback migration
│   ├── 006_phase10_forecasting.sql     # Phase 10 predictive forecasts table & indexes
│   ├── 006_phase10_forecasting_down.sql# Phase 10 rollback migration
│   ├── 007_phase11_reports_expansion.sql      # Phase 11 expanded report metadata & scheduler linking
│   └── 007_phase11_reports_expansion_down.sql # Phase 11 rollback migration
├── queries/
│   ├── users.sql                      # User auth, registration, and profile queries
│   ├── emissions.sql                  # Emission CRUD, batch import, and factor lookups
│   ├── csv_import.sql                 # Bulk CSV validation, lookup, and batch insert queries
│   ├── dashboard.sql                  # Summary KPI metrics, trends, and category donut queries
│   ├── analytics.sql                  # Time-series, location, industry, and YoY analytics
│   ├── ai.sql                         # AI Copilot conversations, full-text search, token rate-limiting & streaming
│   ├── forecasts.sql                  # Historical training feeds, 90-day predictions, and accuracy metrics
│   ├── tasks.sql                      # C++ Scheduler task queue, lifecycle states, and worker locks
│   └── reports.sql                    # PDF export metadata, comprehensive period aggregation & audit queries
├── tests/
│   ├── test_phase9_streaming_integration.sql # Phase 9 streaming & SLA benchmark test suite
│   ├── test_phase10_forecasting.sql          # Phase 10 forecasting schema & accuracy verification suite
│   └── test_phase11_reports_expansion.sql    # Phase 11 report metadata & comprehensive PDF query suite
└── README.md                          # This architecture and operations documentation
```

## Core Tables (9 Tables)

1. `users`: Account identity, credentials, industry sector, and organization.
2. `emission_categories`: 6 core environmental sectors (Electricity, Transportation, Fuel, Waste, Water, Natural Gas).
3. `emission_factors`: 40+ international conversion factors across metric and imperial units.
4. `emission_records`: Core historical user emission logs with fast multi-column indexes.
5. `tasks`: Background compute jobs queued for Ashank's C++ scheduling engine (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `RETRYING`).
6. `reports`: Generated PDF report metadata with `task_id` linkage, file payload metrics, download counter, and JSON summary snapshot.
7. `ai_conversations`: Copilot chat sessions with token budgeting cache and full-text search GIN indexing.
8. `ai_messages`: Turn-by-turn conversational history with real-time SSE streaming state (`streaming`, `completed`, `failed`), latency duration, and chunk metrics.
9. `forecasts`: AI/ML predictive emission projections with confidence bounds (`confidence_lower`, `confidence_upper`) and model versioning.

## Setup & Migration Instructions

Ensure PostgreSQL is running locally, then execute migrations in sequential order:

```bash
# 1. Create the database
createdb ecoinsight

# 2. Run initial schema migration (MVP)
psql -U postgres -d ecoinsight -f migrations/001_initial_schema.sql

# 3. Run Phase 8 migration (Calculator + CSV expansion)
psql -U postgres -d ecoinsight -f migrations/002_phase8_calculator_csv_expansion.sql

# 4. Run Phase 9 migrations (AI Copilot chat, search, tokens & streaming)
psql -U postgres -d ecoinsight -f migrations/003_phase9_ai_copilot.sql
psql -U postgres -d ecoinsight -f migrations/004_phase9_ai_search_and_tokens.sql
psql -U postgres -d ecoinsight -f migrations/005_phase9_ai_streaming_integration.sql

# 5. Run Phase 10 migration (Forecasting Data Layer)
psql -U postgres -d ecoinsight -f migrations/006_phase10_forecasting.sql

# 6. Run Phase 11 migration (Reports Expansion & PDF Export Metadata)
psql -U postgres -d ecoinsight -f migrations/007_phase11_reports_expansion.sql

# 7. Insert comprehensive development seed data
psql -U postgres -d ecoinsight -f seed.sql

# 8. Run automated verification test suites
psql -U postgres -d ecoinsight -f tests/test_phase9_streaming_integration.sql
psql -U postgres -d ecoinsight -f tests/test_phase10_forecasting.sql
psql -U postgres -d ecoinsight -f tests/test_phase11_reports_expansion.sql
```

## Seed Dataset Statistics (Current as of 30 December 2026)

- **10 users** across diverse Indian industries (IT, Manufacturing, Energy, Finance, Transport, etc.).
- **6 categories** & **40+ emission factors** (EPA WARM v15, UK DEFRA 2024, IPCC AR6, CEA India CO2 Baseline 2024).
- **144 emission records** spanning continuous monthly dates from March 2026 through 30 December 2026.
- **7 C++ Scheduler tasks** covering CSV processing, AI analytics, forecasting, and PDF report jobs.
- **9 forecast projections** providing historical validation overlap (2026-10..2026-12) and 90-day forward predictions (Q1 2027: Jan–Mar 2027) with lower/upper confidence bounds.
- **5 audit reports** spanning monthly, quarterly, annual, and sustainability formats with realistic PDF references, file sizes (1.2–2.5 MB), download counts, and structured `summary_json` snapshots.
- **9 AI conversations & 22 messages** covering real-time streaming, latency SLA benchmarks, and specialized decarbonization advice.

## Cross-Team Contracts & API Support

- **Forecasting (Phase 10)**:
  - `queries/forecasts.sql` provides `get-historical-training-series` to extract chronological monthly totals for training.
  - `insert-forecast-point` provides an idempotent upsert (`ON CONFLICT (user_id, period, model_version) DO UPDATE`).
  - `get-latest-user-forecast` returns chart-ready projections matching the frontend Recharts specification in `/forecast`.
  - `get-forecast-vs-actual` compares predicted values with actuals and computes percentage variance.
  - `get-forecast-accuracy-metrics` calculates MAE, RMSE, and MAPE.
- **Reports & PDF Export (Phase 11)**:
  - `queries/reports.sql` links reports directly to C++ scheduler tasks via `task_id`.
  - `get-comprehensive-period-report` executes a single optimized query aggregating total CO2e, active categories, sectoral percentages as JSON, peak emitting month, and top 5 activities for PDF generation.
  - `update-report-status` handles C++ worker callbacks on completion, updating file paths, sizes, and JSON summaries.
