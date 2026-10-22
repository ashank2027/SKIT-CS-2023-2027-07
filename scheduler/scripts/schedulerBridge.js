/**
 * ============================================================================
 * ECOINSIGHT — C++ Scheduler Backend Integration Bridge Module
 * ============================================================================
 * File:    scheduler/scripts/schedulerBridge.js
 * Author:  Ashank Arora
 * Module:  Scheduler — Node.js child_process Integration Bridge
 *
 * Purpose:
 *   Production-ready Node.js bridge module for Chetan's Express backend.
 *   Enables background execution of heavy computational jobs (CSV parsing,
 *   analytics aggregation, and AI analysis) via the C++ scheduler CLI.
 *
 * Usage in Chetan's backend controllers:
 *   const schedulerBridge = require('./schedulerBridge');
 *   const result = await schedulerBridge.runTask({
 *     type: 'CSV_PROCESSING',
 *     taskId: 101,
 *     userId: req.user.id,
 *     inputPath: req.file.path,
 *     outputPath: `uploads/results/task_101.json`,
 *     priority: 8
 *   });
 * ============================================================================
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to C++ scheduler binary (defaults to build/ecoinsight_scheduler)
const SCHEDULER_BIN = process.platform === 'win32'
  ? path.resolve(__dirname, '../build/ecoinsight_scheduler.exe')
  : path.resolve(__dirname, '../build/ecoinsight_scheduler');

/**
 * Execute a task through the C++ OS Scheduling Engine.
 *
 * @param {Object} opts Task options
 * @param {string} opts.type - 'CSV_PROCESSING' | 'ANALYTICS' | 'AI_ANALYSIS'
 * @param {number} opts.taskId - Database task ID (tasks table)
 * @param {number} [opts.userId=1] - User ID
 * @param {string} opts.inputPath - Path to input dataset (CSV / JSON)
 * @param {string} [opts.outputPath] - Optional path to write result JSON
 * @param {number} [opts.priority=5] - Priority value (1-10)
 * @param {string} [opts.policy='PRIORITY'] - 'PRIORITY' or 'ROUND_ROBIN'
 * @param {number} [opts.workers=2] - Number of worker threads
 * @param {number} [opts.timeoutMs=30000] - Process timeout in milliseconds
 * @returns {Promise<Object>} Resolves with parsed JSON result conforming to tasks.result_reference
 */
function runTask(opts) {
  return new Promise((resolve, reject) => {
    if (!opts.inputPath) {
      return reject(new Error('Input path is required for scheduler execution.'));
    }

    const args = [
      '--type', opts.type || 'CSV_PROCESSING',
      '--task-id', String(opts.taskId || 1),
      '--user-id', String(opts.userId || 1),
      '--priority', String(opts.priority || 5),
      '--policy', opts.policy || 'PRIORITY',
      '--workers', String(opts.workers || 2),
      '--input', path.resolve(opts.inputPath)
    ];

    if (opts.outputPath) {
      args.push('--output', path.resolve(opts.outputPath));
    }

    let stdoutData = '';
    let stderrData = '';

    const child = spawn(SCHEDULER_BIN, args, {
      timeout: opts.timeoutMs || 30000,
      env: process.env
    });

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn C++ scheduler process: ${err.message}`));
    });

    child.on('close', (code) => {
      // Look for JSON output in stdout
      let parsedResult = null;
      try {
        const jsonMatch = stdoutData.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch (jsonErr) {
        // Fallback if parsing fails
      }

      if (code === 0 && parsedResult) {
        resolve({
          success: true,
          exitCode: 0,
          data: parsedResult,
          rawOutput: stdoutData
        });
      } else if (code === 0) {
        resolve({
          success: true,
          exitCode: 0,
          data: { status: 'COMPLETED', output: stdoutData },
          rawOutput: stdoutData
        });
      } else {
        const errMsg = stderrData || `Scheduler exited with code ${code}`;
        reject({
          success: false,
          exitCode: code,
          errorMessage: errMsg,
          data: parsedResult,
          rawOutput: stdoutData
        });
      }
    });
  });
}

module.exports = {
  runTask,
  SCHEDULER_BIN
};
