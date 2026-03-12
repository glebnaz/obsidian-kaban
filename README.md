# Kanban Board Plugin for Obsidian

Render kanban boards from code blocks in any Obsidian note using Dataview queries.

## Requirements

- [Obsidian](https://obsidian.md/) v1.4.0+
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) community plugin installed and enabled

## Installation

1. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at `.obsidian/plugins/kanban-board/`
2. Enable the plugin in Obsidian Settings → Community Plugins
3. Ensure the Dataview plugin is also installed and enabled

## Usage

Insert a kanban code block in any note:

~~~
```kanban
source: Tasks
query: WHERE status != "archive"
columns: Backlog, In Progress, Done
group-by: status
```
~~~

Or use the command palette: **Kanban: Insert Board**

### Configuration Reference

| Field | Required | Description |
|---|---|---|
| `source` | Yes | Name of the data source (descriptive) |
| `query` | Yes | Dataview query (e.g. `FROM "Tasks"`, `WHERE status != "archive"`) |
| `columns` | Yes | Comma-separated list of column names |
| `group-by` | Yes | Frontmatter field to group cards into columns |
| `source-type` | No | `pages` (default) or `tasks` (v2) |
| `sort-by` | No | Field to sort cards within columns (e.g. `priority`, `due`) |
| `filter-tags` | No | Comma-separated tags to filter cards (e.g. `#work, #urgent`) |
| `hide-fields` | No | Comma-separated fields to hide (e.g. `checkbox, tags, due, priority, project`) |
| `show-done` | No | `true` (default) or `false` — hide cards with status "Done" |

### Example with all options

~~~
```kanban
source: Project Tasks
query: FROM "Projects/MyProject"
columns: Backlog, In Progress, Review, Done
group-by: status
source-type: pages
sort-by: priority
filter-tags: #sprint1
hide-fields: project
show-done: false
```
~~~

## Features

- Drag-and-drop cards between columns (updates frontmatter automatically)
- Click card title to open the source file in a new tab
- Checkbox to toggle tasks as done/not done
- Live updates when note metadata changes
- Multiple boards in the same note (each board operates independently)
- Due date color coding: red for overdue, orange for today
- Theme-aware styling using Obsidian CSS variables

## Task File Format

Task files should have frontmatter matching your `group-by` field:

```yaml
---
status: Backlog
priority: high
due: 2026-03-15
project: MyProject
tags: [work, urgent]
---
```

## Development

```bash
npm install
npm run dev      # Watch mode
npm run build    # Production build
npm test         # Run tests
```
