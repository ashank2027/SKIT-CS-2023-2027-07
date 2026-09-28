# EcoInsight — C++ OS-Based Scheduling Engine

> **Author:** Ashank Arora  
> **Project:** EcoInsight (SKIT-CS-2023-2027-07)  
> **Module:** Scheduler  
> **Phase:** MVP — September 2026  

---

## 1. Purpose

The C++ Scheduling Engine is an **OS-inspired task scheduler** for EcoInsight's computational and background tasks. It is one of four integrated modules in the EcoInsight system:

| Module     | Owner                | Technology        |
|------------|----------------------|-------------------|
| Frontend   | Daksh Modi           | React.js          |
| Backend    | Chetan Sharma        | Node.js / Express |
| Database   | Bhavya Chautharamani | PostgreSQL        |
| Scheduler  | Ashank Arora         | C++17             |

The scheduler handles tasks such as:
- **CSV Processing** — large dataset imports
- **Analytics** — background analytics computation
- **Forecast Generation** — emission forecasting
- **Report Generation** — PDF report creation
- **AI Analysis** — background AI processing

It is **not** used for ordinary CRUD operations.

---

## 2. Architecture

```
Frontend (Daksh)
   |
   v
Backend API (Chetan)
   |
   v
Task Creation
   |
   v
C++ Scheduler (Ashank)
   |
   +---- Task Queue (thread-safe, mutex + condition_variable)
   |
   +---- Priority Scheduling (highest priority first)
   |
   +---- Round Robin (FIFO + configurable time quantum)
   |
   +---- Worker Threads (std::thread, 2-4 concurrent)
   |
   v
Task Result / Status
   |
   v
Backend (Chetan)
   |
   +---- PostgreSQL (Bhavya) — tasks table persists state
   |
   v
Frontend (Daksh) — displays status via GET /api/tasks/:id/status
```

---

## 3. Task Lifecycle

Tasks follow the lifecycle defined by the shared database contract:

```
QUEUED
  ↓
RUNNING
  ↓
COMPLETED  (success)

QUEUED
  ↓
RUNNING
  ↓
FAILED
  ↓
RETRYING  (retry_count < 3)
  ↓
QUEUED  (requeued)
  ↓
RUNNING
  ↓
... (up to 3 retries)
  ↓
FAILED  (terminal, retry_count = 3)
```

**Status values** (matching database CHECK constraint):
- `QUEUED` — waiting in queue
- `RUNNING` — actively being processed by a worker
- `COMPLETED` — successfully finished
- `FAILED` — execution failed (terminal if retries exhausted)
- `RETRYING` — failed but being requeued for another attempt

---

## 4. Priority Scheduling

- Tasks are selected from the queue in order of **highest priority value** (higher number = higher importance).
- **Tie-breaking:** FIFO — among tasks with equal priority, the first inserted is selected first.
- **Non-preemptive:** once a task starts running, it completes without interruption.
- Worker threads concurrently pull the highest-priority task available.

**Example:** Given tasks with priorities [2, 5, 1, 8, 3, 5]:
- Execution order: 8, 5 (first), 5 (second), 3, 2, 1

---

## 5. Round Robin Scheduling

- Tasks are selected **FIFO** (first-in, first-out) from the queue.
- Each task receives a **configurable time quantum** (measured in work units per slice).
- If a task has **remaining work** after its quantum expires, it is placed at the **back of the queue** (context switch).
- If a task finishes within its quantum, it is marked `COMPLETED`.
- **Context switches** are tracked in metrics.

**Example:** Given tasks with work units [3, 2, 1, 3] and quantum=1:
```
Round 1: T1(3→2), T2(2→1), T3(1→0 DONE), T4(3→2)
Round 2: T1(2→1), T2(1→0 DONE), T4(2→1)
Round 3: T1(1→0 DONE), T4(1→0 DONE)
```

---

## 6. Worker / Multithreading Design

- Workers are implemented as **std::thread** instances.
- The number of workers is configurable (default: 2, demo uses up to 4).
- Workers **sleep** on a **std::condition_variable** when the queue is empty — no busy waiting.
- On shutdown, workers are woken and joined cleanly.

**Synchronization primitives used:**
- `std::mutex` — protects the task queue from concurrent access
- `std::condition_variable` — workers wait for work, notified on task push or shutdown
- `std::atomic<bool>` — scheduler running state
- `std::lock_guard` / `std::unique_lock` — RAII lock management

---

## 7. Retry Mechanism

- Maximum retries: **3** (per project specification)
- On task failure:
  1. Task status → `FAILED`
  2. Check `retry_count < MAX_RETRIES`
  3. If retries available: increment `retry_count`, status → `RETRYING`, requeue task
  4. If retries exhausted: task remains `FAILED` (terminal)
- The demo visibly demonstrates actual requeueing and reprocessing.

---

## 8. Metrics

The scheduler tracks:

| Metric               | Description                                       |
|----------------------|---------------------------------------------------|
| Total Submitted      | Number of tasks submitted to the scheduler        |
| Completed            | Successfully completed tasks                      |
| Failed (terminal)    | Tasks that failed after exhausting all retries     |
| Total Retries        | Number of retry attempts across all tasks          |
| Context Switches     | Number of Round Robin preemptions                  |
| Avg Waiting Time     | Average time from submission to first execution    |
| Avg Turnaround Time  | Average time from submission to completion         |
| Avg Response Time    | Time from submission to first CPU attention        |
| Throughput           | Completed tasks per second                         |
| Per-task Breakdown   | Individual task timing data                        |

---

## 9. Build Instructions

### Prerequisites
- C++17 compatible compiler (g++ 7+, clang++ 5+, MSVC 2017+)
- CMake 3.14+ (recommended) or manual compilation
- Threading support (pthreads on Linux, native on Windows)

