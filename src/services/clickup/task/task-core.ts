/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service - Core Module
 * 
 * Handles core operations related to tasks in ClickUp, including:
 * - Base service initialization
 * - Core utility methods
 * - Basic CRUD operations
 */

import { BaseClickUpService, ErrorCode, ClickUpServiceError, ServiceResponse } from '../base.js';
import { 
  ClickUpTask, 
  CreateTaskData, 
  UpdateTaskData, 
  TaskFilters, 
  TasksResponse,
  TaskPriority
} from '../types.js';
import { ListService } from '../list.js';
import { WorkspaceService } from '../workspace.js';

/**
 * Core TaskService class providing basic task operations
 */
export class TaskServiceCore extends BaseClickUpService {
  protected listService: ListService;
  protected workspaceService: WorkspaceService | null = null;
  
  // Cache for validated tasks and lists
  private validationCache = {
    tasks: new Map<string, {
      validatedAt: number;
      task: ClickUpTask;
    }>(),
    lists: new Map<string, {
      validatedAt: number;
      valid: boolean;
    }>()
  };
  
  // Cache TTL in milliseconds (5 minutes)
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(
    apiKey: string, 
    teamId: string, 
    baseUrl?: string,
    workspaceService?: WorkspaceService
  ) {
    super(apiKey, teamId, baseUrl);
    
    if (workspaceService) {
      this.workspaceService = workspaceService;
      this.logOperation('constructor', { usingSharedWorkspaceService: true });
    }
    
    // Initialize list service for list lookups
    this.listService = new ListService(apiKey, teamId, baseUrl, this.workspaceService);
    
    this.logOperation('constructor', { initialized: true });
  }

  /**
   * Helper method to handle errors consistently
   * @param error The error that occurred
   * @param message Optional custom error message
   * @returns A ClickUpServiceError
   */
  protected handleError(error: any, message?: string): ClickUpServiceError {
    if (error instanceof ClickUpServiceError) {
      return error;
    }
    
    return new ClickUpServiceError(
      message || `Task service error: ${error.message}`,
      ErrorCode.UNKNOWN,
      error
    );
  }

  /**
   * Build URL parameters from task filters
   * @param filters Task filters to convert to URL parameters
   * @returns URLSearchParams object
   */
  protected buildTaskFilterParams(filters: TaskFilters): URLSearchParams {
    const params = new URLSearchParams();
    
    // Add all filters to the query parameters
    if (filters.include_closed) params.append('include_closed', String(filters.include_closed));
    if (filters.subtasks) params.append('subtasks', String(filters.subtasks));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.order_by) params.append('order_by', filters.order_by);
    if (filters.reverse) params.append('reverse', String(filters.reverse));
    
    // Array parameters
    if (filters.statuses && filters.statuses.length > 0) {
      filters.statuses.forEach(status => params.append('statuses[]', status));
    }
    if (filters.assignees && filters.assignees.length > 0) {
      filters.assignees.forEach(assignee => params.append('assignees[]', assignee));
    }
    
