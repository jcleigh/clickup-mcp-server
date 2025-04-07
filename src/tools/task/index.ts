/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Task Tools
 * 
 * This module re-exports all task-related tools and handlers.
 */

// Re-export from main module
export * from './main.js';

// Re-export single task operation tools
export { 
  createTaskTool,
  getTaskTool,
  getTasksTool,
  updateTaskTool,
  moveTaskTool,
  duplicateTaskTool,
  getTaskCommentsTool,
  createTaskCommentTool
} from './single-operations.js';

// Re-export bulk task operation tools
export {
  createBulkTasksTool,
  updateBulkTasksTool,
  moveBulkTasksTool,
} from './bulk-operations.js';

// Re-export workspace task operation tools
export {
  getWorkspaceTasksTool
} from './workspace-operations.js';

// Re-export attachment tool
export {
  attachTaskFileTool,
  handleAttachTaskFile
} from './attachments.js';

// Re-export handlers
export {
  // Single task operation handlers
  createTaskHandler,
  getTaskHandler,
  getTasksHandler,
  updateTaskHandler,
  moveTaskHandler,
  duplicateTaskHandler,
  getTaskCommentsHandler,
  createTaskCommentHandler,
  
  // Bulk task operation handlers
  createBulkTasksHandler,
  updateBulkTasksHandler,
  moveBulkTasksHandler,
  
  // Team task operation handlers
  getWorkspaceTasksHandler
} from './handlers.js';

// Re-export utilities
export {
  formatTaskData,
  validateTaskIdentification,
  validateListIdentification,
  validateTaskUpdateData,
  validateBulkTasks,
  parseBulkOptions,
  resolveListIdWithValidation
} from './utilities.js'; 