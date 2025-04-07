/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Task Operation Handlers
 * 
 * This module implements the handlers for task operations, both for single task
 * and bulk operations. These handlers are used by the tool definitions.
 */

import { ClickUpTask, UpdateTaskData, TaskFilters, toTaskPriority, CreateTaskData } from '../../services/clickup/types.js';
import { clickUpServices } from '../../services/shared.js';
import { BulkService } from '../../services/clickup/bulk.js';
import { parseDueDate } from '../utils.js';
import { 
  validateTaskIdentification, 
  validateListIdentification,
  validateTaskUpdateData,
  validateBulkTasks,
  parseBulkOptions,
  resolveListIdWithValidation,
} from './utilities.js';
import { TaskService } from '../../services/clickup/task/task-service.js';
import { ExtendedTaskFilters } from '../../services/clickup/types.js';
import { workspaceService } from '../../services/shared.js';
import { isNameMatch } from '../../utils/resolver-utils.js';
import { Logger } from '../../logger.js';

// Use shared services instance
const { task: taskService, list: listService } = clickUpServices;

// Create a bulk service instance that uses the task service
const bulkService = new BulkService(taskService);

// Create a logger instance for task handlers
const logger = new Logger('TaskHandlers');

// Token limit constant for workspace tasks
const WORKSPACE_TASKS_TOKEN_LIMIT = 50000;

// Cache for task context between sequential operations
const taskContextCache = new Map<string, { id: string, timestamp: number }>();
const TASK_CONTEXT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Store task context for sequential operations
 */
function storeTaskContext(taskName: string, taskId: string) {
  taskContextCache.set(taskName, {
    id: taskId,
    timestamp: Date.now()
  });
}

/**
 * Get cached task context if valid
 */
function getCachedTaskContext(taskName: string): string | null {
  const context = taskContextCache.get(taskName);
  if (!context) return null;
  
  if (Date.now() - context.timestamp > TASK_CONTEXT_TTL) {
    taskContextCache.delete(taskName);
    return null;
  }
  
  return context.id;
}

//=============================================================================
// SHARED UTILITY FUNCTIONS
//=============================================================================

/**
 * Build task update data from parameters
 */
function buildUpdateData(params: any): UpdateTaskData {
  const updateData: UpdateTaskData = {};
  
  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.markdown_description !== undefined) updateData.markdown_description = params.markdown_description;
  if (params.status !== undefined) updateData.status = params.status;
  
  // Skip toTaskPriority conversion since we're handling priority in the main handler
  if (params.priority !== undefined) updateData.priority = params.priority;
  
  if (params.dueDate !== undefined) {
    updateData.due_date = parseDueDate(params.dueDate);
    updateData.due_date_time = true;
  }
  
  if (params.startDate !== undefined) {
    updateData.start_date = parseDueDate(params.startDate);
    updateData.start_date_time = true;
  }
  
  // Handle custom fields if provided
  if (params.custom_fields !== undefined) {
    updateData.custom_fields = params.custom_fields;
  }
  
  return updateData;
}

/**
 * Core function to find a task by ID or name
 * This consolidates all task lookup logic in one place for consistency
 */
