# ClickUp MCP Server

A Model Context Protocol (MCP) server for integrating ClickUp tasks with AI applications. This server allows AI agents to interact with ClickUp tasks, spaces, lists, and folders through a standardized protocol.

## Setup

1. Get your credentials:
   - ClickUp API key from [ClickUp Settings](https://app.clickup.com/settings/apps)
   - Team ID from your ClickUp workspace URL
2. NPX installation (downloads to local path and installs dependencies)
3. Use natural language to manage your workspace!

## NPX Installation

[![NPM Version](https://img.shields.io/npm/v/@jcleigh/clickup-mcp-server.svg?style=flat&logo=npm)](https://www.npmjs.com/package/@jcleigh/clickup-mcp-server)
[![Dependency Status](https://img.shields.io/badge/dependencies-up%20to%20date-brightgreen)](https://github.com/jcleigh/clickup-mcp-server/blob/main/package.json)
[![NPM Downloads](https://img.shields.io/npm/dm/@jcleigh/clickup-mcp-server.svg?style=flat&logo=npm)](https://npmcharts.com/compare/@jcleigh/clickup-mcp-server?minimal=true)

Add this entry to your client's MCP settings JSON file:

```json
{
  "mcpServers": {
    "ClickUp": {
      "command": "npx",
      "args": [
        "-y",
        "@jcleigh/clickup-mcp-server@latest"
      ],
      "env": {
        "CLICKUP_API_KEY": "your-api-key",
        "CLICKUP_TEAM_ID": "your-team-id"
      }
    }
  }
}
```

Or use this npx command:

`npx -y @jcleigh/clickup-mcp-server@latest --env CLICKUP_API_KEY=your-api-key --env CLICKUP_TEAM_ID=your-team-id`

## Features

| 📝 Task Management | 🏷️ Tag Management |
|----------------------------|----------------------------|
| • Create and update tasks<br>• Move and duplicate tasks anywhere<br>• Support for single and bulk operations<br>• Set start/due dates with natural language<br>• Create and manage subtasks<br>• Add comments and attachments | • Create and update space tags<br>• Add and remove tags from tasks<br>• Use natural language color commands<br>• Automatic contrasting foreground colors<br>• View all space tags<br>• Tag-based task organization across workspace |
| 🌳 **Workspace Organization** | ⚡ **Integration Features** |
| • Navigate spaces, folders, and lists<br>• Create and manage folders<br>• Organize lists within spaces<br>• Create lists in folders<br>• View workspace hierarchy<br>• Efficient path navigation | • Global name or ID-based lookups<br>• Case-insensitive matching<br>• Markdown formatting support<br>• Built-in rate limiting<br>• Error handling and validation<br>• Comprehensive API coverage |

## Available Tools

| Tool | Description | Required Parameters |
|------|-------------|-------------------|
| [get_workspace_hierarchy](docs/api-reference.md#workspace-navigation) | Get workspace structure | None |
| [create_task](docs/api-reference.md#task-management) | Create a task | `name`, (`listId`/`listName`) |
| [create_bulk_tasks](docs/api-reference.md#task-management) | Create multiple tasks | `tasks[]` |
| [update_task](docs/api-reference.md#task-management) | Modify task | `taskId`/`taskName` |
| [update_bulk_tasks](docs/api-reference.md#task-management) | Update multiple tasks | `tasks[]` with IDs or names |
| [get_tasks](docs/api-reference.md#task-management) | Get tasks from list | `listId`/`listName` |
| [get_task](docs/api-reference.md#task-management) | Get single task details | `taskId`/`taskName` (with smart disambiguation) |
| [get_workspace_tasks](docs/api-reference.md#task-management) | Get tasks with filtering | At least one filter (tags, list_ids, space_ids, etc.) |
| [get_task_comments](docs/api-reference.md#task-management) | Get comments on a task | `taskId`/`taskName` |
| [create_task_comment](docs/api-reference.md#task-management) | Add a comment to a task | `commentText`, (`taskId`/(`taskName`+`listName`)) |
| [attach_task_file](docs/api-reference.md#task-management) | Attach file to a task | `taskId`/`taskName`, (`file_data` or `file_url`) |
| [move_task](docs/api-reference.md#task-management) | Move task | `taskId`/`taskName`, `listId`/`listName` |
| [move_bulk_tasks](docs/api-reference.md#task-management) | Move multiple tasks | `tasks[]` with IDs or names, target list |
| [duplicate_task](docs/api-reference.md#task-management) | Copy task | `taskId`/`taskName`, `listId`/`listName` |
| [create_list](docs/api-reference.md#list-management) | Create list in space | `name`, `spaceId`/`spaceName` |
| [create_folder](docs/api-reference.md#folder-management) | Create folder | `name`, `spaceId`/`spaceName` |
| [create_list_in_folder](docs/api-reference.md#list-management) | Create list in folder | `name`, `folderId`/`folderName` |
| [get_folder](docs/api-reference.md#folder-management) | Get folder details | `folderId`/`folderName` |
| [update_folder](docs/api-reference.md#folder-management) | Update folder properties | `folderId`/`folderName` |
| [get_list](docs/api-reference.md#list-management) | Get list details | `listId`/`listName` |
| [update_list](docs/api-reference.md#list-management) | Update list properties | `listId`/`listName` |
| [get_space_tags](docs/api-reference.md#tag-management) | Get space tags | `spaceId`/`spaceName` |
| [create_space_tag](docs/api-reference.md#tag-management) | Create tag | `tagName`, `spaceId`/`spaceName` |
| [update_space_tag](docs/api-reference.md#tag-management) | Update tag | `tagName`, `spaceId`/`spaceName` |
| [add_tag_to_task](docs/api-reference.md#tag-management) | Add tag to task | `tagName`, `taskId`/(`taskName`+`listName`) |
| [remove_tag_from_task](docs/api-reference.md#tag-management) | Remove tag from task | `tagName`, `taskId`/(`taskName`+`listName`) |

See [full documentation](docs/api-reference.md) for optional parameters and advanced usage.

## Prompts
Not yet implemented and not supported by all client apps. Request a feature for a Prompt implementation that would be most beneficial for your workflow (without it being too specific). Examples:

| Prompt | Purpose | Features |
|--------|---------|----------|
| [summarize_tasks](docs/api-reference.md#prompts) | Task overview | Status summary, priorities, relationships |
| [analyze_priorities](docs/api-reference.md#prompts) | Priority optimization | Distribution analysis, sequencing |
| [generate_description](docs/api-reference.md#prompts) | Task description creation | Objectives, criteria, dependencies |

## Error Handling

The server provides clear error messages for:
- Missing required parameters
- Invalid IDs or names
- Items not found
- Permission issues
- API errors
- Rate limiting

The `LOG_LEVEL` environment variable can be specified to control the verbosity of server logs. Valid values are `trace`, `debug`, `info`, `warn`, and `error` (default).
This can be also be specified on the command line as, e.g. `--env LOG_LEVEL=info`.

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This software makes use of third-party APIs and may reference trademarks
or brands owned by third parties. The use of such APIs or references does not imply 
any affiliation with or endorsement by the respective companies. All trademarks and 
brand names are the property of their respective owners. This project is an independent
work and is not officially associated with or sponsored by any third-party company mentioned.
