# ============================================================================
# ECOINSIGHT — C++ OS-Based Scheduling Engine
# ============================================================================
# Author:  Ashank Arora
# Project: EcoInsight (SKIT-CS-2023-2027-07)
# Module:  Scheduler
#
# Build:
#   mkdir build && cd build
#   cmake ..
#   cmake --build .
#
# Run:
#   ./ecoinsight_scheduler   (Linux/macOS)
#   .\ecoinsight_scheduler.exe   (Windows)
# ============================================================================

cmake_minimum_required(VERSION 3.14)

project(EcoInsightScheduler
    VERSION 1.0.0
    DESCRIPTION "EcoInsight C++ OS-Based Scheduling Engine"
    LANGUAGES CXX
)

# C++17 standard (per project requirements)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Threading support (required for std::thread, mutex, condition_variable)
find_package(Threads REQUIRED)

# Source files
set(SCHEDULER_SOURCES
    src/Task.cpp
    src/TaskQueue.cpp
    src/Scheduler.cpp
    src/Metrics.cpp
    src/CsvProcessor.cpp
    src/AnalyticsProcessor.cpp
    src/AiAnalysisProcessor.cpp
    src/TaskRunner.cpp
)

# Header files (for IDE support)
set(SCHEDULER_HEADERS
    include/Task.h
    include/TaskQueue.h
    include/Scheduler.h
    include/Metrics.h
    include/CsvProcessor.h
    include/AnalyticsProcessor.h
    include/AiAnalysisProcessor.h
    include/TaskRunner.h
)

# Main executable
add_executable(ecoinsight_scheduler
    main.cpp
    ${SCHEDULER_SOURCES}
    ${SCHEDULER_HEADERS}
)

# Include directories
target_include_directories(ecoinsight_scheduler PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Link threading library
target_link_libraries(ecoinsight_scheduler PRIVATE
    Threads::Threads
)

# Compiler warnings (help catch issues during development)
if(MSVC)
    target_compile_options(ecoinsight_scheduler PRIVATE /W4)
else()
    target_compile_options(ecoinsight_scheduler PRIVATE -Wall -Wextra -Wpedantic)
endif()
