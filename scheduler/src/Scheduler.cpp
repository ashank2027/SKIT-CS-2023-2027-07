// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    Scheduler.cpp
// Author:  Ashank Arora
// Module:  Scheduler — Core Scheduling Engine Implementation
//
// Scheduling Behavior:
//
//   Priority Scheduling:
//     - Tasks are selected from the queue in order of highest priority value.
//     - Higher numeric priority = higher importance.
//     - Same-priority tasks: FIFO (deterministic — first inserted wins since
//       max_element returns the first maximum in the deque).
//     - Non-preemptive: once a task starts, it runs to completion.
//
//   Round Robin:
//     - Tasks are selected FIFO from the queue.
//     - Each task gets a configurable time quantum (measured in work units).
//     - If a task has remaining work after its quantum, it is placed at the
//       back of the queue (context switch tracked).
//     - If a task finishes within its quantum, it completes normally.
//
//   Retry:
//     - On failure, if retry_count < MAX_RETRIES (3), the task status is set
//       to RETRYING, retry_count incremented, then task is requeued as QUEUED.
//     - After MAX_RETRIES, the task becomes FAILED (terminal).
// ============================================================================

#include "Scheduler.h"
#include <iostream>
#include <sstream>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
const char* schedulingPolicyToString(SchedulingPolicy policy) {
    switch (policy) {
        case SchedulingPolicy::PRIORITY:    return "PRIORITY";
        case SchedulingPolicy::ROUND_ROBIN: return "ROUND_ROBIN";
    }
    return "UNKNOWN";
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------
Scheduler::Scheduler(SchedulingPolicy policy, int numWorkers, int timeQuantum)
    : m_policy(policy)
    , m_numWorkers(numWorkers)
    , m_timeQuantum(timeQuantum)
{
}

// ---------------------------------------------------------------------------
// Destructor — clean shutdown
// ---------------------------------------------------------------------------
Scheduler::~Scheduler() {
    stop();
}

// ---------------------------------------------------------------------------
// submitTask
// ---------------------------------------------------------------------------
void Scheduler::submitTask(TaskPtr task) {
    m_metrics.incrementSubmitted();
    m_queue.push(std::move(task));
}

// ---------------------------------------------------------------------------
// start / stop
// ---------------------------------------------------------------------------
void Scheduler::start() {
    if (m_running.load()) return;
    m_running.store(true);

    for (int i = 0; i < m_numWorkers; ++i) {
        m_workers.emplace_back(&Scheduler::workerLoop, this, i);
    }
}

void Scheduler::stop() {
    if (!m_running.load()) return;
    m_running.store(false);
    m_queue.shutdown();

    for (auto& t : m_workers) {
        if (t.joinable()) t.join();
    }
    m_workers.clear();
}

// ---------------------------------------------------------------------------
// Configuration getters
// ---------------------------------------------------------------------------
SchedulingPolicy Scheduler::getPolicy() const { return m_policy; }
int Scheduler::getTimeQuantum() const { return m_timeQuantum; }
int Scheduler::getNumWorkers() const { return m_numWorkers; }

Metrics& Scheduler::getMetrics() { return m_metrics; }
const Metrics& Scheduler::getMetrics() const { return m_metrics; }

// ---------------------------------------------------------------------------
// workerLoop — each worker thread runs this
// ---------------------------------------------------------------------------
void Scheduler::workerLoop(int workerId) {
    while (m_running.load()) {
        switch (m_policy) {
            case SchedulingPolicy::PRIORITY:
                executeTaskPriority(workerId);
                break;
            case SchedulingPolicy::ROUND_ROBIN:
                executeTaskRoundRobin(workerId);
                break;
        }
    }
}

// ---------------------------------------------------------------------------
// executeTaskPriority — Priority Scheduling execution
// ---------------------------------------------------------------------------
void Scheduler::executeTaskPriority(int workerId) {
    TaskPtr task = m_queue.waitAndPopHighestPriority();
    if (!task) return;  // shutdown

    m_metrics.recordWorkerBusy(workerId);

    auto createdAt = task->getCreatedAt();
    auto startTime = std::chrono::steady_clock::now();

    // Mark RUNNING
    task->markRunning();

    {
        std::ostringstream oss;
        oss << "[Worker " << workerId << "] RUNNING Task " << task->getId()
            << " (" << taskTypeToString(task->getType())
            << ", priority=" << task->getPriority() << ")\n";
        std::cout << oss.str();
    }

    // Execute
    bool success = task->execute();

    auto endTime = std::chrono::steady_clock::now();

    if (success) {
        task->markCompleted("result_ok");
        m_metrics.incrementCompleted();

        {
            std::ostringstream oss;
            oss << "[Worker " << workerId << "] COMPLETED Task " << task->getId() << "\n";
            std::cout << oss.str();
        }
    } else {
        handleTaskFailure(task, "Execution returned false");
    }

    // Record per-task metrics
    double waitMs = std::chrono::duration<double, std::milli>(startTime - createdAt).count();
    double turnMs = std::chrono::duration<double, std::milli>(endTime - createdAt).count();
    double execMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();

    TaskMetricRecord rec;
    rec.taskId          = task->getId();
    rec.waitingTimeMs   = waitMs;
    rec.turnaroundTimeMs = turnMs;
    rec.responseTimeMs  = waitMs;  // Non-preemptive: response = waiting
    rec.executionTimeMs = execMs;
    m_metrics.recordTaskMetrics(rec);

    m_metrics.recordWorkerIdle(workerId);
}

// ---------------------------------------------------------------------------
// executeTaskRoundRobin — Round Robin execution with time quantum
// ---------------------------------------------------------------------------
void Scheduler::executeTaskRoundRobin(int workerId) {
    TaskPtr task = m_queue.waitAndPopFront();
    if (!task) return;  // shutdown

    m_metrics.recordWorkerBusy(workerId);

    auto createdAt = task->getCreatedAt();
    auto startTime = std::chrono::steady_clock::now();

    // Mark RUNNING (if not already from a previous quantum)
    if (task->getStatus() != TaskStatus::RUNNING) {
        task->markRunning();
    }

    int remaining = task->getRemainingWork();
    int quantum = m_timeQuantum;
    int workDone = std::min(quantum, remaining);

    {
        std::ostringstream oss;
        oss << "[Worker " << workerId << "] RR executing Task " << task->getId()
            << " (" << taskTypeToString(task->getType())
            << ") — work=" << workDone << "/" << remaining << "\n";
        std::cout << oss.str();
    }

    // Execute: for RR, we call execute() once per quantum slice
    bool success = task->execute();

    auto endTime = std::chrono::steady_clock::now();

    if (!success) {
        handleTaskFailure(task, "Execution returned false");

        double waitMs = std::chrono::duration<double, std::milli>(startTime - createdAt).count();
        double turnMs = std::chrono::duration<double, std::milli>(endTime - createdAt).count();
        double execMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();

        TaskMetricRecord rec;
        rec.taskId           = task->getId();
        rec.waitingTimeMs    = waitMs;
        rec.turnaroundTimeMs = turnMs;
        rec.responseTimeMs   = waitMs;
        rec.executionTimeMs  = execMs;
        m_metrics.recordTaskMetrics(rec);

        m_metrics.recordWorkerIdle(workerId);
        return;
    }

    task->decrementRemainingWork(workDone);

    if (task->getRemainingWork() > 0) {
        // Task not done — context switch: push to back of queue
        m_metrics.incrementContextSwitches();
        m_queue.pushBack(task);

        {
            std::ostringstream oss;
            oss << "[Worker " << workerId << "] Task " << task->getId()
                << " preempted — remaining=" << task->getRemainingWork()
                << " (context switch)\n";
            std::cout << oss.str();
        }
    } else {
        // Task completed within or at end of quantum
        task->markCompleted("result_ok");
        m_metrics.incrementCompleted();

        double waitMs = std::chrono::duration<double, std::milli>(startTime - createdAt).count();
        double turnMs = std::chrono::duration<double, std::milli>(endTime - createdAt).count();
        double execMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();

        TaskMetricRecord rec;
        rec.taskId           = task->getId();
        rec.waitingTimeMs    = waitMs;
        rec.turnaroundTimeMs = turnMs;
        rec.responseTimeMs   = waitMs;
        rec.executionTimeMs  = execMs;
        m_metrics.recordTaskMetrics(rec);

        {
            std::ostringstream oss;
            oss << "[Worker " << workerId << "] COMPLETED Task " << task->getId() << "\n";
            std::cout << oss.str();
        }
    }

    m_metrics.recordWorkerIdle(workerId);
}

// ---------------------------------------------------------------------------
// handleTaskFailure — retry or mark terminal FAILED
// ---------------------------------------------------------------------------
void Scheduler::handleTaskFailure(TaskPtr task, const std::string& errorMsg) {
    task->markFailed(errorMsg);

    if (task->canRetry()) {
        task->incrementRetryCount();
        task->markRetrying();
        m_metrics.incrementRetries();

        {
            std::ostringstream oss;
            oss << "[Scheduler] Task " << task->getId()
                << " FAILED — retrying (" << task->getRetryCount()
                << "/" << Task::MAX_RETRIES << ")\n";
            std::cout << oss.str();
        }

        // Requeue: mark back to QUEUED
        task->markRunning();  // Will be set to QUEUED conceptually by re-submission
        // Actually reset status for requeueing
        // We go RETRYING -> requeue. On next pick-up it will be marked RUNNING again.
        // For clean state, set QUEUED before pushing:
        task->markRetrying(); // keep status as RETRYING until picked up

        // Push back to queue for re-processing
        m_queue.push(task);
    } else {
        // Terminal failure
        m_metrics.incrementFailed();

        {
            std::ostringstream oss;
            oss << "[Scheduler] Task " << task->getId()
                << " PERMANENTLY FAILED after " << task->getRetryCount()
                << " retries\n";
            std::cout << oss.str();
        }
    }
}

} // namespace ecoinsight
