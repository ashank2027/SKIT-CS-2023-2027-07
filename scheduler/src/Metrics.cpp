// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    Metrics.cpp
// Author:  Ashank Arora
// Module:  Scheduler — Metrics Implementation
// ============================================================================

#include "Metrics.h"
#include <sstream>
#include <iomanip>
#include <numeric>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------
void Metrics::incrementSubmitted()       { m_submitted++; }
void Metrics::incrementCompleted()       { m_completed++; }
void Metrics::incrementFailed()          { m_failed++; }
void Metrics::incrementRetries()         { m_retries++; }
void Metrics::incrementContextSwitches() { m_contextSwitches++; }

int Metrics::getSubmitted() const       { return m_submitted.load(); }
int Metrics::getCompleted() const       { return m_completed.load(); }
int Metrics::getFailed() const          { return m_failed.load(); }
int Metrics::getRetries() const         { return m_retries.load(); }
int Metrics::getContextSwitches() const { return m_contextSwitches.load(); }

// ---------------------------------------------------------------------------
// Worker activity (placeholder — could be extended to track per-worker stats)
// ---------------------------------------------------------------------------
void Metrics::recordWorkerBusy(int /*workerId*/) {
    // Future: track per-worker busy durations
}

void Metrics::recordWorkerIdle(int /*workerId*/) {
    // Future: track per-worker idle durations
}

// ---------------------------------------------------------------------------
// Per-task timing
// ---------------------------------------------------------------------------
void Metrics::recordTaskMetrics(const TaskMetricRecord& record) {
    std::lock_guard<std::mutex> lock(m_recordMutex);
    m_taskRecords.push_back(record);
}

std::vector<TaskMetricRecord> Metrics::getTaskRecords() const {
    std::lock_guard<std::mutex> lock(m_recordMutex);
    return m_taskRecords;
}

// ---------------------------------------------------------------------------
// Computed statistics
// ---------------------------------------------------------------------------
double Metrics::getAverageWaitingTimeMs() const {
    std::lock_guard<std::mutex> lock(m_recordMutex);
    if (m_taskRecords.empty()) return 0.0;
    double total = 0.0;
    for (const auto& r : m_taskRecords) total += r.waitingTimeMs;
    return total / static_cast<double>(m_taskRecords.size());
}

double Metrics::getAverageTurnaroundTimeMs() const {
    std::lock_guard<std::mutex> lock(m_recordMutex);
    if (m_taskRecords.empty()) return 0.0;
    double total = 0.0;
    for (const auto& r : m_taskRecords) total += r.turnaroundTimeMs;
    return total / static_cast<double>(m_taskRecords.size());
}

double Metrics::getAverageResponseTimeMs() const {
    std::lock_guard<std::mutex> lock(m_recordMutex);
    if (m_taskRecords.empty()) return 0.0;
    double total = 0.0;
    for (const auto& r : m_taskRecords) total += r.responseTimeMs;
    return total / static_cast<double>(m_taskRecords.size());
}

double Metrics::getThroughput(double totalElapsedSec) const {
    if (totalElapsedSec <= 0.0) return 0.0;
    return static_cast<double>(m_completed.load()) / totalElapsedSec;
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------
std::string Metrics::generateReport(double totalElapsedSec) const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);

    oss << "\n";
    oss << "╔══════════════════════════════════════════════════════════════╗\n";
    oss << "║              ECOINSIGHT SCHEDULER — METRICS REPORT         ║\n";
    oss << "╠══════════════════════════════════════════════════════════════╣\n";
    oss << "║  Total Tasks Submitted  : " << std::setw(8) << getSubmitted()       << "                           ║\n";
    oss << "║  Completed              : " << std::setw(8) << getCompleted()       << "                           ║\n";
    oss << "║  Failed (terminal)      : " << std::setw(8) << getFailed()          << "                           ║\n";
    oss << "║  Total Retries          : " << std::setw(8) << getRetries()         << "                           ║\n";
    oss << "║  Context Switches       : " << std::setw(8) << getContextSwitches() << "                           ║\n";
    oss << "╠══════════════════════════════════════════════════════════════╣\n";
    oss << "║  Avg Waiting Time       : " << std::setw(8) << getAverageWaitingTimeMs()    << " ms                      ║\n";
    oss << "║  Avg Turnaround Time    : " << std::setw(8) << getAverageTurnaroundTimeMs() << " ms                      ║\n";
    oss << "║  Avg Response Time      : " << std::setw(8) << getAverageResponseTimeMs()   << " ms                      ║\n";
    oss << "║  Throughput             : " << std::setw(8) << getThroughput(totalElapsedSec) << " tasks/sec               ║\n";
    oss << "╠══════════════════════════════════════════════════════════════╣\n";

    // Per-task breakdown
    auto records = getTaskRecords();
    if (!records.empty()) {
        oss << "║  Per-Task Breakdown:                                       ║\n";
        oss << "║  TaskID  Wait(ms)  Turn(ms)  Resp(ms)  Exec(ms)           ║\n";
        for (const auto& r : records) {
            oss << "║  " << std::setw(6) << r.taskId
                << "  " << std::setw(8) << r.waitingTimeMs
                << "  " << std::setw(8) << r.turnaroundTimeMs
                << "  " << std::setw(8) << r.responseTimeMs
                << "  " << std::setw(8) << r.executionTimeMs
                << "           ║\n";
        }
    }

    oss << "╚══════════════════════════════════════════════════════════════╝\n";
    return oss.str();
}

} // namespace ecoinsight
