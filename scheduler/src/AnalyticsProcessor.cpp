// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    AnalyticsProcessor.cpp
// Author:  Ashank Arora
// Project: EcoInsight (SKIT-CS-2023-2027-07)
// Module:  Scheduler — Analytics Computation Implementation
// ============================================================================

#include "AnalyticsProcessor.h"
#include "CsvProcessor.h"

#include <chrono>
#include <iomanip>
#include <algorithm>
#include <fstream>

namespace ecoinsight {

AnalyticsResult AnalyticsProcessor::processRecords(const std::vector<AnalyticsInputRecord>& records) {
    auto startClock = std::chrono::steady_clock::now();
    AnalyticsResult res;

    if (records.empty()) {
        res.success = false;
        return res;
    }

    res.totalRecords = static_cast<int>(records.size());

    std::map<std::string, double> catCo2e;
    std::map<std::string, int> catCounts;
    std::map<std::string, double> actCo2e;

    for (const auto& r : records) {
        res.totalCo2e += r.co2e;

        // Category aggregation
        catCo2e[r.category] += r.co2e;
        catCounts[r.category]++;

        // Activity aggregation
        actCo2e[r.activity] += r.co2e;

        // Timeline aggregation (extract YYYY-MM)
        std::string monthKey = "Unknown";
        if (r.date.size() >= 7) {
            monthKey = r.date.substr(0, 7);
        }
        res.monthlyTimeline[monthKey] += r.co2e;

        // Location aggregation
        std::string loc = r.location.empty() ? "Global" : r.location;
        res.locationBreakdown[loc] += r.co2e;
    }

    res.averageCo2ePerRecord = (res.totalRecords > 0) ? (res.totalCo2e / res.totalRecords) : 0.0;

    // Build category summaries with percentages
    double maxCatCo2e = -1.0;
    for (const auto& pair : catCo2e) {
        CategorySummary cs;
        cs.name = pair.first;
        cs.totalCo2e = pair.second;
        cs.percentage = (res.totalCo2e > 0.0) ? (pair.second / res.totalCo2e * 100.0) : 0.0;
        cs.recordCount = catCounts[pair.first];
        res.categoryBreakdown.push_back(cs);

        if (pair.second > maxCatCo2e) {
            maxCatCo2e = pair.second;
            res.topCategoryName = pair.first;
            res.topCategoryCo2e = pair.second;
        }
    }

    // Top activity
    double maxActCo2e = -1.0;
    for (const auto& pair : actCo2e) {
        if (pair.second > maxActCo2e) {
            maxActCo2e = pair.second;
            res.topActivityName = pair.first;
            res.topActivityCo2e = pair.second;
        }
    }

    auto endClock = std::chrono::steady_clock::now();
    res.processingTimeMs = std::chrono::duration<double, std::milli>(endClock - startClock).count();
    res.success = true;
    return res;
}

AnalyticsResult AnalyticsProcessor::processCsvFile(const std::string& csvFilePath) {
    CsvProcessor csvProc;
    auto csvRes = csvProc.processFile(csvFilePath);

    std::vector<AnalyticsInputRecord> records;
    records.reserve(csvRes.records.size());

    for (const auto& r : csvRes.records) {
        AnalyticsInputRecord in;
        in.id = r.rowNumber;
        in.category = r.categoryName;
        in.activity = r.activity;
        in.quantity = r.quantity;
        in.unit = r.unit;
        in.co2e = r.co2e;
        in.date = r.date;
        in.location = r.location;
        records.push_back(in);
    }

    return processRecords(records);
}

std::string AnalyticsResult::toJson() const {
    std::ostringstream json;
    json << std::fixed << std::setprecision(4);

    json << "{\n";
    json << "  \"status\": \"" << (success ? "SUCCESS" : "FAILED") << "\",\n";
    json << "  \"total_records\": " << totalRecords << ",\n";
    json << "  \"total_co2e\": " << totalCo2e << ",\n";
    json << "  \"average_co2e_per_record\": " << averageCo2ePerRecord << ",\n";
    json << "  \"processing_time_ms\": " << processingTimeMs << ",\n";

    // Top contributor
    json << "  \"top_contributor\": {\n";
    json << "    \"category\": \"" << topCategoryName << "\",\n";
    json << "    \"category_co2e\": " << topCategoryCo2e << ",\n";
    json << "    \"activity\": \"" << topActivityName << "\",\n";
    json << "    \"activity_co2e\": " << topActivityCo2e << "\n";
    json << "  },\n";

    // Category breakdown
    json << "  \"categories\": [\n";
    for (size_t i = 0; i < categoryBreakdown.size(); ++i) {
        const auto& c = categoryBreakdown[i];
        json << "    {\n";
        json << "      \"name\": \"" << c.name << "\",\n";
        json << "      \"total_co2e\": " << c.totalCo2e << ",\n";
        json << "      \"percentage\": " << c.percentage << ",\n";
        json << "      \"records\": " << c.recordCount << "\n";
        json << "    }";
        if (i + 1 < categoryBreakdown.size()) json << ",";
        json << "\n";
    }
    json << "  ],\n";

    // Monthly timeline
    json << "  \"monthly_timeline\": {\n";
    size_t mIdx = 0;
    for (const auto& pair : monthlyTimeline) {
        json << "    \"" << pair.first << "\": " << pair.second;
        if (++mIdx < monthlyTimeline.size()) json << ",";
        json << "\n";
    }
    json << "  },\n";

    // Location breakdown
    json << "  \"locations\": {\n";
    size_t lIdx = 0;
    for (const auto& pair : locationBreakdown) {
        json << "    \"" << pair.first << "\": " << pair.second;
        if (++lIdx < locationBreakdown.size()) json << ",";
        json << "\n";
    }
    json << "  }\n";
    json << "}\n";

    return json.str();
}

} // namespace ecoinsight
