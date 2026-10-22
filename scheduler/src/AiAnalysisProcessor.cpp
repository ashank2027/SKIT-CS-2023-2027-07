// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    AiAnalysisProcessor.cpp
// Author:  Ashank Arora
// Project: EcoInsight (SKIT-CS-2023-2027-07)
// Module:  Scheduler — AI Background Analysis Worker Implementation (Phase 9)
// ============================================================================

#include "AiAnalysisProcessor.h"
#include "CsvProcessor.h"

#include <sstream>
#include <iomanip>
#include <cmath>
#include <thread>
#include <iostream>

namespace ecoinsight {

AiAnalysisProcessor::AiAnalysisProcessor() {
    initializeBaselines();
}

void AiAnalysisProcessor::initializeBaselines() {
    // Standard commercial/industrial emission baselines (% of total footprint)
    m_industryBaselines["Electricity"]    = 35.0;
    m_industryBaselines["Transportation"] = 25.0;
    m_industryBaselines["Fuel"]           = 15.0;
    m_industryBaselines["Natural Gas"]    = 15.0;
    m_industryBaselines["Waste"]          = 8.0;
    m_industryBaselines["Water"]          = 2.0;
}

std::vector<AiAnomaly> AiAnalysisProcessor::detectAnomalies(
    const std::map<std::string, double>& emissions, double totalCo2e) const {
    
    std::vector<AiAnomaly> anomalies;
    if (totalCo2e <= 0.0) return anomalies;

    for (const auto& [category, val] : emissions) {
        double currentPct = (val / totalCo2e) * 100.0;
        double baselinePct = 15.0; // default baseline if unknown
        auto it = m_industryBaselines.find(category);
        if (it != m_industryBaselines.end()) {
            baselinePct = it->second;
        }

        double deviation = currentPct - baselinePct;

        if (deviation > 10.0) { // More than 10 percentage points above baseline
            AiAnomaly anomaly;
            anomaly.category = category;
            anomaly.measuredValue = val;
            anomaly.expectedBaseline = (baselinePct / 100.0) * totalCo2e;
            anomaly.percentageDeviation = (deviation / baselinePct) * 100.0;

            if (deviation > 25.0) {
                anomaly.severity = "CRITICAL";
                anomaly.description = category + " emissions are severely elevated (" +
                    std::to_string(static_cast<int>(currentPct)) + "% of total vs " +
                    std::to_string(static_cast<int>(baselinePct)) + "% expected baseline).";
            } else if (deviation > 15.0) {
                anomaly.severity = "HIGH";
                anomaly.description = category + " emissions represent an unusual spike (" +
                    std::to_string(static_cast<int>(currentPct)) + "% of total).";
            } else {
                anomaly.severity = "MEDIUM";
                anomaly.description = category + " is slightly above average commercial benchmark.";
            }

            anomalies.push_back(anomaly);
        }
    }

    return anomalies;
}

std::vector<AiRecommendation> AiAnalysisProcessor::generateRecommendations(
    const std::map<std::string, double>& emissions,
    const std::vector<AiAnomaly>& anomalies) const {
    
    std::vector<AiRecommendation> recs;
    int recId = 1;

    // Check Electricity
    auto itElec = emissions.find("Electricity");
    if (itElec != emissions.end() && itElec->second > 0) {
        AiRecommendation r;
        r.id = recId++;
        r.category = "Electricity";
        r.title = "Transition Facility Power to Solar Rooftop & Renewable PPA";
        r.description = "Procure bundled renewable energy certificates (RECs) and expand on-site solar PV array to displace grid emission intensity.";
        r.potentialCo2eSavingKg = itElec->second * 0.45; // 45% potential reduction
        r.difficulty = "MEDIUM";
        r.priority = "HIGH";
        r.estimatedPayback = "18-24 months";
        recs.push_back(r);

        AiRecommendation r2;
        r2.id = recId++;
        r2.category = "Electricity";
        r2.title = "Deploy Smart IoT Sub-Metering & AI HVAC Optimization";
        r2.description = "Implement automated temperature setback schedules and variable-speed fan controllers across peak hours.";
        r2.potentialCo2eSavingKg = itElec->second * 0.15;
        r2.difficulty = "LOW";
        r2.priority = "MEDIUM";
        r2.estimatedPayback = "6-12 months";
        recs.push_back(r2);
    }

    // Check Transportation
    auto itTrans = emissions.find("Transportation");
    if (itTrans != emissions.end() && itTrans->second > 0) {
        AiRecommendation r;
        r.id = recId++;
        r.category = "Transportation";
        r.title = "Fleet Electrification & Route Optimization";
        r.description = "Gradually convert high-mileage diesel logistics vehicles to commercial electric vehicles (EVs) with dynamic routing.";
        r.potentialCo2eSavingKg = itTrans->second * 0.40;
        r.difficulty = "HIGH";
        r.priority = "HIGH";
        r.estimatedPayback = "36 months";
        recs.push_back(r);
    }

    // Check Natural Gas / Fuel
    auto itFuel = emissions.find("Fuel");
    auto itGas = emissions.find("Natural Gas");
    double heatFuel = (itFuel != emissions.end() ? itFuel->second : 0.0) +
                      (itGas != emissions.end() ? itGas->second : 0.0);
    if (heatFuel > 0) {
        AiRecommendation r;
        r.id = recId++;
        r.category = "Fuel";
        r.title = "Boiler Heat Recovery & Electrified Heat Pumps";
        r.description = "Install flue gas economizers and substitute fossil-fuel boilers with industrial heat pump systems.";
        r.potentialCo2eSavingKg = heatFuel * 0.30;
        r.difficulty = "HIGH";
        r.priority = "MEDIUM";
        r.estimatedPayback = "24-30 months";
        recs.push_back(r);
    }

    // Check Waste
    auto itWaste = emissions.find("Waste");
    if (itWaste != emissions.end() && itWaste->second > 0) {
        AiRecommendation r;
        r.id = recId++;
        r.category = "Waste";
        r.title = "Zero-Waste Composting & Closed-Loop Recycling";
        r.description = "Divert cafeteria food scraps and organic campus waste to localized composting facilities.";
        r.potentialCo2eSavingKg = itWaste->second * 0.60;
        r.difficulty = "LOW";
        r.priority = "MEDIUM";
        r.estimatedPayback = "3-6 months";
        recs.push_back(r);
    }

    return recs;
}

std::string AiAnalysisProcessor::generateSummary(
    double totalCo2e, const std::string& topCategory, double topPct,
    size_t anomalyCount, size_t recCount) const {
    
    std::ostringstream oss;
    oss << "AI Environmental Intelligence Summary: Analyzed total emissions of "
        << std::fixed << std::setprecision(2) << totalCo2e << " kg CO2e. "
        << "The primary footprint contributor is " << topCategory << " ("
        << std::setprecision(1) << topPct << "% of total). "
        << "Detected " << anomalyCount << " category anomalies. "
        << "Generated " << recCount << " high-impact mitigation recommendations "
        << "targeting an estimated abatement of up to 40% over the next fiscal period.";
    return oss.str();
}

AiAnalysisResult AiAnalysisProcessor::analyzeData(
    const std::map<std::string, double>& categoryEmissions,
    int taskId, int userId, bool simulateRateLimit) {
    
    auto startTime = std::chrono::steady_clock::now();
    AiAnalysisResult result;
    result.taskId = taskId;
    result.userId = userId;

    // Handle simulated external AI API rate limit (HTTP 429)
    if (simulateRateLimit) {
        result.success = false;
        result.wasRateLimited = true;
        result.errorMessage = "AI API Rate Limit Exceeded (HTTP 429 Too Many Requests - Quota Throttled). Triggering OS scheduler exponential backoff retry.";
        auto endTime = std::chrono::steady_clock::now();
        result.executionTimeMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();
        return result;
    }

    // Compute total CO2e and identify top emitter
    double total = 0.0;
    std::string topCat = "Unknown";
    double topVal = -1.0;

    for (const auto& [cat, val] : categoryEmissions) {
        total += val;
        if (val > topVal) {
            topVal = val;
            topCat = cat;
        }
    }

    result.totalAnalyzedCo2e = total;
    result.primaryEmissionCategory = topCat;
    result.primaryCategoryPercentage = (total > 0.0) ? (topVal / total) * 100.0 : 0.0;

    // Run statistical anomaly detection
    result.anomalies = detectAnomalies(categoryEmissions, total);

    // Generate actionable decarbonization recommendations
    result.recommendations = generateRecommendations(categoryEmissions, result.anomalies);

    // Generate summary narrative
    result.executiveSummary = generateSummary(total, topCat, result.primaryCategoryPercentage,
                                              result.anomalies.size(), result.recommendations.size());

    result.success = true;
    auto endTime = std::chrono::steady_clock::now();
    result.executionTimeMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();

    return result;
}

AiAnalysisResult AiAnalysisProcessor::analyzeCsvFile(
    const std::string& csvPath, int taskId, int userId, bool simulateRateLimit) {
    
    CsvProcessor csvProc;
    auto csvResult = csvProc.processFile(csvPath, userId);

    if (!csvResult.success) {
        AiAnalysisResult errResult;
        errResult.success = false;
        errResult.taskId = taskId;
        errResult.userId = userId;
        errResult.errorMessage = "Failed to load CSV for AI analysis: " + csvResult.errorMessage;
        return errResult;
    }

    return analyzeData(csvResult.co2eByCategory, taskId, userId, simulateRateLimit);
}

bool AiAnalysisProcessor::executeWithRateLimitRetry(
    std::function<bool()> operation, int maxAttempts, int backoffBaseMs) {
    
    int attempt = 0;
    while (attempt < maxAttempts) {
        attempt++;
        if (operation()) {
            return true;
        }
        // Apply exponential backoff: base * 2^(attempt-1)
        int delayMs = backoffBaseMs * (1 << (attempt - 1));
        std::this_thread::sleep_for(std::chrono::milliseconds(delayMs));
    }
    return false;
}

std::string AiAnalysisResult::toJson() const {
    std::ostringstream oss;
    oss << "{\n";
    oss << "  \"task_id\": " << taskId << ",\n";
    oss << "  \"user_id\": " << userId << ",\n";
    oss << "  \"task_type\": \"AI_ANALYSIS\",\n";
    oss << "  \"status\": \"" << (success ? "COMPLETED" : "FAILED") << "\",\n";
    oss << "  \"was_rate_limited\": " << (wasRateLimited ? "true" : "false") << ",\n";
    oss << "  \"total_analyzed_co2e_kg\": " << std::fixed << std::setprecision(2) << totalAnalyzedCo2e << ",\n";
    oss << "  \"primary_emission_category\": \"" << primaryEmissionCategory << "\",\n";
    oss << "  \"primary_category_percentage\": " << std::fixed << std::setprecision(1) << primaryCategoryPercentage << ",\n";
    oss << "  \"executive_summary\": \"" << executiveSummary << "\",\n";
    
    // Anomalies
    oss << "  \"anomalies\": [\n";
    for (size_t i = 0; i < anomalies.size(); ++i) {
        const auto& a = anomalies[i];
        oss << "    {\n";
        oss << "      \"category\": \"" << a.category << "\",\n";
        oss << "      \"severity\": \"" << a.severity << "\",\n";
        oss << "      \"percentage_deviation\": " << std::fixed << std::setprecision(1) << a.percentageDeviation << ",\n";
        oss << "      \"description\": \"" << a.description << "\"\n";
        oss << "    }" << (i + 1 < anomalies.size() ? "," : "") << "\n";
    }
    oss << "  ],\n";

    // Recommendations
    oss << "  \"recommendations\": [\n";
    for (size_t i = 0; i < recommendations.size(); ++i) {
        const auto& r = recommendations[i];
        oss << "    {\n";
        oss << "      \"id\": " << r.id << ",\n";
        oss << "      \"category\": \"" << r.category << "\",\n";
        oss << "      \"title\": \"" << r.title << "\",\n";
        oss << "      \"description\": \"" << r.description << "\",\n";
        oss << "      \"potential_saving_co2e_kg\": " << std::fixed << std::setprecision(2) << r.potentialCo2eSavingKg << ",\n";
        oss << "      \"difficulty\": \"" << r.difficulty << "\",\n";
        oss << "      \"priority\": \"" << r.priority << "\",\n";
        oss << "      \"payback\": \"" << r.estimatedPayback << "\"\n";
        oss << "    }" << (i + 1 < recommendations.size() ? "," : "") << "\n";
    }
    oss << "  ],\n";

    if (!errorMessage.empty()) {
        oss << "  \"error_message\": \"" << errorMessage << "\",\n";
    }
    oss << "  \"execution_time_ms\": " << std::fixed << std::setprecision(2) << executionTimeMs << "\n";
    oss << "}";
    return oss.str();
}

} // namespace ecoinsight
