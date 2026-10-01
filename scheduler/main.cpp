// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    main.cpp
// Author:  Ashank Arora
// Module:  Scheduler — Demonstration Program
//
// Purpose:
//   Demonstrates the complete scheduler MVP for final-year project:
//
//   1.  Task creation with various types and priorities
//   2.  Queue insertion
//   3.  Priority Scheduling — tasks processed by priority order
//   4.  Round Robin — tasks processed in FIFO with time quantum
//   5.  Worker execution with multiple threads
//   6.  Successful task completion
//   7.  Simulated task failures
//   8.  Retry mechanism (up to 3 retries)
//   9.  Maximum retry handling (terminal failure)
//   10. Task status transitions (QUEUED→RUNNING→COMPLETED / FAILED / RETRYING)
//   11. Scheduler metrics (waiting, turnaround, throughput, etc.)
//
// Task types used (matching database contract):
//   CSV_PROCESSING, ANALYTICS, FORECAST, REPORT_GENERATION, AI_ANALYSIS
// ============================================================================

#include "Task.h"
#include "TaskQueue.h"
#include "Scheduler.h"
#include "Metrics.h"

#include <iostream>
#include <memory>
#include <thread>
#include <chrono>
#include <atomic>
#include <sstream>
#include <iomanip>

using namespace ecoinsight;
using namespace std::chrono_literals;

// ---------------------------------------------------------------------------
// Helper: print a section header
// ---------------------------------------------------------------------------
static void printHeader(const std::string& title) {
    std::cout << "\n";
    std::cout << "================================================================\n";
    std::cout << "  " << title << "\n";
    std::cout << "================================================================\n\n";
}

// ---------------------------------------------------------------------------
// Helper: print task info
// ---------------------------------------------------------------------------
static void printTask(const std::shared_ptr<Task>& t) {
    std::ostringstream oss;
    oss << "  Task " << t->getId()
        << " | Type: " << std::setw(20) << std::left << taskTypeToString(t->getType())
        << " | Priority: " << t->getPriority()
        << " | Status: " << taskStatusToString(t->getStatus())
        << " | Retries: " << t->getRetryCount() << "/" << Task::MAX_RETRIES
        << " | User: " << t->getUserId()
        << "\n";
    std::cout << oss.str();
}

// ============================================================================
// DEMONSTRATION 1: Priority Scheduling
// ============================================================================
static void demoPriorityScheduling() {
    printHeader("DEMO 1: PRIORITY SCHEDULING");

    std::cout << "Policy: Tasks are selected by highest priority value.\n";
    std::cout << "Workers: 2 threads\n";
    std::cout << "Expected: Higher-priority tasks execute first.\n\n";

    auto startTime = std::chrono::steady_clock::now();

    Scheduler scheduler(SchedulingPolicy::PRIORITY, /*numWorkers=*/2);

    // Create tasks with varying priorities and types
    // Simulate that different users submit different computational jobs
    auto t1 = std::make_shared<Task>(1, TaskType::CSV_PROCESSING,     2, /*userId=*/101);
    auto t2 = std::make_shared<Task>(2, TaskType::ANALYTICS,          5, /*userId=*/101);
    auto t3 = std::make_shared<Task>(3, TaskType::FORECAST,           1, /*userId=*/102);
    auto t4 = std::make_shared<Task>(4, TaskType::REPORT_GENERATION,  8, /*userId=*/102);
    auto t5 = std::make_shared<Task>(5, TaskType::AI_ANALYSIS,        3, /*userId=*/103);
    auto t6 = std::make_shared<Task>(6, TaskType::CSV_PROCESSING,     5, /*userId=*/103);

    // Set work functions — each simulates computational work
    t1->setWorkFunction([] {
        std::this_thread::sleep_for(50ms);
        std::cout << "    [Task 1] CSV processing completed\n";
        return true;
    });
    t2->setWorkFunction([] {
        std::this_thread::sleep_for(40ms);
        std::cout << "    [Task 2] Analytics processing completed\n";
        return true;
    });
    t3->setWorkFunction([] {
        std::this_thread::sleep_for(30ms);
        std::cout << "    [Task 3] Forecast generation completed\n";
        return true;
    });
    t4->setWorkFunction([] {
        std::this_thread::sleep_for(60ms);
        std::cout << "    [Task 4] Report generation completed\n";
        return true;
    });
    t5->setWorkFunction([] {
        std::this_thread::sleep_for(35ms);
        std::cout << "    [Task 5] AI analysis completed\n";
        return true;
    });
    t6->setWorkFunction([] {
        std::this_thread::sleep_for(45ms);
        std::cout << "    [Task 6] CSV processing completed\n";
        return true;
    });

    std::cout << "--- Submitting Tasks ---\n";
    printTask(t1);
    printTask(t2);
    printTask(t3);
    printTask(t4);
    printTask(t5);
    printTask(t6);
    std::cout << "\n";

    // Submit all tasks
    scheduler.submitTask(t1);
    scheduler.submitTask(t2);
    scheduler.submitTask(t3);
    scheduler.submitTask(t4);
    scheduler.submitTask(t5);
    scheduler.submitTask(t6);

    std::cout << "--- Starting Scheduler ---\n\n";
    scheduler.start();

    // Wait for processing
    std::this_thread::sleep_for(500ms);
    scheduler.stop();

    auto endTime = std::chrono::steady_clock::now();
    double elapsed = std::chrono::duration<double>(endTime - startTime).count();

    std::cout << "\n--- Final Task States ---\n";
    printTask(t1);
    printTask(t2);
    printTask(t3);
    printTask(t4);
    printTask(t5);
    printTask(t6);

    std::cout << scheduler.getMetrics().generateReport(elapsed);
}

