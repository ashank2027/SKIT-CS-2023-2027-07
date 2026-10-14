// ============================================================================
// ECOINSIGHT — C++ OS-Based Scheduling Engine
// ============================================================================
// File:    TaskRunner.h
// Author:  Ashank Arora
// Project: EcoInsight (SKIT-CS-2023-2027-07)
// Module:  Scheduler — CLI & Integration Task Runner
//
// Purpose:
//   Provides a Command Line Interface (CLI) runner allowing Chetan's
//   Node.js backend to submit and execute background computational tasks
//   via child_process (e.g. CSV_PROCESSING and ANALYTICS).
// ============================================================================

#ifndef ECOINSIGHT_TASK_RUNNER_H
#define ECOINSIGHT_TASK_RUNNER_H

#include <string>
#include "Task.h"
#include "Scheduler.h"

namespace ecoinsight {

struct CliOptions {
    bool isDemoMode{false};
    bool showHelp{false};
    int taskId{1};
    int userId{1};
    TaskType taskType{TaskType::CSV_PROCESSING};
    int priority{5};
    SchedulingPolicy policy{SchedulingPolicy::PRIORITY};
    int workerCount{2};
    std::string inputPath;
    std::string outputPath;
};

class TaskRunner {
public:
    static CliOptions parseArgs(int argc, char* argv[]);
    static void printUsage(const char* programName);
    static int execute(const CliOptions& options);
};

} // namespace ecoinsight

#endif // ECOINSIGHT_TASK_RUNNER_H
