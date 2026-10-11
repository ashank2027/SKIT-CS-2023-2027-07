// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    Scheduler.h
// Author:  Ashank Arora
// Module:  Scheduler — Scheduler Abstraction & Policies
//
// Purpose:
//   Provides a scheduling policy abstraction so Priority Scheduling and
//   Round Robin can be selected without rewriting the scheduler.
//   The Scheduler owns the queue, workers, and metrics.
//
// Scheduling policies:
//   1. Priority Scheduling — tasks selected by highest priority value.
//      Tie-breaking: FIFO (first inserted among equal-priority tasks).
//   2. Round Robin — tasks selected FIFO; each gets a configurable time
//      quantum (simulated as work units). Unfinished tasks rotate to back.
// ============================================================================

#ifndef ECOINSIGHT_SCHEDULER_H
#define ECOINSIGHT_SCHEDULER_H

#include "Task.h"
#include "TaskQueue.h"
#include "Metrics.h"

#include <memory>
#include <vector>
#include <thread>
#include <atomic>
#include <functional>
#include <string>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// SchedulingPolicy — selectable algorithm
// ---------------------------------------------------------------------------
enum class SchedulingPolicy {
    PRIORITY,
    ROUND_ROBIN
};

const char* schedulingPolicyToString(SchedulingPolicy policy);

// ---------------------------------------------------------------------------
// Scheduler — Central scheduling engine
// ---------------------------------------------------------------------------
class Scheduler {
public:
    using TaskPtr = std::shared_ptr<Task>;

    // Constructor
    // @param policy        Scheduling algorithm to use
    // @param numWorkers    Number of worker threads
    // @param timeQuantum   Time quantum for Round Robin (work units per slice)
    Scheduler(SchedulingPolicy policy, int numWorkers = 2, int timeQuantum = 1);

    // Destructor — ensures clean shutdown
    ~Scheduler();

    // ---- Task submission ----
    void submitTask(TaskPtr task);

    // ---- Lifecycle ----
    void start();
    void stop();

    // ---- Configuration ----
    SchedulingPolicy getPolicy() const;
    int getTimeQuantum() const;
    int getNumWorkers() const;

    // ---- Metrics ----
    Metrics& getMetrics();
    const Metrics& getMetrics() const;

    // ---- Retry handling ----
    // Called by worker when a task fails; requeues if retries available
    void handleTaskFailure(TaskPtr task, const std::string& errorMsg);

private:
    // Worker thread function
    void workerLoop(int workerId);

    // Execute one task according to policy
    void executeTaskPriority(int workerId);
    void executeTaskRoundRobin(int workerId);

    SchedulingPolicy          m_policy;
    int                       m_numWorkers;
    int                       m_timeQuantum;

    TaskQueue                 m_queue;
    Metrics                   m_metrics;

    std::vector<std::thread>  m_workers;
    std::atomic<bool>         m_running{false};
};

} // namespace ecoinsight

#endif // ECOINSIGHT_SCHEDULER_H
