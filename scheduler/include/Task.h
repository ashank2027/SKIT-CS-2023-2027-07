// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    Task.h
// Author:  Ashank Arora
// Project: EcoInsight (SKIT-CS-2023-2027-07)
// Module:  Scheduler — Task Model
//
// Purpose:
//   Defines the Task abstraction for the scheduling engine.
//   Field names and status/type values are aligned with the shared
//   database contract (tasks table) defined by Bhavya Chautharamani.
//
// Database contract fields (tasks table):
//   id, user_id, task_type, priority, status, retry_count,
//   created_at, started_at, completed_at, result_reference, error_message
//
// Status values (shared contract):
//   QUEUED, RUNNING, COMPLETED, FAILED, RETRYING
//
// Task types (shared contract):
//   CSV_PROCESSING, ANALYTICS, FORECAST, REPORT_GENERATION, AI_ANALYSIS
//
// Max retries: 3 (per project specification)
// ============================================================================

#ifndef ECOINSIGHT_TASK_H
#define ECOINSIGHT_TASK_H

#include <string>
#include <chrono>
#include <functional>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// TaskStatus — matches database CHECK constraint exactly
// ---------------------------------------------------------------------------
enum class TaskStatus {
    QUEUED,
    RUNNING,
    COMPLETED,
    FAILED,
    RETRYING
};

// ---------------------------------------------------------------------------
// TaskType — matches database CHECK constraint exactly
// ---------------------------------------------------------------------------
enum class TaskType {
    CSV_PROCESSING,
    ANALYTICS,
    FORECAST,
    REPORT_GENERATION,
    AI_ANALYSIS
};

// ---------------------------------------------------------------------------
// Utility: convert enums to/from string (for logging and future integration)
// ---------------------------------------------------------------------------
const char* taskStatusToString(TaskStatus status);
const char* taskTypeToString(TaskType type);

// ---------------------------------------------------------------------------
// Task — Core scheduling unit
// ---------------------------------------------------------------------------
// Conceptually compatible with the shared tasks table.
// For the standalone MVP, tasks live in memory. Persistent
// backend/database integration is a future phase (17 Jan – 14 Feb 2027).
// ---------------------------------------------------------------------------

class Task {
public:
    // Type alias for the work function a task executes
    using WorkFunction = std::function<bool()>;

    // Maximum retries per project specification
    static constexpr int MAX_RETRIES = 3;

    // Constructor
    Task(int id, TaskType type, int priority, int userId = 0);

    // ---- Getters ----
    int getId() const;
    TaskType getType() const;
    int getPriority() const;
    TaskStatus getStatus() const;
    int getRetryCount() const;
    int getUserId() const;
    const std::string& getResultReference() const;
    const std::string& getErrorMessage() const;

    // Timestamps (chrono steady_clock for metrics; wall-clock not needed in MVP)
    using TimePoint = std::chrono::steady_clock::time_point;

    TimePoint getCreatedAt() const;
    TimePoint getStartedAt() const;
    TimePoint getCompletedAt() const;

    // ---- Status transitions ----
    void markRunning();
    void markCompleted(const std::string& resultRef = "");
    void markFailed(const std::string& errorMsg);
    void markRetrying();

    // ---- Retry ----
    bool canRetry() const;
    void incrementRetryCount();

    // ---- Work function ----
    void setWorkFunction(WorkFunction fn);
    bool execute();  // Runs the work function; returns true on success

    // ---- Round Robin support ----
    // Remaining work units for RR time-quantum simulation
    int getRemainingWork() const;
    void setRemainingWork(int units);
    void decrementRemainingWork(int units);

private:
    int         m_id;
    TaskType    m_type;
    int         m_priority;      // Higher value = higher priority
    TaskStatus  m_status;
    int         m_retryCount;
    int         m_userId;

    std::string m_resultReference;
    std::string m_errorMessage;

    TimePoint   m_createdAt;
    TimePoint   m_startedAt;
    TimePoint   m_completedAt;

    WorkFunction m_workFunction;

    // Round Robin: simulated remaining work units
    int         m_remainingWork;
};

} // namespace ecoinsight

#endif // ECOINSIGHT_TASK_H
