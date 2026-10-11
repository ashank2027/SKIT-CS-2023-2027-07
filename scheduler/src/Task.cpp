// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    Task.cpp
// Author:  Ashank Arora
// Module:  Scheduler — Task Model Implementation
// ============================================================================

#include "Task.h"
#include <stdexcept>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// Enum-to-string utilities
// ---------------------------------------------------------------------------
const char* taskStatusToString(TaskStatus status) {
    switch (status) {
        case TaskStatus::QUEUED:    return "QUEUED";
        case TaskStatus::RUNNING:   return "RUNNING";
        case TaskStatus::COMPLETED: return "COMPLETED";
        case TaskStatus::FAILED:    return "FAILED";
        case TaskStatus::RETRYING:  return "RETRYING";
    }
    return "UNKNOWN";
}

const char* taskTypeToString(TaskType type) {
    switch (type) {
        case TaskType::CSV_PROCESSING:     return "CSV_PROCESSING";
        case TaskType::ANALYTICS:          return "ANALYTICS";
        case TaskType::FORECAST:           return "FORECAST";
        case TaskType::REPORT_GENERATION:  return "REPORT_GENERATION";
        case TaskType::AI_ANALYSIS:        return "AI_ANALYSIS";
    }
    return "UNKNOWN";
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------
Task::Task(int id, TaskType type, int priority, int userId)
    : m_id(id)
    , m_type(type)
    , m_priority(priority)
    , m_status(TaskStatus::QUEUED)
    , m_retryCount(0)
    , m_userId(userId)
    , m_createdAt(std::chrono::steady_clock::now())
    , m_startedAt()
    , m_completedAt()
    , m_workFunction(nullptr)
    , m_remainingWork(1)  // Default: 1 unit of work (overridden for RR demo)
{
}

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------
int Task::getId() const { return m_id; }
TaskType Task::getType() const { return m_type; }
int Task::getPriority() const { return m_priority; }
TaskStatus Task::getStatus() const { return m_status; }
int Task::getRetryCount() const { return m_retryCount; }
int Task::getUserId() const { return m_userId; }
const std::string& Task::getResultReference() const { return m_resultReference; }
const std::string& Task::getErrorMessage() const { return m_errorMessage; }

Task::TimePoint Task::getCreatedAt() const { return m_createdAt; }
Task::TimePoint Task::getStartedAt() const { return m_startedAt; }
Task::TimePoint Task::getCompletedAt() const { return m_completedAt; }

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------
void Task::markRunning() {
    m_status = TaskStatus::RUNNING;
    m_startedAt = std::chrono::steady_clock::now();
    m_errorMessage.clear();
}

void Task::markCompleted(const std::string& resultRef) {
    m_status = TaskStatus::COMPLETED;
    m_completedAt = std::chrono::steady_clock::now();
    m_resultReference = resultRef;
    m_errorMessage.clear();
}

void Task::markFailed(const std::string& errorMsg) {
    m_status = TaskStatus::FAILED;
    m_completedAt = std::chrono::steady_clock::now();
    m_errorMessage = errorMsg;
}

void Task::markRetrying() {
    m_status = TaskStatus::RETRYING;
    // reset completed timestamp — task is going back to queue
    m_completedAt = TimePoint{};
}

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------
bool Task::canRetry() const {
    return m_retryCount < MAX_RETRIES;
}

void Task::incrementRetryCount() {
    m_retryCount++;
}

// ---------------------------------------------------------------------------
// Work function
// ---------------------------------------------------------------------------
void Task::setWorkFunction(WorkFunction fn) {
    m_workFunction = std::move(fn);
}

bool Task::execute() {
    if (!m_workFunction) {
        return false;
    }
    return m_workFunction();
}

// ---------------------------------------------------------------------------
// Round Robin support
// ---------------------------------------------------------------------------
int Task::getRemainingWork() const { return m_remainingWork; }

void Task::setRemainingWork(int units) { m_remainingWork = units; }

void Task::decrementRemainingWork(int units) {
    m_remainingWork -= units;
    if (m_remainingWork < 0) m_remainingWork = 0;
}

} // namespace ecoinsight
