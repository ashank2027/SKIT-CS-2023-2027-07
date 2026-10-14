// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    TaskQueue.h
// Author:  Ashank Arora
// Module:  Scheduler — Task Queue
//
// Purpose:
//   Thread-safe task queue that supports both Priority Scheduling and
//   Round Robin without tightly coupling to one scheduling algorithm.
//   Uses mutex + condition_variable so workers can sleep when idle.
// ============================================================================

#ifndef ECOINSIGHT_TASKQUEUE_H
#define ECOINSIGHT_TASKQUEUE_H

#include "Task.h"
#include <memory>
#include <vector>
#include <deque>
#include <mutex>
#include <condition_variable>

namespace ecoinsight {

class TaskQueue {
public:
    using TaskPtr = std::shared_ptr<Task>;

    TaskQueue() = default;

    // ---- Core operations (thread-safe) ----

    // Add a task to the queue
    void push(TaskPtr task);

    // Retrieve and remove the highest-priority task
    // Returns nullptr if queue is empty (non-blocking)
    TaskPtr popHighestPriority();

    // Retrieve and remove the front task (FIFO / Round Robin order)
    // Returns nullptr if queue is empty (non-blocking)
    TaskPtr popFront();

    // Push a task to the back (for Round Robin re-insertion)
    void pushBack(TaskPtr task);

    // Check if the queue is empty
    bool empty() const;

    // Current size
    size_t size() const;

    // ---- Blocking wait (for workers) ----

    // Wait until the queue has a task or shutdown is signalled.
    // Returns nullptr if shutting down and queue is empty.
    TaskPtr waitAndPopHighestPriority();
    TaskPtr waitAndPopFront();

    // Signal all waiting threads to wake up (for shutdown)
    void shutdown();
    bool isShutdown() const;

    // Notify waiting workers that a new task is available
    void notifyOne();

    // Get a snapshot of all queued tasks (for metrics/display)
    std::vector<TaskPtr> snapshot() const;

private:
    mutable std::mutex       m_mutex;
    std::condition_variable  m_cv;
    std::deque<TaskPtr>      m_tasks;
    bool                     m_shutdown = false;
};

} // namespace ecoinsight

#endif // ECOINSIGHT_TASKQUEUE_H
