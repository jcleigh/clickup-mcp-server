/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Task Tools
 * 
 * This is the main task module that connects tool definitions to their handlers.
 * The actual implementations are organized in sub-modules for better maintainability.
 */

import { responseUtils } from '../../utils/response-utils.js';

// Import tool definitions
import {
  createTaskTool,
  getTaskTool,
  getTasksTool,
  updateTaskTool,
  moveTaskTool,
  duplicateTaskTool,
  getTaskCommentsTool,
  createTaskCommentTool
} from './single-operations.js';

import {
  createBulkTasksTool,
  updateBulkTasksTool,
  moveBulkTasksTool,
} from './bulk-operations.js';

import {
  getWorkspaceTasksTool
} from './workspace-operations.js';

// Import handlers
import {
  createTaskHandler,
  getTaskHandler,
  getTasksHandler,
  updateTaskHandler,
  moveTaskHandler,
  duplicateTaskHandler,
  getTaskCommentsHandler,
  createTaskCommentHandler,
  createBulkTasksHandler,
  updateBulkTasksHandler,
  moveBulkTasksHandler,
  getWorkspaceTasksHandler,
  formatTaskData
} from './index.js';

// Import shared services
import { clickUpServices } from '../../services/shared.js';
const { task: taskService } = clickUpServices;

import { BatchResult } from '../../utils/concurrency-utils.js';
import { ClickUpTask } from '../../services/clickup/types.js';

//=============================================================================
// HANDLER WRAPPER UTILITY
//=============================================================================

/**
 * Creates a wrapped handler function with standard error handling and response formatting
 */
function createHandlerWrapper<T>(
  handler: (params: any) => Promise<T>,
  formatResponse: (result: T) => any = (result) => result
) {
  return async (parameters: any) => {
    try {
      const result = await handler(parameters);
      return responseUtils.createResponse(formatResponse(result));
    } catch (error) {
      return responseUtils.createErrorResponse(error, parameters);
    }
  };
}

//=============================================================================
// SINGLE TASK OPERATIONS - HANDLER IMPLEMENTATIONS
//=============================================================================

export const handleCreateTask = createHandlerWrapper(createTaskHandler);
export const handleGetTask = createHandlerWrapper(getTaskHandler);
export const handleGetTasks = createHandlerWrapper(getTasksHandler, (tasks) => ({
  tasks,
  count: tasks.length
}));

/**
 * Handle task update operation
 */
export async function handleUpdateTask(parameters: any) {
  try {
    const result = await updateTaskHandler(taskService, parameters);
    return responseUtils.createResponse(formatTaskData(result));
  } catch (error) {
    return responseUtils.createErrorResponse(error instanceof Error ? error.message : String(error));
  }
}

export const handleMoveTask = createHandlerWrapper(moveTaskHandler);
export const handleDuplicateTask = createHandlerWrapper(duplicateTaskHandler);
export const handleGetTaskComments = createHandlerWrapper(getTaskCommentsHandler, (comments) => ({
  comments,
  count: comments.length
}));
export const handleCreateTaskComment = createHandlerWrapper(createTaskCommentHandler, (comment) => ({
  success: true,
  message: "Comment added successfully",
  comment: comment && typeof comment === 'object' ? comment : {
    id: `generated-${Date.now()}`,
    comment_text: typeof comment === 'string' ? comment : "Comment text unavailable"
  }
}));

//=============================================================================
// BULK TASK OPERATIONS - HANDLER IMPLEMENTATIONS
//=============================================================================

export const handleCreateBulkTasks = createHandlerWrapper(createBulkTasksHandler, (result: BatchResult<ClickUpTask>) => ({
  successful: result.successful,
  failed: result.failed,
  count: result.totals.total,
  success_count: result.totals.success,
  failure_count: result.totals.failure,
  errors: result.failed.map(f => f.error)
}));

export const handleUpdateBulkTasks = createHandlerWrapper(updateBulkTasksHandler, (result: BatchResult<ClickUpTask>) => ({
  successful: result.successful,
  failed: result.failed,
  count: result.totals.total,
  success_count: result.totals.success,
  failure_count: result.totals.failure,
  errors: result.failed.map(f => f.error)
}));

export const handleMoveBulkTasks = createHandlerWrapper(moveBulkTasksHandler, (result: BatchResult<ClickUpTask>) => ({
  successful: result.successful,
  failed: result.failed,
  count: result.totals.total,
  success_count: result.totals.success,
  failure_count: result.totals.failure,
  errors: result.failed.map(f => f.error)
}));

//=============================================================================
// WORKSPACE TASK OPERATIONS - HANDLER IMPLEMENTATIONS
//=============================================================================

export const handleGetWorkspaceTasks = createHandlerWrapper(
  // This adapts the new handler signature to match what createHandlerWrapper expects
  (params) => getWorkspaceTasksHandler(taskService, params),
  (response) => response // Pass through the response as is
);

//=============================================================================
// TOOL DEFINITIONS AND HANDLERS EXPORT
//=============================================================================

// Tool definitions with their handler mappings
export const tools = [
  { 
    definition: createTaskTool, 
    handler: createTaskHandler
  },
  { 
    definition: updateTaskTool, 
    handler: updateTaskHandler
  },
  { 
    definition: moveTaskTool, 
    handler: moveTaskHandler
  },
  { 
    definition: duplicateTaskTool, 
    handler: duplicateTaskHandler
  },
  { 
    definition: getTaskTool, 
    handler: getTaskHandler
  },
  { 
    definition: getTasksTool, 
    handler: getTasksHandler
  },
  { 
    definition: getTaskCommentsTool, 
    handler: getTaskCommentsHandler
  },
  { 
    definition: createTaskCommentTool, 
    handler: createTaskCommentHandler
  },
  { 
    definition: getWorkspaceTasksTool, 
    handler: getWorkspaceTasksHandler
  },
  { 
    definition: createBulkTasksTool, 
    handler: async (params: any) => {
      const result = await createBulkTasksHandler(params) as BatchResult<ClickUpTask>;
      return {
        successful: result.successful,
        failed: result.failed,
        count: result.totals.total,
        success_count: result.totals.success,
        failure_count: result.totals.failure,
        errors: result.failed.map(f => f.error)
      };
    }
  },
  { 
    definition: updateBulkTasksTool, 
    handler: async (params: any) => {
      const result = await updateBulkTasksHandler(params) as BatchResult<ClickUpTask>;
      return {
        successful: result.successful,
        failed: result.failed,
        count: result.totals.total,
        success_count: result.totals.success,
        failure_count: result.totals.failure,
        errors: result.failed.map(f => f.error)
      };
    }
  },
  { 
    definition: moveBulkTasksTool, 
    handler: async (params: any) => {
      const result = await moveBulkTasksHandler(params) as BatchResult<ClickUpTask>;
      return {
        successful: result.successful,
        failed: result.failed,
        count: result.totals.total,
        success_count: result.totals.success,
        failure_count: result.totals.failure,
        errors: result.failed.map(f => f.error)
      };
    }
  }
];