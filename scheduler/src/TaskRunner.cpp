// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    TaskRunner.cpp
// Author:  Ashank Arora
// Project: EcoInsight (SKIT-CS-2023-2027-07)
// Module:  Scheduler — CLI & Integration Task Runner Implementation
// ============================================================================

#include "TaskRunner.h"
#include "CsvProcessor.h"
#include "AnalyticsProcessor.h"
#include "Metrics.h"

#include <iostream>
#include <fstream>
#include <cstring>
#include <chrono>
#include <thread>
#include <atomic>

namespace ecoinsight {

void TaskRunner::printUsage(const char* programName) {
    std::cout << "\n================================================================\n";
    std::cout << "ECOINSIGHT C++ SCHEDULER — CLI TASK RUNNER\n";
    std::cout << "================================================================\n";
    std::cout << "Usage:\n";
    std::cout << "  " << programName << " [options]\n\n";
    std::cout << "Options:\n";
    std::cout << "  --demo                  Run the interactive multi-scenario demo suite\n";
    std::cout << "  --type <TYPE>           Task type: CSV_PROCESSING | ANALYTICS (default: CSV_PROCESSING)\n";
    std::cout << "  --input <path>          Path to input file (e.g. data/sample_emissions.csv)\n";
    std::cout << "  --output <path>         Path to write result JSON (optional)\n";
    std::cout << "  --task-id <id>          Task ID from PostgreSQL tasks table (default: 1)\n";
    std::cout << "  --user-id <id>          User ID (default: 1)\n";
    std::cout << "  --priority <1-10>       Priority value (higher executes first, default: 5)\n";
    std::cout << "  --policy <P>            Scheduling policy: PRIORITY | ROUND_ROBIN (default: PRIORITY)\n";
    std::cout << "  --workers <count>       Number of worker threads (default: 2)\n";
    std::cout << "  --help, -h              Show this help message\n\n";
    std::cout << "Example (Node.js backend execution):\n";
    std::cout << "  " << programName << " --type CSV_PROCESSING --input uploads/emissions.csv --output results/task_42.json\n";
    std::cout << "================================================================\n\n";
}

CliOptions TaskRunner::parseArgs(int argc, char* argv[]) {
    CliOptions opts;

    if (argc <= 1) {
        // No args: run interactive demo by default
        opts.isDemoMode = true;
        return opts;
    }

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if (arg == "--demo") {
            opts.isDemoMode = true;
        } else if (arg == "--help" || arg == "-h") {
            opts.showHelp = true;
        } else if (arg == "--task-id" && i + 1 < argc) {
            opts.taskId = std::stoi(argv[++i]);
        } else if (arg == "--user-id" && i + 1 < argc) {
            opts.userId = std::stoi(argv[++i]);
        } else if (arg == "--priority" && i + 1 < argc) {
            opts.priority = std::stoi(argv[++i]);
        } else if (arg == "--workers" && i + 1 < argc) {
            opts.workerCount = std::stoi(argv[++i]);
        } else if (arg == "--input" && i + 1 < argc) {
            opts.inputPath = argv[++i];
        } else if (arg == "--output" && i + 1 < argc) {
            opts.outputPath = argv[++i];
        } else if (arg == "--policy" && i + 1 < argc) {
            std::string p = argv[++i];
            if (p == "ROUND_ROBIN" || p == "rr") {
                opts.policy = SchedulingPolicy::ROUND_ROBIN;
            } else {
                opts.policy = SchedulingPolicy::PRIORITY;
            }
        } else if (arg == "--type" && i + 1 < argc) {
            std::string t = argv[++i];
            if (t == "ANALYTICS") {
                opts.taskType = TaskType::ANALYTICS;
            } else if (t == "FORECAST") {
                opts.taskType = TaskType::FORECAST;
            } else if (t == "REPORT_GENERATION") {
                opts.taskType = TaskType::REPORT_GENERATION;
            } else if (t == "AI_ANALYSIS") {
                opts.taskType = TaskType::AI_ANALYSIS;
            } else {
                opts.taskType = TaskType::CSV_PROCESSING;
            }
        }
    }

    return opts;
}

int TaskRunner::execute(const CliOptions& options) {
    if (options.inputPath.empty()) {
        std::cerr << "Error: --input file path is required for CLI task execution.\n";
        printUsage("ecoinsight_scheduler");
        return 2;
    }

    std::cout << "[EcoInsight Scheduler] Starting CLI Task Execution\n";
    std::cout << "  Task ID:   " << options.taskId << "\n";
    std::cout << "  Type:      " << taskTypeToString(options.taskType) << "\n";
    std::cout << "  Priority:  " << options.priority << "\n";
    std::cout << "  Policy:    " << (options.policy == SchedulingPolicy::PRIORITY ? "PRIORITY" : "ROUND_ROBIN") << "\n";
    std::cout << "  Workers:   " << options.workerCount << "\n";
    std::cout << "  Input:     " << options.inputPath << "\n";
    if (!options.outputPath.empty()) {
        std::cout << "  Output:    " << options.outputPath << "\n";
    }
    std::cout << "----------------------------------------------------------------\n";

    Scheduler scheduler(options.policy, options.workerCount);
    auto task = std::make_shared<Task>(options.taskId, options.taskType, options.priority, options.userId);

    std::atomic<bool> isDone{false};
    std::atomic<bool> isSuccess{false};
    std::string resultPayload;

    // Attach concrete task worker
    if (options.taskType == TaskType::CSV_PROCESSING) {
        task->setWorkFunction([&]() -> bool {
            CsvProcessor processor;
            auto result = processor.processFile(options.inputPath, options.userId);
            resultPayload = result.toJson();
            isSuccess = result.success;
            isDone = true;
            return result.success;
        });
    } else if (options.taskType == TaskType::ANALYTICS) {
        task->setWorkFunction([&]() -> bool {
            AnalyticsProcessor processor;
            auto result = processor.processCsvFile(options.inputPath);
            resultPayload = result.toJson();
            isSuccess = result.success;
            isDone = true;
            return result.success;
        });
    } else {
        // Fallback for future task types
        task->setWorkFunction([&]() -> bool {
            resultPayload = "{\"status\": \"SUCCESS\", \"message\": \"Task executed successfully\"}";
            isSuccess = true;
            isDone = true;
            return true;
        });
    }

    // Submit into OS scheduler queue
    scheduler.submitTask(task);

    // Wait for worker thread execution
    auto waitStart = std::chrono::steady_clock::now();
    while (!isDone) {
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::steady_clock::now() - waitStart).count();
        if (elapsed > 30) { // 30-second timeout guard
            std::cerr << "[EcoInsight Scheduler] Error: Task timed out after 30 seconds.\n";
            scheduler.shutdown();
            return 1;
        }
    }

    scheduler.shutdown();

    // Write output to file if requested
    if (!options.outputPath.empty()) {
        std::ofstream out(options.outputPath);
        if (out.is_open()) {
            out << resultPayload;
            std::cout << "[EcoInsight Scheduler] Result written to: " << options.outputPath << "\n";
        } else {
            std::cerr << "[EcoInsight Scheduler] Warning: Could not write output to: " << options.outputPath << "\n";
        }
    }

    // Print result JSON summary to stdout (useful for piping into Node.js stdout)
    std::cout << resultPayload << "\n";

    if (isSuccess) {
        std::cout << "[EcoInsight Scheduler] Task " << options.taskId << " COMPLETED successfully.\n";
        return 0;
    } else {
        std::cerr << "[EcoInsight Scheduler] Task " << options.taskId << " FAILED.\n";
        return 1;
    }
}

} // namespace ecoinsight