### Using CMake (recommended)
```bash
cd scheduler
mkdir build
cd build
cmake ..
cmake --build .
```

### Manual compilation (g++)
```bash
cd scheduler
g++ -std=c++17 -Wall -Wextra -Wpedantic -pthread \
    -Iinclude \
    src/Task.cpp src/TaskQueue.cpp src/Scheduler.cpp src/Metrics.cpp \
    main.cpp \
    -o ecoinsight_scheduler
```

### Manual compilation (MSVC)
```cmd
cd scheduler
cl /std:c++17 /EHsc /W4 /Iinclude ^
    src\Task.cpp src\TaskQueue.cpp src\Scheduler.cpp src\Metrics.cpp ^
    main.cpp ^
    /Fe:ecoinsight_scheduler.exe
```

---

## 10. Run Instructions

```bash
# After building:
./ecoinsight_scheduler        # Linux/macOS
.\ecoinsight_scheduler.exe    # Windows
```

The program runs 5 demonstration scenarios:
1. **Priority Scheduling** — 6 tasks, 2 workers, priority order
2. **Round Robin** — 4 tasks with varying work units, context switches
3. **Retry Mechanism** — fail+retry success, exhaust retries, first-attempt success
4. **Task Status Lifecycle** — manual walk-through of all status transitions
5. **Multithreading** — 8 tasks, 4 worker threads

---

## 11. Relationship with Backend

The backend (Chetan) will eventually:
1. Create a task via `POST /api/tasks` → persists in PostgreSQL `tasks` table
2. Submit the task to the C++ scheduler
3. Scheduler processes via Priority/RR → worker executes
4. Status updated back to backend → `UPDATE tasks SET status = ...`
5. Frontend polls status via `GET /api/tasks/:id/status`

**Current state:** The scheduler runs independently for the MVP. Backend-to-C++ runtime communication (likely via subprocess/IPC) is planned for Phase 12 (Jan–Feb 2027).

**Integration interface prepared:**
- `Scheduler::submitTask(TaskPtr)` — accepts tasks
- `Task::getStatus()` / `Task::getResultReference()` — read results
- Status/type enums match database values exactly

---

## 12. Relationship with Database

The `tasks` table in PostgreSQL (Bhavya) stores:
```sql
id, user_id, task_type, priority, status, retry_count,
created_at, started_at, completed_at, result_reference, error_message
```

The C++ `Task` class is **conceptually compatible**:
- `TaskType` enum values match database CHECK constraint exactly
- `TaskStatus` enum values match database CHECK constraint exactly
- `retry_count` and `MAX_RETRIES` (3) match database design
- `result_reference` and `error_message` are present in Task

**Note:** The MVP scheduler does not directly connect to PostgreSQL. Database persistence is handled by the backend (Chetan + Bhavya). The scheduler provides status/results that the backend reads and persists.

---

## 13. Relationship with Frontend

The frontend (Daksh) displays task status through the backend:
```
Frontend → GET /api/tasks/:id/status → Backend → tasks table → response → Frontend
```

The scheduler does **not** communicate directly with the frontend. All data flows through the backend REST API. Status values shown in the frontend (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `RETRYING`) match the scheduler's enum values exactly.

---

## 14. Future Integration Points

| Phase | Timeline | Integration |
|-------|----------|-------------|
| Phase 8 | Sep–Oct 2026 | CSV_PROCESSING and ANALYTICS task support |
| Phase 9 | Oct–Nov 2026 | AI_ANALYSIS background task |
| Phase 10 | Nov–Dec 2026 | FORECAST_GENERATION task |
| Phase 11 | Dec–Jan 2027 | REPORT_GENERATION task |
| Phase 12 | Jan–Feb 2027 | Full Node.js ↔ C++ integration, multiple workers, benchmarking |
| Phase 13 | Feb–Mar 2027 | Final testing, deployment, documentation |

**Key integration dependencies:**
- **Chetan (Backend):** Implements `POST /api/tasks` and Node.js → C++ communication
- **Bhavya (Database):** `tasks` table already created with correct schema
- **Daksh (Frontend):** Task monitoring UI planned for Jan–Feb 2027

---

## Project Structure

```
scheduler/
├── include/
│   ├── Task.h            # Task model (aligned with DB contract)
│   ├── TaskQueue.h       # Thread-safe task queue
│   ├── Scheduler.h       # Scheduler engine + policy abstraction
│   └── Metrics.h         # Performance metrics tracking
├── src/
│   ├── Task.cpp          # Task implementation
│   ├── TaskQueue.cpp     # Queue implementation (mutex + CV)
│   ├── Scheduler.cpp     # Priority + Round Robin + retry
│   └── Metrics.cpp       # Metrics computation + report
├── main.cpp              # Demonstration program (5 demos)
├── CMakeLists.txt        # CMake build configuration
└── README.md             # This file
```

---

## Assumptions & Decisions

1. **In-memory only:** MVP tasks exist in memory. Database persistence is handled by the backend in future phases.
2. **Work function model:** Tasks carry a `std::function<bool()>` that workers execute. In future integration, this would invoke actual processing logic.
3. **Round Robin simulation:** Work units simulate CPU bursts. Each quantum decrements remaining work. This models OS Round Robin faithfully.
4. **Priority representation:** Higher numeric value = higher priority (consistent with the database `priority >= 0` constraint).
5. **User isolation:** Each task carries a `userId` field matching the database `user_id` foreign key. The scheduler does not perform authentication (that's the backend's responsibility).
6. **No REST API in scheduler:** The scheduler is a C++ library/executable, not a web server. The backend handles all HTTP.
