# Plan: Obsidian Kanban Plugin

## Overview
Build a custom Obsidian plugin that renders kanban boards from code blocks embedded in any note. The plugin uses Dataview API as the data layer, SortableJS for drag-and-drop, and supports two task sources: individual files with frontmatter and checkboxes inside notes. Boards are configured via YAML parameters in the code block, including DQL queries for filtering. MVP focuses on frontmatter-based task files; v2 adds checkbox support.

## Validation Commands
- `npm run build`
- `npm run dev`
- Manual test: open Obsidian vault with symlinked plugin, insert kanban code block, verify board renders
- Manual test: drag card between columns, verify frontmatter `status` field updates in source file
- Manual test: click card title, verify file opens in new tab

### Task 1: Project scaffolding and build setup
- [x] Clone obsidian-sample-plugin template, rename to obsidian-kanban-board
- [x] Configure esbuild with SortableJS as bundled dependency and obsidian/obsidian-dataview as external
- [x] Set up manifest.json (id: kanban-board, name, version, minAppVersion, description)
- [x] Set up styles.css with empty kanban board CSS skeleton
- [x] Create symlink from build output to test vault .obsidian/plugins/kanban-board
- [x] Verify plugin loads in Obsidian (shows in Community Plugins list, can enable/disable)
- [x] Add tests
- [x] Mark completed

### Task 2: Code block parser and config model
- [x] Register `registerMarkdownCodeBlockProcessor("kanban", handler)` in main.ts
- [x] Define TypeScript interfaces: `KanbanConfig` (source, query, sourceType, columns, groupBy, sortBy, filterTags, hideFields, showDone)
- [x] Write YAML parser for code block content — parse each line as key:value, handle comma-separated lists for columns/filterTags/hideFields
- [x] Add validation: require `source`, `query`, `columns`, `group-by`; provide clear error messages rendered in the code block container when config is invalid
- [x] Register Cmd+P command "Kanban: Insert Board" that inserts a template code block at cursor position
- [x] Add tests
- [x] Mark completed

### Task 3: Dataview integration and data fetching
- [x] Check Dataview plugin availability via `getAPI(app)`, render friendly error if not installed
- [x] Implement `fetchPages(config)`: call `api.pages(query)` for source-type: pages, extract status/priority/due/tags/project from frontmatter
- [x] Implement `fetchTasks(config)`: call `api.pages(query).file.tasks` for source-type: tasks (stub for v2, just return empty with "coming in v2" message)
- [x] Define unified `KanbanCard` interface: id, title, status, priority, due, tags, project, filePath, lineNumber, cardType (file/checkbox)
- [x] Map Dataview page results to KanbanCard array, group by `config.groupBy` field into columns
- [x] Apply sorting within columns based on `config.sortBy`
- [x] Apply tag filtering when `config.filterTags` is set
- [x] Subscribe to `dataview:metadata-change` event for auto-refresh — debounce re-render with 300ms delay
- [x] Add tests
- [x] Mark completed

### Task 4: Board rendering (columns and cards)
- [x] Build `renderBoard(el, columns, cards, config)`: create horizontal flex container with column divs
- [x] Render column headers with column name and card count badge
- [x] Render card elements inside each column with: checkbox, title, project path, due date (with color coding: red=overdue, orange=today, default=future), priority indicator, tags list
- [x] Style cards and columns using CSS variables from Obsidian theme (--background-primary, --background-secondary, --text-accent, etc.)
- [x] Handle empty columns gracefully (show placeholder text)
- [x] Handle `hide-fields` config — conditionally skip rendering specified fields
- [x] Handle `show-done: false` — filter out done cards from render
- [x] Add tests
- [x] Mark completed

### Task 5: Drag-and-drop with SortableJS
- [x] Initialize SortableJS on each column container with shared `group` name scoped to board instance
- [x] Store card metadata as data attributes: `data-file-path`, `data-card-type`, `data-line-number`
- [x] Implement `onAdd` handler: read target column id from `evt.to.dataset.columnId`, call `updateTaskStatus()`
- [x] Implement `updateTaskStatus()` for file-tasks: use `app.fileManager.processFrontMatter(file, fm => fm[groupByField] = newColumnId)`
- [x] Implement `updateTaskStatus()` for checkboxes (v2 stub): use `app.vault.process()` to replace inline field or tag in source line
- [x] Handle edge case: if processFrontMatter fails (file deleted, locked), revert card position and show notice
- [x] Ensure SortableJS instances are destroyed on code block re-render (cleanup in MarkdownRenderChild.onunload)
- [x] Add tests
- [x] Mark completed

### Task 6: Card actions (click to open, checkbox toggle)
- [ ] Implement click on card title: `app.workspace.getLeaf('tab')` then `leaf.openFile(file)` — open in new tab
- [ ] Implement checkbox click on card: toggle `- [ ]` to `- [x]` via `app.vault.process()` for checkboxes, or set `status: done` via `processFrontMatter` for file-tasks
- [ ] Prevent click events from firing during drag (check SortableJS drag state)
- [ ] Add Obsidian Notice on successful status update ("Task moved to {column}")
- [ ] Add tests
- [ ] Mark completed

### Task 7: Polish, edge cases, and release prep
- [ ] Handle multiple kanban boards in same note (unique group IDs per board instance)
- [ ] Handle vault with no Dataview plugin (show install prompt)
- [ ] Handle empty query results (show "No tasks found" message)
- [ ] Handle malformed frontmatter (skip card, log warning)
- [ ] Add CSS for responsive column widths, card hover states, drag ghost styling
- [ ] Test with 50+ task files for performance
- [ ] Write README.md with installation instructions, usage examples, and config reference
- [ ] Add tests
- [ ] Mark completed