// ============================================================================
// DEMONSTRATION 2: Round Robin Scheduling
// ============================================================================
static void demoRoundRobinScheduling() {
    printHeader("DEMO 2: ROUND ROBIN SCHEDULING");

    std::cout << "Policy: Tasks executed FIFO, each gets time quantum = 1 unit.\n";
    std::cout << "Workers: 2 threads\n";
    std::cout << "Tasks with remaining work > quantum rotate to back of queue.\n\n";

    auto startTime = std::chrono::steady_clock::now();

    Scheduler scheduler(SchedulingPolicy::ROUND_ROBIN, /*numWorkers=*/2, /*timeQuantum=*/1);

    // Create tasks with different amounts of work (simulating RR rotation)
    auto t1 = std::make_shared<Task>(101, TaskType::ANALYTICS,         3, /*userId=*/201);
    auto t2 = std::make_shared<Task>(102, TaskType::CSV_PROCESSING,    2, /*userId=*/201);
    auto t3 = std::make_shared<Task>(103, TaskType::REPORT_GENERATION, 1, /*userId=*/202);
    auto t4 = std::make_shared<Task>(104, TaskType::FORECAST,          4, /*userId=*/202);

    // Set remaining work units for RR demonstration
    t1->setRemainingWork(3);  // Needs 3 quanta to complete
    t2->setRemainingWork(2);  // Needs 2 quanta
    t3->setRemainingWork(1);  // Needs 1 quantum (completes in first slice)
    t4->setRemainingWork(3);  // Needs 3 quanta

    // Work functions — always succeed (RR focuses on rotation, not failure)
    t1->setWorkFunction([] {
        std::this_thread::sleep_for(20ms);
        return true;
    });
    t2->setWorkFunction([] {
        std::this_thread::sleep_for(20ms);
        return true;
    });
    t3->setWorkFunction([] {
        std::this_thread::sleep_for(20ms);
        return true;
    });
    t4->setWorkFunction([] {
        std::this_thread::sleep_for(20ms);
        return true;
    });

    std::cout << "--- Submitting Tasks ---\n";
    printTask(t1);
    printTask(t2);
    printTask(t3);
    printTask(t4);
    std::cout << "\n";

    scheduler.submitTask(t1);
    scheduler.submitTask(t2);
    scheduler.submitTask(t3);
    scheduler.submitTask(t4);

    std::cout << "--- Starting Scheduler ---\n\n";
    scheduler.start();

    std::this_thread::sleep_for(800ms);
    scheduler.stop();

    auto endTime = std::chrono::steady_clock::now();
    double elapsed = std::chrono::duration<double>(endTime - startTime).count();

    std::cout << "\n--- Final Task States ---\n";
    printTask(t1);
    printTask(t2);
    printTask(t3);
    printTask(t4);

    std::cout << scheduler.getMetrics().generateReport(elapsed);
}

