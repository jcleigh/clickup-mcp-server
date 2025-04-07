# ClickUp MCP Server Documentation

This document provides detailed information about all available tools, their parameters, and usage examples for the ClickUp MCP Server.

## Table of Contents
- [Task Management](#task-management)
- [List Management](#list-management)
- [Folder Management](#folder-management)
- [Tag Management](#tag-management)
- [Workspace Organization](#workspace-organization)
- [Prompts](#prompts)
- [Common Parameters](#common-parameters)
- [Error Handling](#error-handling)

## Task Management

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|-------------------|-------------------|
| get_tasks | Retrieve tasks from a list | Either `listId` or `listName` | archived, page, order_by, reverse, subtasks, statuses, include_closed, assignees, due_date_gt/lt |
| get_task | Get single task details with global lookup | Either `taskId` or `taskName` (list context optional) | `listName` (for disambiguation), `subtasks` |
| get_task_comments | Retrieve comments for a task | Either `taskId` or `taskName` | `listName`, `start`, `startId` |
| create_task_comment | Add a comment to a task | `commentText` and either `taskId` or (`taskName` + `listName`) | `notifyAll`, `assignee` |
| attach_task_file | Attach a file to a task | Either `taskId` or `taskName`, and EITHER `file_data` OR `file_url` | `file_name`, `chunk_*` parameters for large files |
| create_task | Create a new task | `name` and either `listId` or `listName` | description, status, priority (1-4), dueDate, startDate, parent |
| create_bulk_tasks | Create multiple tasks | `tasks[]` | `listId` or `listName` |
| update_task | Modify task properties | Either `taskId` or `taskName` | name, description, status, priority, dueDate, startDate |
| update_bulk_tasks | Modify multiple tasks | `tasks[]` with task identifiers | Each task can have: name, description, status, priority, dueDate, startDate, etc. |
| move_task | Move task to another list | Either `taskId` or `taskName`, and either `listId` or `listName` | `sourceListName` |
| move_bulk_tasks | Move multiple tasks | `tasks[]` with task identifiers, and target list | None |
| duplicate_task | Copy task to another list | Either `taskId` or `taskName`, and either `listId` or `listName` | `sourceListName` |
| get_workspace_tasks | Retrieve tasks across the workspace with filtering | At least one filter parameter (tags, list_ids, folder_ids, space_ids, statuses, assignees, or date filters) | page, order_by, reverse |

### Task Parameters

- **Priority Levels**: 1 (Urgent/Highest) to 4 (Low)
- **Dates**: Unix timestamps in milliseconds
- **Status**: Uses list's default if not specified
- **Description**: Supports both plain text and markdown
- **Files**: Attach files using base64 encoding or URLs
- **Subtasks**: 
  - Retrieve subtasks with `subtasks: true` parameter on `get_task` or `get_tasks`
  - Create subtasks by setting `parent` parameter with parent task ID on `create_task`
  - Multi-level subtasks are supported (subtasks can have their own subtasks)
- **Date Parameters**:
  - `dueDate`: When the task is due (deadline)
  - `startDate`: When work on the task should begin
  - Both support natural language expressions (e.g., "now", "today", "tomorrow at 9am")
  - Date ranges can be specified using `start of today` and `end of today`
- **Global Task Lookup**:
  - Find tasks by name across the entire workspace without specifying a list
  - Smart disambiguation when multiple tasks share the same name
  - Shows context (list, folder, space) for each matching task
  - Prioritizes most recently updated task when multiple matches exist
  - Backward compatible with list-specific lookups

### Examples

#### Creating a Task
**User Prompt:**
```
Create a new task in the "Development Tasks" list called "Implement Authentication". 
It should be high priority and due on January 1st, 2024. 
Add these requirements:
- OAuth2 support
- JWT tokens
- Refresh token flow
```

**System Response:**
```json
{
  "listName": "Development Tasks",
  "name": "Implement Authentication",
  "markdown_description": "## Requirements\n- OAuth2 support\n- JWT tokens\n- Refresh token flow",
  "priority": 1,
  "dueDate": 1703980800000
}
```

#### Creating a Task with Start Date and Due Date
**User Prompt:**
```
Create a task called "Database Migration" that starts tomorrow at 9am and is due by the end of the week.
It should be in the "Backend Tasks" list.
```

**System Response:**
```json
{
  "listName": "Backend Tasks",
  "name": "Database Migration",
  "startDate": "tomorrow at 9am",
  "dueDate": "end of week"
}
```

#### Updating a Task's Start Date
**User Prompt:**
```
Change the start date of the "Database Migration" task to next Monday at 8am
```

**System Response:**
```json
{
  "taskName": "Database Migration",
  "startDate": "next Monday at 8am"
}
```

#### Getting Task Comments
**User Prompt:**
```
Show me the comments on the "Bug Fix" task.
```

**System Response:**
```json
{
  "taskName": "Bug Fix",
  "comments": [
    {
      "id": "abcd1234",
      "comment": "I've identified the root cause. It's related to a race condition in the auth flow.",
      "comment_text": "I've identified the root cause. It's related to a race condition in the auth flow.",
      "user": {
        "id": 1234567,
        "username": "developer1",
        "email": "dev1@example.com",
        "color": "#ff7800"
      },
      "resolved": false,
      "date": "2024-03-15T10:30:45.000Z"
    },
    {
      "id": "efgh5678",
      "comment": "Great work! Could you submit a PR by tomorrow?",
      "comment_text": "Great work! Could you submit a PR by tomorrow?",
      "user": {
        "id": 7654321,
        "username": "manager1",
        "email": "manager@example.com",
        "color": "#0080ff"
      },
      "resolved": false,
      "date": "2024-03-15T11:15:20.000Z"
    }
  ],
  "totalComments": 2,
  "pagination": {
    "hasMore": false
  }
}
```

#### Creating a Task Comment
**User Prompt:**
```
Add a comment to the "Bug Fix" task saying "I've fixed the issue by implementing proper mutex locks."
```

**System Response:**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "comment": {
    "id": "ijkl9012",
    "comment": "I've fixed the issue by implementing proper mutex locks.",
    "comment_text": "I've fixed the issue by implementing proper mutex locks.",
    "user": {
      "id": 1234567,
      "username": "developer1",
      "email": "dev1@example.com",
      "color": "#ff7800"
    },
    "date": "2024-03-16T09:45:30.000Z",
    "resolved": false
  }
}
```

#### Moving a Task
**User Prompt:**
```
Move the "Bug Fix" task from the "Sprint Backlog" list to "Current Sprint" list
```

**System Response:**
```json
{
  "taskName": "Bug Fix",
  "sourceListName": "Sprint Backlog",
  "destinationListName": "Current Sprint"
}
```

#### Global Task Lookup
**User Prompt:**
```
Get details for task "Roadmap Planning"
```

**System Response:**
```json
{
  "taskName": "Roadmap Planning"
}
```

**Response for Multiple Matches:**
```json
{
  "matches": [
    {
      "id": "abc123",
      "name": "🌐 Website Update",
      "description": "First instance of Website Update task in Programming list",
      "list": {
        "name": "Programming",
        "id": "123"
      },
      "folder": {
        "name": "Development",
        "id": "456"
      },
      "space": {
        "name": "Education",
        "id": "789"
      },
      "date_updated": "2024-03-15T10:30:45.000Z"
    },
    {
      "id": "def456",
      "name": "🌐 Website Update",
      "description": "Second instance of Website Update task in AI Assistant App list",
      "list": {
        "name": "AI Assistant App",
        "id": "234"
      },
      "folder": {
        "name": "Macrodroid",
        "id": "567"
      },
      "space": {
        "name": "Custom Space",
        "id": "890"
      },
      "date_updated": "2024-03-10T11:15:20.000Z"
    }
  ],
  "count": 2
}
```

**For Disambiguation Resolution:**
```
Get details for task "Website Update" in list "AI Assistant App"
```

#### Updating Task Status
**User Prompt:**
```
Update the "Bug Fix" task status to "Done"
```

**System Response:**
```json
{
  "taskName": "Bug Fix",
  "status": "Done"
}
```

#### Bulk Creating Tasks
**User Prompt:**
```
Create these tasks in the "Sprint Backlog" list:
1. Set up CI/CD pipeline (high priority)
2. Write unit tests (normal priority)
3. Update documentation (low priority)
```

**System Response:**
```json
{
  "listName": "Sprint Backlog",
  "tasks": [
    {
      "name": "Set up CI/CD pipeline",
      "priority": 2
    },
    {
      "name": "Write unit tests",
      "priority": 3
    },
    {
      "name": "Update documentation",
      "priority": 4
    }
  ]
}
```

#### Bulk Creating Tasks with Start and Due Dates
**User Prompt:**
```
Create these tasks in the "Project X" list:
1. Research - starts today, due in 3 days
2. Design - starts after Research ends, due in a week from start
3. Implementation - starts after Design, due in 2 weeks from start
```

**System Response:**
```json
{
  "listName": "Project X",
  "tasks": [
    {
      "name": "Research",
      "startDate": "today",
      "dueDate": "3 days from now"
    },
    {
      "name": "Design",
      "startDate": "4 days from now", 
      "dueDate": "11 days from now"
    },
    {
      "name": "Implementation",
      "startDate": "12 days from now",
      "dueDate": "26 days from now"
    }
  ]
}
```

#### Filtering Tasks by Tags
**User Prompt:**
```
Find all tasks with the tags "bug" and "high-priority" across the workspace
```

**System Response:**
```json
{
  "name": "get_workspace_tasks",
  "params": {
    "tags": ["bug", "high-priority"],
    "include_closed": false
  },
  "response": {
    "tasks": [
      {
        "id": "abcd1234",
        "name": "Fix authentication bug",
        "description": "Detailed bug description...",
        "text_content": "Plain text version...",
        "status": {
          "status": "In Progress",
          "color": "#f1c975"
        },
        "creator": {
          "id": 123,
          "username": "dev1",
          "email": "dev1@example.com"
        },
        "assignees": [
          {
            "id": 456,
            "username": "dev2",
            "email": "dev2@example.com"
          }
        ],
        "watchers": [...],
        "checklists": [...],
        "custom_fields": [...],
        "list": {
          "id": "list123",
          "name": "Current Sprint"
        },
        "tags": [
          {
            "name": "bug",
            "tag_bg": "#e50000",
            "tag_fg": "#ffffff"
          },
          {
            "name": "high-priority",
            "tag_bg": "#ff7800",
            "tag_fg": "#ffffff"
          }
        ]
      }
    ],
    "count": 1
  }
}
```

#### Adaptive Response Format in Workspace Tasks

The `get_workspace_tasks` tool offers two response formats to optimize for different use cases:

1. **Summary Format** (`detail_level: 'summary'`):
   - Lightweight response with essential task information
   - Ideal for lists, overviews, and large datasets
   - Includes: id, name, status, list info, due date, URL, priority, and tags
   - Automatically used when response size exceeds 50,000 tokens

2. **Detailed Format** (`detail_level: 'detailed'`):
   - Complete task information including all fields
   - Best for detailed views and task management
   - Includes: all task data, custom fields, descriptions, comments, etc.

Example using summary format:
```json
{
  "summaries": [
    {
      "id": "123abc",
      "name": "🎯 Important Task",
      "status": "in progress",
      "list": {
        "id": "456def",
        "name": "Project Alpha"
      },
      "due_date": "2024-03-20T10:00:00Z",
      "url": "https://app.clickup.com/t/123abc",
      "priority": 1,
      "tags": [
        {
          "name": "urgent",
          "tag_bg": "#ff0000",
          "tag_fg": "#ffffff"
        }
      ]
    }
  ],
  "total_count": 100,
  "has_more": true,
  "next_page": 1
}
```

Example using detailed format:
```json
{
  "tasks": [
    {
      // Full task object with all fields
      "id": "123abc",
      "name": "🎯 Important Task",
      "description": "Detailed task description...",
      "status": {
        "status": "in progress",
        "color": "#4A90E2"
      },
      "custom_fields": [...],
      "assignees": [...],
      "watchers": [...],
      "checklists": [...],
      // ... all other task fields
    }
  ],
  "total_count": 100,
  "has_more": true,
  "next_page": 1
}
```

##### Best Practices for Workspace Tasks

1. **Use Filters**: At least one filter parameter is required to prevent overly broad queries:
   - `tags`: Filter by tag names
   - `list_ids`: Filter by specific lists
   - `folder_ids`: Filter by folders
   - `space_ids`: Filter by spaces
   - `statuses`: Filter by task status
   - `assignees`: Filter by assigned users
   - Date filters: `due_date_gt`, `due_date_lt`, etc.

2. **Pagination**: Use `page`, `order_by`, and `reverse` parameters to navigate through results:
   ```json
   {
     "list_ids": ["123"],
     "page": 0,
     "order_by": "due_date",
     "reverse": true
   }
   ```

3. **Response Size**: For large datasets:
   - Use `detail_level: 'summary'` to get lightweight responses
   - The tool automatically switches to summary format if response exceeds 50,000 tokens
   - Use filters to narrow down results

4. **Adaptive Response Pattern**:
   1. Fetch summaries first for list views
   2. Load details on-demand when viewing specific tasks
   3. Use pagination to load more items as needed

#### Bulk Updating Tasks
**User Prompt:**
```
Update all the following tasks to high priority:
1. "Implement login screen"
2. "Create database schema"
3. "Set up CI pipeline"
```

**System Response:**
```json
{
  "tasks": [
    {
      "taskName": "Implement login screen",
      "listName": "Development Tasks",
      "priority": 2
    },
    {
      "taskName": "Create database schema",
      "listName": "Development Tasks",
      "priority": 2
    },
    {
      "taskName": "Set up CI pipeline",
      "listName": "Development Tasks",
      "priority": 2
    }
  ]
}
```

#### Bulk Updating Tasks with Start Dates
**User Prompt:**
```
Update these tasks to have new start dates:
1. "Research" should start now
2. "Design" should start after "Research" is done (3 days from now)
3. "Implementation" should start next week
```

**System Response:**
```json
{
  "tasks": [
    {
      "taskName": "Research",
      "listName": "Project X",
      "startDate": "now"
    },
    {
      "taskName": "Design",
      "listName": "Project X",
      "startDate": "3 days from now"
    },
    {
      "taskName": "Implementation",
      "listName": "Project X",
      "startDate": "next week"
    }
  ]
}
```

#### Bulk Moving Tasks
**User Prompt:**
```
Move all the completed tasks from "In Progress" list to "Done" list:
1. "Backend API implementation"
2. "Frontend form validation"
```

**System Response:**
```json
{
  "tasks": [
    {
      "taskName": "Backend API implementation",
      "listName": "In Progress"
    },
    {
      "taskName": "Frontend form validation",
      "listName": "In Progress"
    }
  ],
  "targetListName": "Done"
}
```

#### Attaching a File to a Task
**User Prompt:**
```
Attach a file to the task "Implement Authentication". The file is at URL "https://example.com/files/specs.pdf"
```

**System Response:**
```json
{
  "taskName": "Implement Authentication",
  "file_url": "https://example.com/files/specs.pdf",
  "file_name": "specs.pdf"
}
```

**User Prompt:**
```
Attach this document to the task with ID 86b4bnnny
```

**System Response:**
```json
{
  "taskId": "86b4bnnny",
  "file_data": "<base64-encoded-content>",
  "file_name": "document.txt"
}
```

#### Handling Different File Types
The attach_task_file tool supports various file types including:
- Documents (PDF, DOCX, TXT)
- Images (PNG, JPG, SVG)
- Data files (CSV, JSON)
- And many others

Files can be attached using either:
1. **Base64 Method**: For small files (using `file_data` parameter)
2. **URL Method**: For files already available online (using `file_url` parameter)
3. **Local File Path**: For files on the local filesystem (using `file_url` parameter with an absolute file path)
4. **Chunked Upload**: For large files (automatically selected for `file_data` > 10MB)

#### Retrieving Tasks with Subtasks
**User Prompt:**
```
Get the "Project Planning" task with all its subtasks
```

**System Response:**
```json
{
  "taskName": "Project Planning",
  "subtasks": true
}
```

**Response will include:**
```json
{
  "id": "abc123",
  "name": "Project Planning",
  "description": "Plan the new project phase",
  "subtasks": [
    {
      "id": "def456",
      "name": "Define Requirements",
      "parent": "abc123",
      "top_level_parent": "abc123"
    },
    {
      "id": "ghi789",
      "name": "Create Timeline",
      "parent": "abc123",
      "top_level_parent": "abc123"
    }
  ]
}
```

#### Creating a Subtask
**User Prompt:**
```
Create a subtask under "Project Planning" called "Schedule Team Meeting"
```

**System Response:**
```json
{
  "name": "Schedule Team Meeting",
  "parent": "abc123",
  "listName": "Development Tasks"
}
```

#### Natural Language Date Support

The server supports a wide range of natural language date expressions:

1. **Basic expressions**:
   - "now" - current date and time
   - "today" - end of current day
   - "tomorrow" - end of tomorrow
   - "next week" - end of next week
   - "in 3 days" - 3 days from current time

2. **Time-specific expressions**:
   - "tomorrow at 9am"
   - "next Monday at 2pm"
   - "Friday at noon"

3. **Range expressions**:
   - "start of today" - beginning of current day (midnight)
   - "end of today" - end of current day (23:59:59)
   - "beginning of next week"
   - "end of this month"

4. **Relative expressions**:
   - "30 minutes from now"
   - "2 hours from now"
   - "5 days after tomorrow"

These expressions can be used with both `dueDate` and `startDate` parameters.

## List Management

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|-------------------|-------------------|
| create_list | Create a new list | `name` and either `spaceId` or `spaceName` | content, dueDate, priority, assignee |
| create_list_in_folder | Create list in folder | `name` and either `folderId` or `folderName` | content, status |
| get_list | Get list details | Either `listId` or `listName` | None |
| update_list | Update list properties | Either `listId` or `listName` | name, content, status |

### List Parameters

- **Content**: Description or purpose of the list
- **Priority**: Same scale as tasks (1-4)
- **Status**: Initial status for the list

### Examples

#### Getting List Details
**User Prompt:**
```
Get details for the "Sprint Backlog" list
```

**System Response:**
```json
{
  "listName": "Sprint Backlog"
}
```

#### Updating a List
**User Prompt:**
```
Update the "Sprint Backlog" list to have the description "Current sprint planning items and priorities"
```

**System Response:**
```json
{
  "listName": "Sprint Backlog",
  "content": "Current sprint planning items and priorities"
}
```

## Folder Management

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|-------------------|-------------------|
| create_folder | Create a new folder | `name` and either `spaceId` or `spaceName` | override_statuses |
| get_folder | Get folder details | Either `folderId` or `folderName` | `spaceId` or `spaceName` (if using `folderName`) |
| update_folder | Update folder properties | Either `folderId` or `folderName` | name, override_statuses, `spaceId` or `spaceName` (if using `folderName`) |

### Folder Parameters

- **override_statuses**: Boolean to determine if folder should use custom statuses
- **name**: Display name for the folder

### Examples

#### Getting Folder Details
**User Prompt:**
```
Get details for the "Development Projects" folder
```

**System Response:**
```json
{
  "folderName": "Development Projects"
}
```

#### Updating a Folder
**User Prompt:**
```
Update the "Development Projects" folder to be named "Active Development Projects"
```

**System Response:**
```json
{
  "folderName": "Development Projects",
  "name": "Active Development Projects"
}
```

## Tag Management

| Tool | Description | Required Parameters | Optional Parameters |
|------|-------------|-------------------|-------------------|
| get_space_tags | Get all tags in a space | Either `spaceId` or `spaceName` | None |
| create_space_tag | Create a new tag | `tagName` and either `spaceId` or `spaceName` | `tagBg` (hex color), `tagFg` (hex color), `colorCommand` (natural language) |
| update_space_tag | Update an existing tag | `tagName` and either `spaceId` or `spaceName` | `newTagName`, `tagBg`, `tagFg`, `colorCommand` (natural language) |
| add_tag_to_task | Add tag to a task | `tagName` and either `taskId` or (`taskName` + `listName`) | None |
| remove_tag_from_task | Remove tag from task | `tagName` and either `taskId` or (`taskName` + `listName`) | None |

### Tag Parameters

- **tagName**: Name of the tag (case-sensitive)
- **tagBg**: Background color in hex format (e.g., "#FF5733")
- **tagFg**: Foreground (text) color in hex format (e.g., "#FFFFFF")
- **newTagName**: New name when updating a tag
- **colorCommand**: Natural language color description (e.g., "blue tag", "dark red background")

### Examples

#### Getting Space Tags
**User Prompt:**
```
Show me all tags in the "Development" space
```

**System Response:**
```json
{
  "spaceName": "Development",
  "tags": [
    {
      "name": "feature",
      "tag_bg": "#FF5733",
      "tag_fg": "#FFFFFF"
    },
    {
      "name": "bug",
      "tag_bg": "#DC3545",
      "tag_fg": "#FFFFFF"
    }
  ]
}
```

#### Creating a Tag
**User Prompt:**
```
Create a new tag called "priority" in the "Development" space with red background
```

**System Response:**
```json
{
  "spaceName": "Development",
  "tagName": "priority",
  "tagBg": "#FF0000",
  "tagFg": "#FFFFFF"
}
```

#### Creating a Tag with Natural Language Color Command
**User Prompt:**
```
Create a new tag called "important" in the "Development" space using dark blue color
```

**System Response:**
```json
{
  "spaceName": "Development",
  "tagName": "important",
  "colorCommand": "dark blue color"
}
```

#### Updating a Tag
**User Prompt:**
```
Update the "priority" tag to have a blue background
```

**System Response:**
```json
{
  "spaceName": "Development",
  "tagName": "priority",
  "tagBg": "#0000FF"
}
```

#### Updating a Tag with Natural Language Color Command
**User Prompt:**
```
Change the "priority" tag color to light green
```

**System Response:**
```json
{
  "spaceName": "Development",
  "tagName": "priority",
  "colorCommand": "light green"
}
```

#### Adding a Tag to a Task
**User Prompt:**
```
Add the "feature" tag to the task "Implement Authentication"
```

**System Response:**
```json
{
  "taskName": "Implement Authentication",
  "tagName": "feature"
}
```

### Important Notes

1. **Tag Existence**: Before adding a tag to a task, ensure the tag exists in the space. Use `get_space_tags` to verify tag existence and `create_space_tag` to create it if needed.

2. **Color Formats**: 
   - **Hex Format**: Colors can be provided in hex format (e.g., "#FF5733", "#fff")
   - **Natural Language**: Colors can be specified using natural language (e.g., "blue", "dark red", "light green")
   - When using natural language colors, the system automatically generates appropriate foreground (text) colors for optimal contrast

3. **Case Sensitivity**: Tag names are case-sensitive. "Feature" and "feature" are treated as different tags.

4. **Task Tags**: When creating or updating tasks, you can include tags in the task properties:
   ```json
   {
     "name": "New Task",
     "tags": ["feature", "priority"]
   }
   ```

5. **Supported Color Names**: Basic colors (red, blue, green, etc.) and common variations (dark blue, light green, etc.) are supported.

## Workspace Organization

| Tool | Description | Required Parameters | Response |
|------|-------------|-------------------|----------|
| get_workspace_hierarchy | Get complete structure | None | Full workspace tree with spaces, folders, and lists |

### Workspace Tree Structure
```json
{
  "workspace": {
    "id": "team_id",
    "name": "Workspace Name",
    "spaces": [{
      "id": "space_id",
      "name": "Space Name",
      "lists": [...],
      "folders": [{
        "id": "folder_id",
        "name": "Folder Name",
        "lists": [...]
      }]
    }]
  }
}
```

## Prompts

| Prompt | Purpose | Features |
|--------|---------|----------|
| summarize_tasks | Generate task overview | Status summary, relationships, current states |
| analyze_priorities | Review task priorities | Priority review, adjustments, sequencing |
| generate_description | Create task descriptions | Structure, objectives, dependencies |

## Common Parameters

### Name-based Lookup
All tools support looking up items by name instead of ID:
- `listName` instead of `listId`
- `taskName` instead of `taskId`
- `spaceName` instead of `spaceId`
- `folderName` instead of `folderId`

### Date Formats
- All dates should be provided as Unix timestamps in milliseconds
- Example: `1703980800000` for January 1, 2024

### Priority Levels
1. Urgent/Highest
2. High
3. Normal
4. Low

## Error Handling

The server provides clear error messages for:
- Missing required parameters
- Invalid IDs or names
- Items not found
- Permission issues
- API rate limiting

### Common Error Responses
```json
{
  "error": "List with name 'Development' not found",
  "type": "NOT_FOUND"
}
```

```json
{
  "error": "Either taskId or taskName is required",
  "type": "MISSING_PARAMETER"
}
```

### Rate Limiting
- Automatic handling of ClickUp API rate limits
- Built-in retry mechanism with exponential backoff
- Status updates during rate limit waits 