async function findTask(params: {
  taskId?: string,
  taskName?: string,
  listName?: string,
  customTaskId?: string,
  requireId?: boolean,
  includeSubtasks?: boolean
}) {
  const { taskId, taskName, listName, customTaskId, requireId = false, includeSubtasks = false } = params;

  // Validate that we have enough information to identify a task
  const validationResult = validateTaskIdentification(
    { taskId, taskName, listName, customTaskId },
    { requireTaskId: requireId, useGlobalLookup: true }
  );
  
  if (!validationResult.isValid) {
    throw new Error(validationResult.errorMessage);
  }
  
  try {
    // Direct path for taskId - most efficient
    if (taskId) {
      const task = await taskService.getTask(taskId);
      
      // Add subtasks if requested
      if (includeSubtasks) {
        const subtasks = await taskService.getSubtasks(task.id);
        return { task, subtasks };
      }
      
      return { task };
    }
    
    // Direct path for customTaskId - also efficient
    if (customTaskId) {
      const task = await taskService.getTaskByCustomId(customTaskId);
      
      // Add subtasks if requested
      if (includeSubtasks) {
        const subtasks = await taskService.getSubtasks(task.id);
        return { task, subtasks };
      }
      
      return { task };
    }
    
    // Special optimized path for taskName + listName combination
    if (taskName && listName) {
      const listId = await resolveListIdWithValidation(null, listName);
      
      // Get all tasks in the list
      const allTasks = await taskService.getTasks(listId);
      
      // Find the task that matches the name
      const matchingTask = findTaskByName(allTasks, taskName);
      
      if (!matchingTask) {
        throw new Error(`Task "${taskName}" not found in list "${listName}"`);
      }
      
      // Add subtasks if requested
      if (includeSubtasks) {
        const subtasks = await taskService.getSubtasks(matchingTask.id);
        return { task: matchingTask, subtasks };
      }
      
      return { task: matchingTask };
    }
    
    // Fallback to searching all lists for taskName-only case
    if (taskName) {
      logger.debug(`Searching all lists for task: "${taskName}"`);
      
      // Get workspace hierarchy which contains all lists
      const hierarchy = await workspaceService.getWorkspaceHierarchy();
      
      // Extract all list IDs from the hierarchy
      const listIds: string[] = [];
      const extractListIds = (node: any) => {
        if (node.type === 'list') {
          listIds.push(node.id);
        }
        if (node.children) {
          node.children.forEach(extractListIds);
        }
      };
      
      // Start from the root's children
      hierarchy.root.children.forEach(extractListIds);
      
      // Search through each list
      const searchPromises = listIds.map(async (listId) => {
        try {
          const tasks = await taskService.getTasks(listId);
          const matchingTask = findTaskByName(tasks, taskName);
          if (matchingTask) {
            logger.debug(`Found task "${matchingTask.name}" (ID: ${matchingTask.id}) in list with ID "${listId}"`);
            return matchingTask;
          }
          return null;
        } catch (error) {
          logger.warn(`Error searching list ${listId}: ${error.message}`);
          return null;
        }
      });
      
      // Wait for all searches to complete
      const results = await Promise.all(searchPromises);
      
      // Filter out null results and sort by match quality and recency
      const matchingTasks = results
        .filter(task => task !== null)
        .sort((a, b) => {
          const aMatch = isNameMatch(a.name, taskName);
          const bMatch = isNameMatch(b.name, taskName);
          
          // First sort by match quality
          if (bMatch.score !== aMatch.score) {
            return bMatch.score - aMatch.score;
          }
          
          // Then sort by recency
          return parseInt(b.date_updated) - parseInt(a.date_updated);
        });
      
      if (matchingTasks.length === 0) {
        throw new Error(`Task "${taskName}" not found in any list across your workspace. Please check the task name and try again.`);
      }
      
      const bestMatch = matchingTasks[0];
      
      // Add subtasks if requested
      if (includeSubtasks) {
        const subtasks = await taskService.getSubtasks(bestMatch.id);
        return { task: bestMatch, subtasks };
      }
      
      return { task: bestMatch };
    }
    
    // We shouldn't reach here if validation is working correctly
    throw new Error("No valid task identification provided");
    
  } catch (error) {
    // Enhance error message for non-existent tasks
    if (taskName && error.message.includes('not found')) {
      throw new Error(`Task "${taskName}" not found. Please check the task name and try again.`);
    }
    
    // Pass along other formatted errors
    throw error;
  }
}

/**
 * Helper function to find a task by name in an array of tasks
 */
function findTaskByName(tasks, name) {
  if (!tasks || !Array.isArray(tasks) || !name) return null;
  
  const normalizedSearchName = name.toLowerCase().trim();
  
  // Get match scores for all tasks
  const taskMatchScores = tasks.map(task => {
    const matchResult = isNameMatch(task.name, name);
    return {
      task,
      matchResult,
      // Parse the date_updated field as a number for sorting
      updatedAt: task.date_updated ? parseInt(task.date_updated, 10) : 0
    };
  }).filter(result => result.matchResult.isMatch);
  
  if (taskMatchScores.length === 0) {
    return null;
  }
  
  // First, try to find exact matches
  const exactMatches = taskMatchScores
    .filter(result => result.matchResult.exactMatch)
    .sort((a, b) => {
      // For exact matches with the same score, sort by most recently updated
      if (b.matchResult.score === a.matchResult.score) {
        return b.updatedAt - a.updatedAt;
      }
      return b.matchResult.score - a.matchResult.score;
    });
  
  // Get the best matches based on whether we have exact matches or need to fall back to fuzzy matches
  const bestMatches = exactMatches.length > 0 ? exactMatches : taskMatchScores.sort((a, b) => {
    // First sort by match score (highest first)
    if (b.matchResult.score !== a.matchResult.score) {
      return b.matchResult.score - a.matchResult.score;
    }
    // Then sort by most recently updated
    return b.updatedAt - a.updatedAt;
  });
  
  // Get the best match
  return bestMatches[0].task;
}