// ============================================================================
// DEMONSTRATION 3: Retry Mechanism
// ============================================================================
static void demoRetryMechanism() {
    printHeader("DEMO 3: RETRY MECHANISM (Max 3 Retries)");

    std::cout << "Demonstrates:\n";
    std::cout << "  - Task that fails and retries successfully on 2nd attempt\n";
    std::cout << "  - Task that always fails — exhausts 3 retries, becomes FAILED\n";
    std::cout << "  - Task that succeeds on first attempt (no retry needed)\n\n";

    auto startTime = std::chrono::steady_clock::now();

    Scheduler scheduler(SchedulingPolicy::PRIORITY, /*numWorkers=*/2);

    // Task that fails once, succeeds on retry
    std::atomic<int> t1_attempts{0};
    auto t1 = std::make_shared<Task>(201, TaskType::CSV_PROCESSING, 5, 301);
    t1->setWorkFunction([&t1_attempts] {
        int attempt = ++t1_attempts;
        std::this_thread::sleep_for(30ms);
        if (attempt <= 1) {
            std::cout << "    [Task 201] CSV processing FAILED (attempt " << attempt << ")\n";
            return false;
        }
        std::cout << "    [Task 201] CSV processing SUCCEEDED (attempt " << attempt << ")\n";
        return true;
    });

    // Task that always fails — will exhaust all 3 retries
    std::atomic<int> t2_attempts{0};
    auto t2 = std::make_shared<Task>(202, TaskType::REPORT_GENERATION, 3, 301);
    t2->setWorkFunction([&t2_attempts] {
        int attempt = ++t2_attempts;
        std::this_thread::sleep_for(25ms);
        std::cout << "    [Task 202] Report generation FAILED (attempt " << attempt << ")\n";
        return false;
    });

    // Task that always succeeds
    auto t3 = std::make_shared<Task>(203, TaskType::ANALYTICS, 4, 302);
    t3->setWorkFunction([] {
        std::this_thread::sleep_for(20ms);
        std::cout << "    [Task 203] Analytics processing SUCCEEDED\n";
        return true;
    });

    std::cout << "--- Submitting Tasks ---\n";
    printTask(t1);
    printTask(t2);
    printTask(t3);
    std::cout << "\n";

    scheduler.submitTask(t1);
    scheduler.submitTask(t2);
    scheduler.submitTask(t3);

    std::cout << "--- Starting Scheduler ---\n\n";
    scheduler.start();

    // Give enough time for retries
    std::this_thread::sleep_for(1500ms);
    scheduler.stop();

    auto endTime = std::chrono::steady_clock::now();
    double elapsed = std::chrono::duration<double>(endTime - startTime).count();

    std::cout << "\n--- Final Task States ---\n";
    printTask(t1);
    printTask(t2);
    printTask(t3);

    std::cout << "\nVerification:\n";
    std::cout << "  Task 201: Expected COMPLETED (failed once, succeeded on retry)\n";
    std::cout << "            Actual:  " << taskStatusToString(t1->getStatus())
              << " | Retries: " << t1->getRetryCount() << "\n";
    std::cout << "  Task 202: Expected FAILED (exhausted " << Task::MAX_RETRIES << " retries)\n";
    std::cout << "            Actual:  " << taskStatusToString(t2->getStatus())
              << " | Retries: " << t2->getRetryCount() << "\n";
    std::cout << "  Task 203: Expected COMPLETED (succeeded first attempt)\n";
    std::cout << "            Actual:  " << taskStatusToString(t3->getStatus())
              << " | Retries: " << t3->getRetryCount() << "\n";

    std::cout << scheduler.getMetrics().generateReport(elapsed);
}

// ============================================================================
// DEMONSTRATION 4: Task Status Lifecycle
// ============================================================================
static void demoTaskStatusLifecycle() {
    printHeader("DEMO 4: TASK STATUS LIFECYCLE");

    std::cout << "Demonstrates the complete lifecycle:\n";
    std::cout << "  QUEUED -> RUNNING -> COMPLETED\n";
    std::cout << "  QUEUED -> RUNNING -> FAILED -> RETRYING -> RUNNING -> ...\n\n";

    auto task = std::make_shared<Task>(301, TaskType::FORECAST, 5, 401);

    std::cout << "Created:   " << taskStatusToString(task->getStatus()) << "\n";

    task->markRunning();
    std::cout << "Running:   " << taskStatusToString(task->getStatus()) << "\n";

    task->markFailed("Simulated network error");
    std::cout << "Failed:    " << taskStatusToString(task->getStatus())
              << " (error: " << task->getErrorMessage() << ")\n";

    if (task->canRetry()) {
        task->incrementRetryCount();
        task->markRetrying();
        std::cout << "Retrying:  " << taskStatusToString(task->getStatus())
                  << " (retry " << task->getRetryCount() << "/" << Task::MAX_RETRIES << ")\n";
    }

    task->markRunning();
    std::cout << "Running:   " << taskStatusToString(task->getStatus()) << "\n";

    task->markCompleted("forecast_result_2026Q4.json");
    std::cout << "Completed: " << taskStatusToString(task->getStatus())
              << " (result: " << task->getResultReference() << ")\n";

    std::cout << "\nFull lifecycle demonstrated successfully.\n";
}

