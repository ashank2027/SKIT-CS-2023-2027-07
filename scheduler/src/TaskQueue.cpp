// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    TaskQueue.cpp
// Author:  Ashank Arora
// Module:  Scheduler — Task Queue Implementation
// ============================================================================

#include "TaskQueue.h"
#include <algorithm>

namespace ecoinsight {

// ---------------------------------------------------------------------------
// push — add task, notify one waiting worker
// ---------------------------------------------------------------------------
void TaskQueue::push(TaskPtr task) {
    {
        std::lock_guard<std::mutex> lock(m_mutex);
        m_tasks.push_back(std::move(task));
    }
    m_cv.notify_one();
}

// ---------------------------------------------------------------------------
// popHighestPriority — find and remove task with highest priority value
// ---------------------------------------------------------------------------
TaskQueue::TaskPtr TaskQueue::popHighestPriority() {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (m_tasks.empty()) return nullptr;

    // Find task with highest priority (higher value = higher priority)
    auto it = std::max_element(m_tasks.begin(), m_tasks.end(),
        [](const TaskPtr& a, const TaskPtr& b) {
            return a->getPriority() < b->getPriority();
        });

    TaskPtr task = *it;
    m_tasks.erase(it);
    return task;
}

// ---------------------------------------------------------------------------
// popFront — FIFO removal for Round Robin
// ---------------------------------------------------------------------------
TaskQueue::TaskPtr TaskQueue::popFront() {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (m_tasks.empty()) return nullptr;

    TaskPtr task = m_tasks.front();
    m_tasks.pop_front();
    return task;
}

// ---------------------------------------------------------------------------
// pushBack — reinsert at back (Round Robin rotation)
// ---------------------------------------------------------------------------
void TaskQueue::pushBack(TaskPtr task) {
    {
        std::lock_guard<std::mutex> lock(m_mutex);
        m_tasks.push_back(std::move(task));
    }
    m_cv.notify_one();
}

// ---------------------------------------------------------------------------
// empty / size
// ---------------------------------------------------------------------------
bool TaskQueue::empty() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_tasks.empty();
}

size_t TaskQueue::size() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_tasks.size();
}

// ---------------------------------------------------------------------------
// Blocking wait variants — workers sleep here until work arrives or shutdown
// ---------------------------------------------------------------------------
TaskQueue::TaskPtr TaskQueue::waitAndPopHighestPriority() {
    std::unique_lock<std::mutex> lock(m_mutex);
    m_cv.wait(lock, [this] { return !m_tasks.empty() || m_shutdown; });

    if (m_tasks.empty()) return nullptr;  // shutdown with no tasks

    auto it = std::max_element(m_tasks.begin(), m_tasks.end(),
        [](const TaskPtr& a, const TaskPtr& b) {
            return a->getPriority() < b->getPriority();
        });

    TaskPtr task = *it;
    m_tasks.erase(it);
    return task;
}

TaskQueue::TaskPtr TaskQueue::waitAndPopFront() {
    std::unique_lock<std::mutex> lock(m_mutex);
    m_cv.wait(lock, [this] { return !m_tasks.empty() || m_shutdown; });

    if (m_tasks.empty()) return nullptr;

    TaskPtr task = m_tasks.front();
    m_tasks.pop_front();
    return task;
}

// ---------------------------------------------------------------------------
// Shutdown — wake all waiting threads
// ---------------------------------------------------------------------------
void TaskQueue::shutdown() {
    {
        std::lock_guard<std::mutex> lock(m_mutex);
        m_shutdown = true;
    }
    m_cv.notify_all();
}

bool TaskQueue::isShutdown() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_shutdown;
}

void TaskQueue::notifyOne() {
    m_cv.notify_one();
}

// ---------------------------------------------------------------------------
// snapshot — copy of all queued tasks for metrics/display
// ---------------------------------------------------------------------------
std::vector<TaskQueue::TaskPtr> TaskQueue::snapshot() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    return std::vector<TaskPtr>(m_tasks.begin(), m_tasks.end());
}

} // namespace ecoinsight
