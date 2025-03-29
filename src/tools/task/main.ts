/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Task Tools
 * 
 * This is the main task module that connects tool definitions to their handlers.
 * The actual implementations are organized in sub-modules for better maintainability.
 */

import { sponsorService } from '../../utils/sponsor-service.js';

// Import tool definitions
import {
  createTaskTool,
  getTaskTool,
  getTasksTool,
  updateTaskTool,
  moveTaskTool,
  duplicateTaskTool,
  deleteTaskTool,
  getTaskCommentsTool,
  createTaskCommentTool
} from './single-operations.js';

import {
  createBulkTasksTool,
  updateBulkTasksTool,
  moveBulkTasksTool,
  deleteBulkTasksTool
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
  deleteTaskHandler,
  getTaskCommentsHandler,
  createTaskCommentHandler,
  createBulkTasksHandler,
  updateBulkTasksHandler,
  moveBulkTasksHandler,
  deleteBulkTasksHandler,
  getWorkspaceTasksHandler
} from './handlers.js';

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
      return sponsorService.createResponse(formatResponse(result), true);
    } catch (error) {
      return sponsorService.createErrorResponse(error, parameters);
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
export const handleUpdateTask = async (parameters: any) => {
  try {
    // Special handling for priority parameter
    if (parameters.priority !== undefined) {
      // Ensure priority is converted to a number if it's a valid value
      if (parameters.priority === null) {
        // null is valid for clearing priority
      } else if (typeof parameters.priority === 'number' && [1, 2, 3, 4].includes(parameters.priority)) {
        // Valid priority number, keep as is
      } else if (typeof parameters.priority === 'string') {
        // Try to convert string to number
        const numPriority = parseInt(parameters.priority, 10);
        if (!isNaN(numPriority) && [1, 2, 3, 4].includes(numPriority)) {
          parameters.priority = numPriority;
        } else if (parameters.priority === 'null') {
          parameters.priority = null;
        } else {
          throw new Error(`Invalid priority value: ${parameters.priority}. Must be 1, 2, 3, 4, or null.`);
        }
      } else {
        throw new Error(`Invalid priority value: ${parameters.priority}. Must be 1, 2, 3, 4, or null.`);
      }
    }
    
    // Proceed with normal handling
    const result = await updateTaskHandler(parameters);
    return sponsorService.createResponse(result, true);
  } catch (error) {
    return sponsorService.createErrorResponse(error, parameters);
  }
};
export const handleMoveTask = createHandlerWrapper(moveTaskHandler);
export const handleDuplicateTask = createHandlerWrapper(duplicateTaskHandler);
export const handleDeleteTask = createHandlerWrapper(deleteTaskHandler, () => ({
  success: true,
  message: "Task deleted successfully"
}));
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

export const handleDeleteBulkTasks = createHandlerWrapper(deleteBulkTasksHandler, (result: BatchResult<void>) => ({
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
    definition: deleteTaskTool, 
    handler: deleteTaskHandler
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
  },
  { 
    definition: deleteBulkTasksTool, 
    handler: async (params: any) => {
      const result = await deleteBulkTasksHandler(params) as BatchResult<void>;
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