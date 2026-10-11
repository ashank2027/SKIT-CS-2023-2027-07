// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    CsvProcessor.h
// Author:  Ashank Arora
// Project: EcoInsight (SKIT-CS-2023-2027-07)
// Module:  Scheduler — CSV Processing Worker
//
// Purpose:
//   Provides real CSV parsing, validation, emission factor matching,
//   and CO2e calculation for CSV_PROCESSING background tasks.
//
// Formula (Shared Contract):
//   Quantity x Emission Factor = Estimated CO2e
// ============================================================================

#ifndef ECOINSIGHT_CSV_PROCESSOR_H
#define ECOINSIGHT_CSV_PROCESSOR_H

#include <string>
#include <vector>
#include <map>
#include <chrono>
#include <sstream>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// ProcessedEmissionRecord — represents one valid calculated emission row
// ---------------------------------------------------------------------------
struct ProcessedEmissionRecord {
    int rowNumber{0};
    int categoryId{1};
    std::string categoryName;
    std::string activity;
    double quantity{0.0};
    std::string unit;
    double emissionFactor{0.0};
    double co2e{0.0};
    std::string location;
    std::string date; // YYYY-MM-DD
};

// ---------------------------------------------------------------------------
// CsvRowError — captures malformed row details for error reporting
// ---------------------------------------------------------------------------
struct CsvRowError {
    int rowNumber{0};
    std::string rawLine;
    std::string reason;
};

// ---------------------------------------------------------------------------
// CsvProcessingResult — complete summary output of a CSV task
// ---------------------------------------------------------------------------
struct CsvProcessingResult {
    bool success{false};
    int totalRows{0};
    int validRows{0};
    int invalidRows{0};
    double totalCo2e{0.0};
    std::map<std::string, double> co2eByCategory;
    std::vector<ProcessedEmissionRecord> records;
    std::vector<CsvRowError> errors;
    std::string errorMessage;
    double processingTimeMs{0.0};

    // Serialize result to JSON string (matches database result_reference)
    std::string toJson() const;
};

// ---------------------------------------------------------------------------
// CsvProcessor — Core CSV Worker Engine
// ---------------------------------------------------------------------------
class CsvProcessor {
public:
    CsvProcessor();

    // Set custom emission factors table (category, activity, unit -> factor)
    void registerFactor(const std::string& activity, const std::string& unit,
                        int categoryId, const std::string& categoryName, double factor);

    // Process a CSV file from disk
    CsvProcessingResult processFile(const std::string& filePath, int defaultUserId = 1);

    // Process a CSV from an in-memory string stream
    CsvProcessingResult processStream(std::istream& inputStream, int defaultUserId = 1);

private:
    struct FactorEntry {
        int categoryId;
        std::string categoryName;
        double factor;
    };

    // Key format: lowercase(activity + "|" + unit)
    std::map<std::string, FactorEntry> factorTable;

    void initializeDefaultFactors();
    static std::vector<std::string> parseCsvLine(const std::string& line);
    static std::string trim(const std::string& str);
    static std::string toLower(const std::string& str);
};

} // namespace ecoinsight

#endif // ECOINSIGHT_CSV_PROCESSOR_H
