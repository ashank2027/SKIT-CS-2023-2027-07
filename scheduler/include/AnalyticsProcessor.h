// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    AnalyticsProcessor.h
// Author:  Ashank Arora
// Project: EcoInsight (SKIT-CS-2023-2027-07)
// Module:  Scheduler — Analytics Computation Engine
//
// Purpose:
//   Provides heavy data aggregation, category distributions, monthly
//   breakdowns, and contributor ranking for ANALYTICS background tasks.
// ============================================================================

#ifndef ECOINSIGHT_ANALYTICS_PROCESSOR_H
#define ECOINSIGHT_ANALYTICS_PROCESSOR_H

#include <string>
#include <vector>
#include <map>
#include <sstream>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// Input Record for Analytics
// ---------------------------------------------------------------------------
struct AnalyticsInputRecord {
    int id{0};
    int userId{0};
    std::string category;
    std::string activity;
    double quantity{0.0};
    std::string unit;
    double co2e{0.0};
    std::string date;     // YYYY-MM-DD
    std::string location; // City / Facility
};

// ---------------------------------------------------------------------------
// Analytics Category Summary
// ---------------------------------------------------------------------------
struct CategorySummary {
    std::string name;
    double totalCo2e{0.0};
    double percentage{0.0};
    int recordCount{0};
};

// ---------------------------------------------------------------------------
// Analytics Result Structure
// ---------------------------------------------------------------------------
struct AnalyticsResult {
    bool success{false};
    int totalRecords{0};
    double totalCo2e{0.0};
    double averageCo2ePerRecord{0.0};

    // Category breakdown
    std::vector<CategorySummary> categoryBreakdown;

    // Highest emission contributors
    std::string topCategoryName;
    double topCategoryCo2e{0.0};
    std::string topActivityName;
    double topActivityCo2e{0.0};

    // Monthly timeline (YYYY-MM -> total CO2e)
    std::map<std::string, double> monthlyTimeline;

    // Location breakdown (Location -> total CO2e)
    std::map<std::string, double> locationBreakdown;

    double processingTimeMs{0.0};

    // Serialize output to JSON (matches database result_reference)
    std::string toJson() const;
};

// ---------------------------------------------------------------------------
// AnalyticsProcessor Engine
// ---------------------------------------------------------------------------
class AnalyticsProcessor {
public:
    AnalyticsProcessor() = default;

    // Process a collection of records in-memory
    AnalyticsResult processRecords(const std::vector<AnalyticsInputRecord>& records);

    // Process records from a CSV file
    AnalyticsResult processCsvFile(const std::string& csvFilePath);

    // Process records from a simplified JSON array file
    AnalyticsResult processJsonFile(const std::string& jsonFilePath);
};

} // namespace ecoinsight

#endif // ECOINSIGHT_ANALYTICS_PROCESSOR_H
