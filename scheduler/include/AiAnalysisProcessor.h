// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    AiAnalysisProcessor.h
// Author:  Ashank Arora
// Project: EcoInsight (SKIT-CS-2023-2027-07)
// Module:  Scheduler — AI Background Analysis Worker (Phase 9)
//
// Purpose:
//   Provides real background processing for TaskType::AI_ANALYSIS.
//   Analyzes carbon emission datasets to detect statistical anomalies,
//   identify top emission drivers, and generate structured sustainability
//   recommendations.
//
// Resilience:
//   Implements external AI API rate-limit resilience (HTTP 429 / Quota
//   Throttling) with exponential backoff and scheduler retry coordination.
// ============================================================================

#ifndef ECOINSIGHT_AI_ANALYSIS_PROCESSOR_H
#define ECOINSIGHT_AI_ANALYSIS_PROCESSOR_H

#include <string>
#include <vector>
#include <map>
#include <chrono>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// AiAnomaly — Detected statistical irregularity in carbon data
// ---------------------------------------------------------------------------
struct AiAnomaly {
    std::string category;
    double measuredValue{0.0};
    double expectedBaseline{0.0};
    double percentageDeviation{0.0};
    std::string severity; // LOW, MEDIUM, HIGH, CRITICAL
    std::string description;
};

// ---------------------------------------------------------------------------
// AiRecommendation — Actionable carbon abatement strategy
// ---------------------------------------------------------------------------
struct AiRecommendation {
    int id{0};
    std::string category;
    std::string title;
    std::string description;
    double potentialCo2eSavingKg{0.0};
    std::string difficulty; // LOW, MEDIUM, HIGH
    std::string priority;   // LOW, MEDIUM, HIGH
    std::string estimatedPayback;
};

// ---------------------------------------------------------------------------
// AiAnalysisResult — Structured result payload (matches tasks.result_reference)
// ---------------------------------------------------------------------------
struct AiAnalysisResult {
    bool success{false};
    int taskId{1};
    int userId{1};
    double totalAnalyzedCo2e{0.0};
    std::string primaryEmissionCategory;
    double primaryCategoryPercentage{0.0};
    std::vector<AiAnomaly> anomalies;
    std::vector<AiRecommendation> recommendations;
    std::string executiveSummary;
    std::string errorMessage;
    bool wasRateLimited{false};
    int retriesAttempted{0};
    double executionTimeMs{0.0};

    // Serialize to JSON conforming to tasks.result_reference contract
    std::string toJson() const;
};

// ---------------------------------------------------------------------------
// AiAnalysisProcessor — Core AI Analysis Worker Engine
// ---------------------------------------------------------------------------
class AiAnalysisProcessor {
public:
    AiAnalysisProcessor();

    // Process emissions data from a CSV file
    AiAnalysisResult analyzeCsvFile(const std::string& csvPath, int taskId = 1, int userId = 1,
                                    bool simulateRateLimit = false);

    // Process emissions data directly from parsed category values
    AiAnalysisResult analyzeData(const std::map<std::string, double>& categoryEmissions,
                                 int taskId = 1, int userId = 1, bool simulateRateLimit = false);

    // Simulate transient rate limit failure followed by success on retry
    bool executeWithRateLimitRetry(std::function<bool()> operation, int maxAttempts = 3,
                                   int backoffBaseMs = 50);

private:
    std::map<std::string, double> m_industryBaselines; // Baseline emission distributions

    void initializeBaselines();
    std::vector<AiAnomaly> detectAnomalies(const std::map<std::string, double>& emissions, double totalCo2e) const;
    std::vector<AiRecommendation> generateRecommendations(const std::map<std::string, double>& emissions,
                                                           const std::vector<AiAnomaly>& anomalies) const;
    std::string generateSummary(double totalCo2e, const std::string& topCategory,
                                double topPct, size_t anomalyCount, size_t recCount) const;
};

} // namespace ecoinsight

#endif // ECOINSIGHT_AI_ANALYSIS_PROCESSOR_H