/**
 * Handler for getting a task - uses the consolidated findTask function
 */
export async function getTaskHandler(params) {
  try {
    const result = await findTask({
      taskId: params.taskId,
      taskName: params.taskName,
      listName: params.listName,
      customTaskId: params.customTaskId,
      includeSubtasks: params.subtasks
    });
    
    if (result.subtasks) {
      return { ...result.task, subtasks: result.subtasks };
    }
    
    return result.task;
  } catch (error) {
    throw error;
  }
}

/**
 * Get task ID from various identifiers - uses the consolidated findTask function
 */
export async function getTaskId(taskId?: string, taskName?: string, listName?: string, customTaskId?: string, requireId?: boolean, includeSubtasks?: boolean): Promise<string> {
  // Check task context cache first if we have a task name
  if (taskName && !taskId && !customTaskId) {
    const cachedId = getCachedTaskContext(taskName);
    if (cachedId) {
      return cachedId;
    }
  }

  const result = await findTask({
    taskId,
    taskName,
    listName,
    customTaskId,
    requireId,
    includeSubtasks
  });
  
  // Store task context for future operations
  if (taskName && result.task.id) {
    storeTaskContext(taskName, result.task.id);
  }
  
  return result.task.id;
}

/**
 * Process a list identification validation, returning the list ID
 */
async function getListId(listId?: string, listName?: string): Promise<string> {
  validateListIdentification(listId, listName);
  return await resolveListIdWithValidation(listId, listName);
}

/**
 * Extract and build task filters from parameters
 */
function buildTaskFilters(params: any): TaskFilters {
  const { subtasks, statuses, page, order_by, reverse } = params;
  const filters: TaskFilters = {};
  
  if (subtasks !== undefined) filters.subtasks = subtasks;
  if (statuses !== undefined) filters.statuses = statuses;
  if (page !== undefined) filters.page = page;
  if (order_by !== undefined) filters.order_by = order_by;
  if (reverse !== undefined) filters.reverse = reverse;
  
  return filters;
}

/**
 * Map tasks for bulk operations, resolving task IDs
 * Uses smart disambiguation for tasks without list context
 */
async function mapTaskIds(tasks: any[]): Promise<string[]> {
  return Promise.all(tasks.map(async (task) => {
    const validationResult = validateTaskIdentification(
      { taskId: task.taskId, taskName: task.taskName, listName: task.listName, customTaskId: task.customTaskId },
      { useGlobalLookup: true }
    );
    
    if (!validationResult.isValid) {
      throw new Error(validationResult.errorMessage);
    }
    
    return await getTaskId(task.taskId, task.taskName, task.listName, task.customTaskId);
  }));
}

//=============================================================================
// SINGLE TASK OPERATIONS
//=============================================================================

/**
 * Handler for creating a task
 */
export async function createTaskHandler(params) {
  const { 
    name, 
    description, 
    markdown_description, 
    status, 
    dueDate, 
    startDate, 
    parent, 
    tags,
    custom_fields,
    check_required_custom_fields
  } = params;
  
  if (!name) throw new Error("Task name is required");
  
  // Use our helper function to validate and convert priority
  const priority = toTaskPriority(params.priority);

  const listId = await getListId(params.listId, params.listName);
  
  const taskData: CreateTaskData = {
    name,
    description,
    markdown_description,
    status,
    priority,
    parent,
    tags,
    custom_fields,
    check_required_custom_fields
  };
  
  // Add due date if specified
  if (dueDate) {
    taskData.due_date = parseDueDate(dueDate);
    taskData.due_date_time = true;
  }
  
  // Add start date if specified
  if (startDate) {
    taskData.start_date = parseDueDate(startDate);
    taskData.start_date_time = true;
  }
  
  return await taskService.createTask(listId, taskData);
}

export interface UpdateTaskParams extends UpdateTaskData {
  taskId?: string;
  taskName?: string;
  listName?: string;
  customTaskId?: string;
}

/**
 * Handler for updating a task
 */
