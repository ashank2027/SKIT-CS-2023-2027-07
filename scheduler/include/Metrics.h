// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    Metrics.h
// Author:  Ashank Arora
// Module:  Scheduler — Metrics
//
// Purpose:
//   Track scheduler performance metrics required by the project specification:
//   - Total tasks submitted
//   - Completed tasks
//   - Failed tasks (terminal failures after max retries)
//   - Total retries
//   - Per-task waiting time, turnaround time, response time
//   - Context switches (for Round Robin)
//   - Throughput
//   - Worker activity tracking
//
// All counters are atomic for thread safety.
// ============================================================================

#ifndef ECOINSIGHT_METRICS_H
#define ECOINSIGHT_METRICS_H

#include <atomic>
#include <chrono>
#include <mutex>
#include <vector>
#include <string>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// TaskMetricRecord — per-task timing data
// ---------------------------------------------------------------------------
struct TaskMetricRecord {
    int    taskId;
    double waitingTimeMs;      // Time from submission to first execution
    double turnaroundTimeMs;   // Time from submission to completion
    double responseTimeMs;     // Same as waiting time for non-preemptive
    double executionTimeMs;    // Time spent actually running
};

// ---------------------------------------------------------------------------
// Metrics — aggregate scheduler statistics
// ---------------------------------------------------------------------------
class Metrics {
public:
    Metrics() = default;

    // ---- Counters ----
    void incrementSubmitted();
    void incrementCompleted();
    void incrementFailed();
    void incrementRetries();
    void incrementContextSwitches();

    int getSubmitted() const;
    int getCompleted() const;
    int getFailed() const;
    int getRetries() const;
    int getContextSwitches() const;

    // ---- Worker activity ----
    void recordWorkerBusy(int workerId);
    void recordWorkerIdle(int workerId);

    // ---- Per-task timing ----
    void recordTaskMetrics(const TaskMetricRecord& record);

    // ---- Computed statistics ----
    double getAverageWaitingTimeMs() const;
    double getAverageTurnaroundTimeMs() const;
    double getAverageResponseTimeMs() const;
    double getThroughput(double totalElapsedSec) const;

    // ---- Display ----
    std::string generateReport(double totalElapsedSec) const;

    // ---- Snapshot of per-task records ----
    std::vector<TaskMetricRecord> getTaskRecords() const;

private:
    std::atomic<int> m_submitted{0};
    std::atomic<int> m_completed{0};
    std::atomic<int> m_failed{0};
    std::atomic<int> m_retries{0};
    std::atomic<int> m_contextSwitches{0};

    mutable std::mutex              m_recordMutex;
    std::vector<TaskMetricRecord>   m_taskRecords;
};

} // namespace ecoinsight

#endif // ECOINSIGHT_METRICS_H