// ============================================================================
// DEMONSTRATION 5: Multithreading — Multiple Workers
// ============================================================================
static void demoMultithreading() {
    printHeader("DEMO 5: MULTITHREADING — 4 WORKER THREADS");

    std::cout << "Demonstrates 4 concurrent worker threads processing tasks.\n";
    std::cout << "Each task simulates computational work with sleep.\n\n";

    auto startTime = std::chrono::steady_clock::now();

    Scheduler scheduler(SchedulingPolicy::PRIORITY, /*numWorkers=*/4);

    // Create 8 tasks — more than workers to show queuing
    std::vector<std::shared_ptr<Task>> tasks;
    for (int i = 0; i < 8; ++i) {
        TaskType types[] = {
            TaskType::CSV_PROCESSING, TaskType::ANALYTICS,
            TaskType::FORECAST, TaskType::REPORT_GENERATION,
            TaskType::AI_ANALYSIS, TaskType::CSV_PROCESSING,
            TaskType::ANALYTICS, TaskType::FORECAST
        };
        auto t = std::make_shared<Task>(400 + i, types[i], /*priority=*/(i % 5) + 1, /*userId=*/(i % 3) + 501);
        int taskId = 400 + i;
        t->setWorkFunction([taskId] {
            std::this_thread::sleep_for(std::chrono::milliseconds(30 + (taskId % 4) * 10));
            return true;
        });
        tasks.push_back(t);
    }

    std::cout << "--- Submitting 8 Tasks to 4 Workers ---\n";
    for (auto& t : tasks) {
        printTask(t);
        scheduler.submitTask(t);
    }
    std::cout << "\n";

    scheduler.start();
    std::this_thread::sleep_for(600ms);
    scheduler.stop();

    auto endTime = std::chrono::steady_clock::now();
    double elapsed = std::chrono::duration<double>(endTime - startTime).count();

    std::cout << "\n--- Final Task States ---\n";
    for (auto& t : tasks) {
        printTask(t);
    }

    std::cout << scheduler.getMetrics().generateReport(elapsed);
}

// ============================================================================
// MAIN
// ============================================================================
int main() {
    std::cout << R"(
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   ECOINSIGHT — C++ OS-Based Scheduling Engine                        ║
║   Final-Year BTech CS Project (SKIT-CS-2023-2027-07)                ║
║                                                                      ║
║   Author : Ashank Arora                                              ║
║   Module : Scheduler MVP Demonstration                               ║
║                                                                      ║
║   Algorithms:                                                        ║
║     1. Priority Scheduling                                           ║
║     2. Round Robin (configurable time quantum)                       ║
║                                                                      ║
║   Features:                                                          ║
║     • Task abstraction (compatible with shared DB contract)          ║
║     • Thread-safe task queue (mutex + condition_variable)            ║
║     • Multiple worker threads (std::thread)                          ║
║     • Retry mechanism (max 3 retries)                                ║
║     • Scheduling metrics (wait, turnaround, throughput)              ║
║                                                                      ║
║   Task Types (from shared contract):                                 ║
║     CSV_PROCESSING | ANALYTICS | FORECAST                            ║
║     REPORT_GENERATION | AI_ANALYSIS                                  ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
)";

    // Demo 1: Priority Scheduling
    demoPriorityScheduling();

    // Demo 2: Round Robin
    demoRoundRobinScheduling();

    // Demo 3: Retry Mechanism
    demoRetryMechanism();

    // Demo 4: Task Status Lifecycle
    demoTaskStatusLifecycle();

    // Demo 5: Multithreading with 4 workers
    demoMultithreading();

    printHeader("ALL DEMONSTRATIONS COMPLETE");

    std::cout << "The EcoInsight C++ Scheduler MVP has been demonstrated.\n\n";
    std::cout << "Integration Points (future phases):\n";
    std::cout << "  • Backend (Chetan): POST /api/tasks creates task → scheduler receives\n";
    std::cout << "  • Database (Bhavya): tasks table persists state via backend\n";
    std::cout << "  • Frontend (Daksh): displays task status via GET /api/tasks/:id/status\n";
    std::cout << "  • Communication: Node.js ↔ C++ (to be implemented Jan-Feb 2027)\n";
    std::cout << "\n";

    return 0;
}