    // Team tasks endpoint specific parameters
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags[]', tag));
    }
    if (filters.list_ids && filters.list_ids.length > 0) {
      filters.list_ids.forEach(id => params.append('list_ids[]', id));
    }
    if (filters.folder_ids && filters.folder_ids.length > 0) {
      filters.folder_ids.forEach(id => params.append('folder_ids[]', id));
    }
    if (filters.space_ids && filters.space_ids.length > 0) {
      filters.space_ids.forEach(id => params.append('space_ids[]', id));
    }
    if (filters.archived !== undefined) params.append('archived', String(filters.archived));
    if (filters.include_closed_lists !== undefined) params.append('include_closed_lists', String(filters.include_closed_lists));
    if (filters.include_archived_lists !== undefined) params.append('include_archived_lists', String(filters.include_archived_lists));
    if (filters.include_compact_time_entries !== undefined) params.append('include_compact_time_entries', String(filters.include_compact_time_entries));
    
    // Date filters
    if (filters.due_date_gt) params.append('due_date_gt', String(filters.due_date_gt));
    if (filters.due_date_lt) params.append('due_date_lt', String(filters.due_date_lt));
    if (filters.date_created_gt) params.append('date_created_gt', String(filters.date_created_gt));
    if (filters.date_created_lt) params.append('date_created_lt', String(filters.date_created_lt));
    if (filters.date_updated_gt) params.append('date_updated_gt', String(filters.date_updated_gt));
    if (filters.date_updated_lt) params.append('date_updated_lt', String(filters.date_updated_lt));
    
    // Handle custom fields if present
    if (filters.custom_fields) {
      Object.entries(filters.custom_fields).forEach(([key, value]) => {
        params.append(`custom_fields[${key}]`, String(value));
      });
    }
    
    return params;
  }
  
  /**
   * Extract priority value from a task
   * @param task The task to extract priority from
   * @returns TaskPriority or null
   */
  protected extractPriorityValue(task: ClickUpTask): TaskPriority | null {
    if (!task.priority || !task.priority.id) {
      return null;
    }
    
    const priorityValue = parseInt(task.priority.id);
    // Ensure it's in the valid range 1-4
    if (isNaN(priorityValue) || priorityValue < 1 || priorityValue > 4) {
      return null;
    }
    
    return priorityValue as TaskPriority;
  }
  
  /**
   * Extract task data for creation/duplication
   * @param task The source task
   * @param nameOverride Optional override for the task name
   * @returns CreateTaskData object
   */
  protected extractTaskData(task: ClickUpTask, nameOverride?: string): CreateTaskData {
    return {
      name: nameOverride || task.name,
      description: task.description || '',
      status: task.status?.status,
      priority: this.extractPriorityValue(task),
      due_date: task.due_date ? Number(task.due_date) : undefined,
      assignees: task.assignees?.map(a => a.id) || []
    };
  }

  /**
   * Create a new task in the specified list
   * @param listId The ID of the list to create the task in
   * @param taskData The data for the new task
   * @returns The created task
   */
  async createTask(listId: string, taskData: CreateTaskData): Promise<ClickUpTask> {
    this.logOperation('createTask', { listId, ...taskData });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.post<ClickUpTask>(
          `/list/${listId}/task`,
          taskData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to create task in list ${listId}`);
    }
  }

  /**
   * Get a specific task by ID
   * @param taskId The ID of the task to retrieve
   * @returns The task details
   */
  async getTask(taskId: string): Promise<ClickUpTask> {
    this.logOperation('getTask', { taskId });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpTask>(
          `/task/${taskId}`
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get task ${taskId}`);
    }
  }

  /**
   * Get all tasks in a list with optional filtering
   * @param listId The ID of the list to get tasks from
   * @param filters Optional filters to apply
   * @returns List of tasks matching the filters
   */
  async getTasks(listId: string, filters: TaskFilters = {}): Promise<ClickUpTask[]> {
    this.logOperation('getTasks', { listId, filters });
    
    try {
      return await this.makeRequest(async () => {
        const params = this.buildTaskFilterParams(filters);
        
        const response = await this.client.get<TasksResponse>(
          `/list/${listId}/task?${params.toString()}`
        );
        
        return response.data.tasks;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get tasks from list ${listId}`);
    }
  }

  /**
   * Get subtasks of a specific task
   * @param taskId The ID of the parent task
   * @returns Array of subtask details
   */
  async getSubtasks(taskId: string): Promise<ClickUpTask[]> {
    this.logOperation('getSubtasks', { taskId });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpTask>(
          `/task/${taskId}`
        );
        
        // Return subtasks if present, otherwise empty array
        return response.data.subtasks || [];
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get subtasks for task ${taskId}`);
    }
  }

  /**
   * Get a task by its custom ID
   * @param customTaskId The custom ID of the task (e.g., "ABC-123")
   * @param listId Optional list ID to limit the search
   * @returns The task details
   */
  async getTaskByCustomId(customTaskId: string, listId?: string): Promise<ClickUpTask> {
    this.logOperation('getTaskByCustomId', { customTaskId, listId });
    
    try {
      return await this.makeRequest(async () => {
        // Construct the URL with optional list ID
        const url = `/task/custom_task_ids?custom_task_id=${encodeURIComponent(customTaskId)}${listId ? `&list_id=${listId}` : ''}`;
        
        const response = await this.client.get<ClickUpTask>(url);
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get task with custom ID ${customTaskId}`);
    }
  }

  /**
   * Update an existing task
   * @param taskId The ID of the task to update
   * @param updateData The data to update
   * @returns The updated task
   */
  async updateTask(taskId: string, updateData: UpdateTaskData): Promise<ClickUpTask> {
    this.logOperation('updateTask', { taskId, ...updateData });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.put<ClickUpTask>(
          `/task/${taskId}`,
          updateData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to update task ${taskId}`);
    }
  }

  /**
   * Delete a task
   * @param taskId The ID of the task to delete
   * @returns A ServiceResponse indicating success
   */
  async deleteTask(taskId: string): Promise<ServiceResponse<void>> {
    this.logOperation('deleteTask', { taskId });
    
    try {
      await this.makeRequest(async () => {
        await this.client.delete(`/task/${taskId}`);
      });
      
      return {
        success: true,
        data: undefined,
        error: undefined
      };
    } catch (error) {
      throw this.handleError(error, `Failed to delete task ${taskId}`);
    }
  }

  /**
   * Move a task to another list
   * @param taskId The ID of the task to move
   * @param destinationListId The ID of the list to move the task to
   * @returns The updated task
   */
  async moveTask(taskId: string, destinationListId: string): Promise<ClickUpTask> {
    const startTime = Date.now();
    this.logOperation('moveTask', { taskId, destinationListId, operation: 'start' });
    
    try {
      // First, get task and validate destination list
      const [sourceTask, _] = await Promise.all([
        this.validateTaskExists(taskId),
        this.validateListExists(destinationListId)
      ]);

      // Extract task data for creating the new task
      const taskData = this.extractTaskData(sourceTask);
      
      // Create the task in the new list
      const newTask = await this.createTask(destinationListId, taskData);
      
      // Delete the original task
      await this.deleteTask(taskId);
      
      // Update the cache
      this.validationCache.tasks.delete(taskId);
      this.validationCache.tasks.set(newTask.id, {
        validatedAt: Date.now(),
        task: newTask
      });

      const totalTime = Date.now() - startTime;
      this.logOperation('moveTask', { 
        taskId, 
        destinationListId, 
        operation: 'complete',
        timing: { totalTime },
        newTaskId: newTask.id
      });

      return newTask;
    } catch (error) {
      // Log failure
      this.logOperation('moveTask', { 
        taskId, 
        destinationListId, 
        operation: 'failed',
        error: error instanceof Error ? error.message : String(error),
        timing: { totalTime: Date.now() - startTime }
      });
      throw this.handleError(error, 'Failed to move task');
    }
  }

  /**
   * Duplicate a task, optionally to a different list
   * @param taskId The ID of the task to duplicate
   * @param listId Optional ID of list to create duplicate in (defaults to same list)
   * @returns The duplicated task
   */
  async duplicateTask(taskId: string, listId?: string): Promise<ClickUpTask> {
    this.logOperation('duplicateTask', { taskId, listId });
    
    try {
      // Get source task and validate destination list if provided
      const [sourceTask, _] = await Promise.all([
        this.validateTaskExists(taskId),
        listId ? this.validateListExists(listId) : Promise.resolve()
      ]);

      // Create duplicate in specified list or original list
      const targetListId = listId || sourceTask.list.id;
      const taskData = this.extractTaskData(sourceTask);
      
      return await this.createTask(targetListId, taskData);
    } catch (error) {
      throw this.handleError(error, `Failed to duplicate task ${taskId}`);
    }
  }

  /**
   * Validate a task exists and cache the result
   * @param taskId The ID of the task to validate
   * @returns The validated task
   */
  protected async validateTaskExists(taskId: string): Promise<ClickUpTask> {
    // Check cache first
    const cached = this.validationCache.tasks.get(taskId);
    if (cached && Date.now() - cached.validatedAt < this.CACHE_TTL) {
      this.logger.debug('Using cached task validation', { taskId });
      return cached.task;
    }

    // Not in cache or expired, fetch task
    const task = await this.getTask(taskId);
    
    // Cache the validation result
    this.validationCache.tasks.set(taskId, {
      validatedAt: Date.now(),
      task
    });

    return task;
  }

  /**
   * Validate that multiple tasks exist
   * @param taskIds Array of task IDs to validate
   * @returns Map of task IDs to task objects
   */
  public async validateTasksExist(taskIds: string[]): Promise<Map<string, ClickUpTask>> {
    const results = new Map<string, ClickUpTask>();
    const toFetch: string[] = [];

    // Check cache first
    for (const taskId of taskIds) {
      const cached = this.validationCache.tasks.get(taskId);
      if (cached && Date.now() - cached.validatedAt < this.CACHE_TTL) {
        results.set(taskId, cached.task);
      } else {
        toFetch.push(taskId);
      }
    }

    if (toFetch.length > 0) {
      // Fetch uncached tasks in parallel batches
      const batchSize = 5;
      for (let i = 0; i < toFetch.length; i += batchSize) {
        const batch = toFetch.slice(i, i + batchSize);
        const tasks = await Promise.all(
          batch.map(id => this.getTask(id))
        );

        // Cache and store results
        tasks.forEach((task, index) => {
          const taskId = batch[index];
          this.validationCache.tasks.set(taskId, {
            validatedAt: Date.now(),
            task
          });
          results.set(taskId, task);
        });
      }
    }

    return results;
  }

  /**
   * Validate a list exists and cache the result
   * @param listId The ID of the list to validate
   */
  async validateListExists(listId: string): Promise<void> {
    // Check cache first
    const cached = this.validationCache.lists.get(listId);
    if (cached && Date.now() - cached.validatedAt < this.CACHE_TTL) {
      this.logger.debug('Using cached list validation', { listId });
      if (!cached.valid) {
        throw new ClickUpServiceError(
          `List ${listId} does not exist`,
          ErrorCode.NOT_FOUND
        );
      }
      return;
    }

    try {
      await this.listService.getList(listId);
      
      // Cache the successful validation
      this.validationCache.lists.set(listId, {
        validatedAt: Date.now(),
        valid: true
      });
    } catch (error) {
      // Cache the failed validation
      this.validationCache.lists.set(listId, {
        validatedAt: Date.now(),
        valid: false
      });
      throw error;
    }
  }
}