export async function updateTaskHandler(
  taskService: TaskService,
  params: UpdateTaskParams
): Promise<ClickUpTask> {
  const { taskId, taskName, listName, customTaskId, ...updateData } = params;
  
  // Validate task identification with global lookup enabled
  const validationResult = validateTaskIdentification(params, { useGlobalLookup: true });
  if (!validationResult.isValid) {
    throw new Error(validationResult.errorMessage);
  }

  // Validate update data
  validateTaskUpdateData(updateData);

  try {
    // Get the task ID using global lookup
    const id = await getTaskId(taskId, taskName, listName, customTaskId);
    return await taskService.updateTask(id, updateData);
  } catch (error) {
    throw new Error(`Failed to update task: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Handler for moving a task
 */
export async function moveTaskHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, undefined, params.customTaskId, false);
  const listId = await getListId(params.listId, params.listName);
  return await taskService.moveTask(taskId, listId);
}

/**
 * Handler for duplicating a task
 */
export async function duplicateTaskHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, undefined, params.customTaskId, false);
  let listId;
  
  if (params.listId || params.listName) {
    listId = await getListId(params.listId, params.listName);
  }
  
  return await taskService.duplicateTask(taskId, listId);
}

/**
 * Handler for getting tasks
 */
export async function getTasksHandler(params) {
  const listId = await getListId(params.listId, params.listName);
  return await taskService.getTasks(listId, buildTaskFilters(params));
}

/**
 * Handler for getting task comments
 */
export async function getTaskCommentsHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
  const { start, startId } = params;
  return await taskService.getTaskComments(taskId, start, startId);
}

/**
 * Handler for creating a task comment
 */
export async function createTaskCommentHandler(params) {
  // Validate required parameters
  if (!params.commentText) {
    throw new Error('Comment text is required');
  }
  
  try {
    // Resolve the task ID
    const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
    
    // Extract other parameters with defaults
    const {
      commentText,
      notifyAll = false,
      assignee = null
    } = params;
    
    // Create the comment
    return await taskService.createTaskComment(taskId, commentText, notifyAll, assignee);
  } catch (error) {
    // If this is a task lookup error, provide more helpful message
    if (error.message?.includes('not found') || error.message?.includes('identify task')) {
      if (params.taskName) {
        throw new Error(`Could not find task "${params.taskName}" in list "${params.listName}"`);
      } else {
        throw new Error(`Task with ID "${params.taskId}" not found`);
      }
    }
    
    // Otherwise, rethrow the original error
    throw error;
  }
}

/**
 * Estimate tokens for a task response
 * This is a simplified estimation - adjust based on actual token counting needs
 */
function estimateTaskResponseTokens(task: ClickUpTask): number {
  // Base estimation for task structure
  let tokenCount = 0;
  
  // Core fields
  tokenCount += (task.name?.length || 0) / 4; // Approximate tokens for name
  tokenCount += (task.description?.length || 0) / 4; // Approximate tokens for description
  tokenCount += (task.text_content?.length || 0) / 4; // Use text_content instead of markdown_description
  
  // Status and other metadata
  tokenCount += 5; // Basic metadata fields
  
  // Custom fields
  if (task.custom_fields) {
    tokenCount += Object.keys(task.custom_fields).length * 10; // Rough estimate per custom field
  }
  
  // Add overhead for JSON structure
  tokenCount *= 1.1;
  
  return Math.ceil(tokenCount);
}

/**
 * Check if response would exceed token limit
 */
function wouldExceedTokenLimit(response: any): boolean {
  if (!response.tasks?.length) return false;
  
  // Calculate total estimated tokens
  const totalTokens = response.tasks.reduce((sum: number, task: ClickUpTask) => 
    sum + estimateTaskResponseTokens(task), 0
  );
  
  // Add overhead for response structure
  const estimatedTotal = totalTokens * 1.1;
  
  return estimatedTotal > WORKSPACE_TASKS_TOKEN_LIMIT;
}

/**
 * Handler for getting workspace tasks with filtering
 */
export async function getWorkspaceTasksHandler(
  taskService: TaskService,
  params: Record<string, any>
): Promise<Record<string, any>> {
  try {
    // Require at least one filter parameter
    const hasFilter = [
      'tags',
      'list_ids',
      'folder_ids', 
      'space_ids',
      'statuses',
      'assignees',
      'date_created_gt',
      'date_created_lt',
      'date_updated_gt',
      'date_updated_lt',
      'due_date_gt',
      'due_date_lt'
    ].some(key => params[key] !== undefined);

    if (!hasFilter) {
      throw new Error('At least one filter parameter is required (tags, list_ids, folder_ids, space_ids, statuses, assignees, or date filters)');
    }

    // For workspace tasks, we'll continue to use the direct getWorkspaceTasks method
    // since it supports specific workspace-wide filters that aren't part of the unified findTasks
    const filters: ExtendedTaskFilters = {
      tags: params.tags,
      list_ids: params.list_ids,
      folder_ids: params.folder_ids,
      space_ids: params.space_ids,
      statuses: params.statuses,
      include_closed: params.include_closed,
      include_archived_lists: params.include_archived_lists,
      include_closed_lists: params.include_closed_lists,
      archived: params.archived,
      order_by: params.order_by,
      reverse: params.reverse,
      due_date_gt: params.due_date_gt,
      due_date_lt: params.due_date_lt,
      date_created_gt: params.date_created_gt,
      date_created_lt: params.date_created_lt,
      date_updated_gt: params.date_updated_gt,
      date_updated_lt: params.date_updated_lt,
      assignees: params.assignees,
      page: params.page,
      detail_level: params.detail_level || 'detailed'
    };

    // Get tasks with adaptive response format support
    const response = await taskService.getWorkspaceTasks(filters);

    // Check token limit at handler level
    if (params.detail_level !== 'summary' && wouldExceedTokenLimit(response)) {
      logger.info('Response would exceed token limit, fetching summary format instead');
      
      // Refetch with summary format
      const summaryResponse = await taskService.getWorkspaceTasks({
        ...filters,
        detail_level: 'summary'
      });
      
      return summaryResponse;
    }

    // Return the response without adding the redundant _note field
    return response;
  } catch (error) {
    throw new Error(`Failed to get workspace tasks: ${error.message}`);
  }
}

//=============================================================================
// BULK TASK OPERATIONS
//=============================================================================

/**
 * Handler for creating multiple tasks
 */
export async function createBulkTasksHandler(params: any) {
  const { tasks, listId, listName, options } = params;

  // Validate tasks array
  validateBulkTasks(tasks, 'create');

  // Validate and resolve list ID
  const targetListId = await resolveListIdWithValidation(listId, listName);

  // Format tasks for creation
  const formattedTasks: CreateTaskData[] = tasks.map(task => {
    const taskData: CreateTaskData = {
      name: task.name,
      description: task.description,
      markdown_description: task.markdown_description,
      status: task.status,
      priority: toTaskPriority(task.priority),
      tags: task.tags,
      custom_fields: task.custom_fields
    };

    // Add due date if specified
    if (task.dueDate) {
      taskData.due_date = parseDueDate(task.dueDate);
      taskData.due_date_time = true;
    }

    // Add start date if specified
    if (task.startDate) {
      taskData.start_date = parseDueDate(task.startDate);
      taskData.start_date_time = true;
    }

    return taskData;
  });

  // Parse bulk options
  const bulkOptions = parseBulkOptions(options);

  // Create tasks - pass arguments in correct order: listId, tasks, options
  return await bulkService.createTasks(targetListId, formattedTasks, bulkOptions);
}

/**
 * Handler for updating multiple tasks
 */
export async function updateBulkTasksHandler(params: any) {
  const { tasks, options } = params;

  // Validate tasks array
  validateBulkTasks(tasks, 'update');

  // Parse bulk options
  const bulkOptions = parseBulkOptions(options);

  // Update tasks
  return await bulkService.updateTasks(tasks, bulkOptions);
}

/**
 * Handler for moving multiple tasks
 */
export async function moveBulkTasksHandler(params: any) {
  const { tasks, targetListId, targetListName, options } = params;

  // Validate tasks array
  validateBulkTasks(tasks, 'move');

  // Validate and resolve target list ID
  const resolvedTargetListId = await resolveListIdWithValidation(targetListId, targetListName);

  // Parse bulk options
  const bulkOptions = parseBulkOptions(options);

  // Move tasks
  return await bulkService.moveTasks(tasks, resolvedTargetListId, bulkOptions);
}

/**
 * Handler for deleting multiple tasks
 */
export async function deleteBulkTasksHandler(params: any) {
  const { tasks, options } = params;

  // Validate tasks array
  validateBulkTasks(tasks, 'delete');

  // Parse bulk options
  const bulkOptions = parseBulkOptions(options);

  // Delete tasks
  return await bulkService.deleteTasks(tasks, bulkOptions);
}

/**
 * Handler for deleting a task
 */
export async function deleteTaskHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
  await taskService.deleteTask(taskId);
  return true;
} 