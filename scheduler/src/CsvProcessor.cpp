// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    CsvProcessor.cpp
// Author:  Ashank Arora
// Project: EcoInsight (SKIT-CS-2023-2027-07)
// Module:  Scheduler — CSV Processing Worker Implementation
// ============================================================================

#include "CsvProcessor.h"

#include <fstream>
#include <iostream>
#include <iomanip>
#include <algorithm>
#include <cctype>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
std::string CsvProcessor::trim(const std::string& str) {
    auto start = str.find_first_not_of(" \t\r\n");
    if (start == std::string::npos) return "";
    auto end = str.find_last_not_of(" \t\r\n");
    return str.substr(start, end - start + 1);
}

std::string CsvProcessor::toLower(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return result;
}

std::vector<std::string> CsvProcessor::parseCsvLine(const std::string& line) {
    std::vector<std::string> fields;
    std::string field;
    bool inQuotes = false;

    for (size_t i = 0; i < line.size(); ++i) {
        char c = line[i];
        if (c == '\"') {
            if (inQuotes && i + 1 < line.size() && line[i + 1] == '\"') {
                field += '\"';
                ++i;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c == ',' && !inQuotes) {
            fields.push_back(trim(field));
            field.clear();
        } else {
            field += c;
        }
    }
    fields.push_back(trim(field));
    return fields;
}

// ---------------------------------------------------------------------------
// Constructor & Factor Initialization
// ---------------------------------------------------------------------------
CsvProcessor::CsvProcessor() {
    initializeDefaultFactors();
}

void CsvProcessor::initializeDefaultFactors() {
    // Aligned with database/seed.sql and contract:
    // Categories: 1=Electricity, 2=Transportation, 3=Fuel, 4=Waste, 5=Water, 6=Natural Gas
    registerFactor("grid electricity", "kwh",    1, "Electricity",    0.820000);
    registerFactor("electricity",      "kwh",    1, "Electricity",    0.820000);
    registerFactor("solar power",       "kwh",    1, "Electricity",    0.041000);

    registerFactor("petrol car",       "km",     2, "Transportation", 0.170000);
    registerFactor("diesel car",       "km",     2, "Transportation", 0.190000);
    registerFactor("flight domestic",  "km",     2, "Transportation", 0.255000);
    registerFactor("flight",           "km",     2, "Transportation", 0.255000);
    registerFactor("bus travel",       "km",     2, "Transportation", 0.089000);
    registerFactor("train travel",     "km",     2, "Transportation", 0.041000);

    registerFactor("diesel fuel",      "litres", 3, "Fuel",           2.680000);
    registerFactor("petrol fuel",      "litres", 3, "Fuel",           2.310000);
    registerFactor("lpg",              "kg",     3, "Fuel",           2.980000);

    registerFactor("municipal waste",  "kg",     4, "Waste",          0.580000);
    registerFactor("landfill waste",   "kg",     4, "Waste",          0.580000);
    registerFactor("recycled waste",   "kg",     4, "Waste",          0.021000);

    registerFactor("tap water",        "litres", 5, "Water",          0.000300);
    registerFactor("water supply",     "m3",     5, "Water",          0.344000);

    registerFactor("natural gas",      "m3",     6, "Natural Gas",    2.030000);
    registerFactor("natural gas",      "kwh",    6, "Natural Gas",    0.185000);
}

void CsvProcessor::registerFactor(const std::string& activity, const std::string& unit,
                                  int categoryId, const std::string& categoryName, double factor) {
    std::string key = toLower(trim(activity)) + "|" + toLower(trim(unit));
    factorTable[key] = FactorEntry{categoryId, categoryName, factor};
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------
CsvProcessingResult CsvProcessor::processFile(const std::string& filePath, int defaultUserId) {
    (void)defaultUserId;
    std::ifstream file(filePath);
    if (!file.is_open()) {
        CsvProcessingResult err;
        err.success = false;
        err.errorMessage = "Failed to open CSV file: " + filePath;
        return err;
    }
    return processStream(file, defaultUserId);
}

CsvProcessingResult CsvProcessor::processStream(std::istream& inputStream, int defaultUserId) {
    (void)defaultUserId;
    auto startClock = std::chrono::steady_clock::now();

    CsvProcessingResult result;
    std::string line;
    int lineNumber = 0;

    // Header index mapping
    int colActivity = -1;
    int colQuantity = -1;
    int colUnit = -1;
    int colCategory = -1;
    int colDate = -1;
    int colLocation = -1;
    int colFactor = -1;

    bool headerFound = false;

    while (std::getline(inputStream, line)) {
        ++lineNumber;
        line = trim(line);
        if (line.empty()) continue; // skip blank lines

        auto fields = parseCsvLine(line);

        // Header detection
        if (!headerFound) {
            for (size_t i = 0; i < fields.size(); ++i) {
                std::string header = toLower(fields[i]);
                if (header == "activity") colActivity = static_cast<int>(i);
                else if (header == "quantity" || header == "amount") colQuantity = static_cast<int>(i);
                else if (header == "unit") colUnit = static_cast<int>(i);
                else if (header == "category" || header == "category_name") colCategory = static_cast<int>(i);
                else if (header == "date") colDate = static_cast<int>(i);
                else if (header == "location" || header == "city") colLocation = static_cast<int>(i);
                else if (header == "emission_factor" || header == "factor") colFactor = static_cast<int>(i);
            }

            // If header contains activity and quantity, consider header resolved
            if (colActivity != -1 && colQuantity != -1) {
                headerFound = true;
                continue;
            } else {
                // Positional fallback: activity, quantity, unit, date, location
                colActivity = 0;
                colQuantity = 1;
                colUnit = 2;
                colDate = 3;
                colLocation = 4;
                headerFound = true;
                // Don't continue; parse this line as row 1
            }
        }

        result.totalRows++;

        // Minimum required: activity and quantity
        if (static_cast<int>(fields.size()) <= colActivity || static_cast<int>(fields.size()) <= colQuantity) {
            result.invalidRows++;
            result.errors.push_back({lineNumber, line, "Missing required columns (activity or quantity)"});
            continue;
        }

        std::string activity = fields[colActivity];
        std::string qtyStr = fields[colQuantity];
        std::string unit = (colUnit >= 0 && static_cast<int>(fields.size()) > colUnit) ? fields[colUnit] : "";
        std::string date = (colDate >= 0 && static_cast<int>(fields.size()) > colDate) ? fields[colDate] : "2026-10-01";
        std::string location = (colLocation >= 0 && static_cast<int>(fields.size()) > colLocation) ? fields[colLocation] : "Global";

        if (activity.empty()) {
            result.invalidRows++;
            result.errors.push_back({lineNumber, line, "Empty activity field"});
            continue;
        }

        double quantity = 0.0;
        try {
            quantity = std::stod(qtyStr);
            if (quantity <= 0.0) {
                result.invalidRows++;
                result.errors.push_back({lineNumber, line, "Quantity must be greater than zero"});
                continue;
            }
        } catch (...) {
            result.invalidRows++;
            result.errors.push_back({lineNumber, line, "Invalid numeric quantity: " + qtyStr});
            continue;
        }

        // Determine emission factor and category
        double factor = 0.0;
        int categoryId = 1;
        std::string categoryName = "Other";

        // Check if factor is explicitly specified in the row
        if (colFactor >= 0 && static_cast<int>(fields.size()) > colFactor && !fields[colFactor].empty()) {
            try {
                factor = std::stod(fields[colFactor]);
            } catch (...) {
                factor = 0.0;
            }
        }

        // Otherwise look up from factor dictionary
        if (factor <= 0.0) {
            std::string key = toLower(trim(activity)) + "|" + toLower(trim(unit));
            auto it = factorTable.find(key);
            if (it != factorTable.end()) {
                factor = it->second.factor;
                categoryId = it->second.categoryId;
                categoryName = it->second.categoryName;
            } else {
                // Try fuzzy activity match
                bool matched = false;
                std::string lowerAct = toLower(activity);
                for (const auto& entry : factorTable) {
                    if (lowerAct.find(entry.first.substr(0, entry.first.find('|'))) != std::string::npos) {
                        factor = entry.second.factor;
                        categoryId = entry.second.categoryId;
                        categoryName = entry.second.categoryName;
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    // Default fallback factor (general emission estimate)
                    factor = 0.500000;
                    categoryId = 1;
                    categoryName = "General";
                }
            }
        }

        // Category override from CSV if present
        if (colCategory >= 0 && static_cast<int>(fields.size()) > colCategory && !fields[colCategory].empty()) {
            categoryName = fields[colCategory];
        }

        // Core Formula: Quantity x Emission Factor = Estimated CO2e
        double co2e = quantity * factor;

        ProcessedEmissionRecord rec;
        rec.rowNumber = lineNumber;
        rec.categoryId = categoryId;
        rec.categoryName = categoryName;
        rec.activity = activity;
        rec.quantity = quantity;
        rec.unit = unit.empty() ? "units" : unit;
        rec.emissionFactor = factor;
        rec.co2e = co2e;
        rec.location = location;
        rec.date = date;

        result.validRows++;
        result.totalCo2e += co2e;
        result.co2eByCategory[categoryName] += co2e;
        result.records.push_back(rec);
    }

    auto endClock = std::chrono::steady_clock::now();
    result.processingTimeMs = std::chrono::duration<double, std::milli>(endClock - startClock).count();
    result.success = (result.validRows > 0);
    return result;
}

// ---------------------------------------------------------------------------
// JSON Output Serialization (Matches PostgreSQL tasks.result_reference)
// ---------------------------------------------------------------------------
std::string CsvProcessingResult::toJson() const {
    std::ostringstream json;
    json << std::fixed << std::setprecision(4);

    json << "{\n";
    json << "  \"status\": \"" << (success ? "SUCCESS" : "FAILED") << "\",\n";
    json << "  \"total_rows\": " << totalRows << ",\n";
    json << "  \"valid_rows\": " << validRows << ",\n";
    json << "  \"invalid_rows\": " << invalidRows << ",\n";
    json << "  \"total_co2e\": " << totalCo2e << ",\n";
    json << "  \"processing_time_ms\": " << processingTimeMs << ",\n";

    // Category breakdown
    json << "  \"category_breakdown\": {\n";
    size_t catIdx = 0;
    for (const auto& pair : co2eByCategory) {
        json << "    \"" << pair.first << "\": " << pair.second;
        if (++catIdx < co2eByCategory.size()) json << ",";
        json << "\n";
    }
    json << "  },\n";

    // Errors array
    json << "  \"errors\": [\n";
    for (size_t i = 0; i < errors.size(); ++i) {
        json << "    {\n";
        json << "      \"row\": " << errors[i].rowNumber << ",\n";
        json << "      \"reason\": \"" << errors[i].reason << "\"\n";
        json << "    }";
        if (i + 1 < errors.size()) json << ",";
        json << "\n";
    }
    json << "  ],\n";

    // Processed records preview (first 5 records)
    json << "  \"sample_processed\": [\n";
    size_t sampleCount = std::min<size_t>(records.size(), 5);
    for (size_t i = 0; i < sampleCount; ++i) {
        const auto& r = records[i];
        json << "    {\n";
        json << "      \"activity\": \"" << r.activity << "\",\n";
        json << "      \"category\": \"" << r.categoryName << "\",\n";
        json << "      \"quantity\": " << r.quantity << ",\n";
        json << "      \"unit\": \"" << r.unit << "\",\n";
        json << "      \"factor\": " << r.emissionFactor << ",\n";
        json << "      \"co2e\": " << r.co2e << ",\n";
        json << "      \"date\": \"" << r.date << "\"\n";
        json << "    }";
        if (i + 1 < sampleCount) json << ",";
        json << "\n";
    }
    json << "  ]\n";
    json << "}\n";

    return json.str();
}

} // namespace ecoinsight
