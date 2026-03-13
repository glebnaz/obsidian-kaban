# Kaban

Obsidian plugin that renders kanban boards from code blocks using [Dataview](https://github.com/blacksmithgu/obsidian-dataview) as the data layer.

## Features

- Kanban boards defined as fenced code blocks — no separate UI, lives in your notes
- Two data sources: **files** (frontmatter) and **checkbox tasks** (inline fields)
- **WHERE expressions** — full Dataview-style filtering (`WHERE status != "archive" AND due >= date(today)`)
- Drag-and-drop between columns (updates source files automatically)
- Click card title to open the file
- Done columns with green highlight and automatic checkbox toggling
- Auto-refresh when underlying files change
- Tag filtering, sorting, field hiding
- Creation date display via configurable `created-field`
- Date formatting: `dd-mm-yyyy hh:mm`
- Works with Obsidian themes (uses CSS variables)

## Requirements

- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin installed and enabled

## Installation

### Via BRAT (recommended)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from community plugins
2. In BRAT settings, click **Add Beta Plugin**
3. Paste this repo URL

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](../../releases/latest)
2. Create folder `.obsidian/plugins/kaban/`
3. Place the files there
4. Restart Obsidian and enable the plugin in Settings > Community plugins

## Usage

Create a fenced code block with the `kanban` language tag:

````markdown
```kanban
query: FROM "Tasks" WHERE status != "archive"
columns: Backlog, In Progress, Done
group-by: status
```
````

Or use the command palette:

| Command | Description |
|---|---|
| **Kaban: Insert Page Board** | Insert a kanban block for file-based cards |
| **Kaban: Insert Task Board (all vault)** | Insert a kanban block for checkbox tasks from the entire vault |
| **Kaban: Refresh all boards** | Force re-render all boards on the current page |

All commands are available in Settings → Hotkeys for custom keybindings.

### Configuration fields

| Field | Required | Description |
|---|---|---|
| `query` | yes | Dataview source with optional WHERE (`FROM "folder" WHERE ...`) |
| `columns` | yes | Comma-separated column names |
| `group-by` | yes | Field to group cards into columns |
| `source-type` | no | `pages` (default) or `tasks` |
| `sort-by` | no | Field to sort cards within columns |
| `filter-tags` | no | Comma-separated tags to filter cards |
| `hide-fields` | no | Comma-separated fields to hide (`project`, `due`, `priority`, `tags`, `checkbox`, `created`) |
| `done-columns` | no | Comma-separated column names treated as "done" |
| `show-done` | no | `true` (default) or `false` — hides done columns entirely |
| `created-field` | no | Frontmatter/inline field name for creation date (e.g., `created`) |

### WHERE expressions

The `query` field supports Dataview-style WHERE clauses that are parsed and evaluated by the plugin:

```
query: FROM "Tasks" WHERE status != "archive" AND priority = "high"
query: FROM "Tasks" WHERE due >= date(today) AND contains(tags, "bug")
query: FROM "Tasks" WHERE (status = "todo" OR status = "in-progress") AND project = "Backend"
```

**Supported operators:** `=`, `!=`, `>`, `<`, `>=`, `<=`, `AND`, `OR`, `!` (NOT), parentheses

**Supported functions:**

| Function | Description |
|---|---|
| `contains(field, value)` | Check if array contains value or string contains substring |
| `date(today)`, `date(now)`, `date(tomorrow)`, `date(yesterday)` | Date keywords |
| `date("2026-01-01")` | Parse date string |
| `length(field)` | Array or string length |
| `lower(field)`, `upper(field)` | Case conversion |
| `startswith(field, prefix)`, `endswith(field, suffix)` | String prefix/suffix check |
| `regexmatch(field, pattern)` | Regex matching |
| `default(field, fallback)` | Default value for null fields |

### Source type: pages (default)

Each file is a card. Metadata comes from YAML frontmatter:

```yaml
---
status: todo
priority: high
due: 2026-03-15
project: Backend
tags: [bug, urgent]
created: 2026-03-01
---
```

### Source type: tasks

Checkbox items from markdown files. Metadata as inline fields:

```markdown
- [ ] Fix login bug [status:: todo] [priority:: high] [project:: Backend] [created:: 2026-03-01]
- [ ] Write tests [status:: in-progress] [due:: 2026-03-20]
- [x] Setup CI [status:: done]
```

Task cards also read metadata from Dataview task object properties as a fallback when inline fields are not present.

### Done columns

Columns listed in `done-columns` get green styling. When a checkbox task is dragged into a done column, its checkbox is automatically checked. When dragged out — unchecked.

## Examples

### Basic board with WHERE filter

````markdown
```kanban
query: FROM "Tasks" WHERE status != "archive"
columns: todo, in-progress, done
group-by: status
sort-by: priority
done-columns: done
created-field: created
```
````

### Eisenhower matrix

````markdown
```kanban
query: FROM "Tasks" WHERE eisenhower != null AND status != "archive"
columns: important-urgent, important-not-urgent, not-important-urgent, not-important-not-urgent
group-by: eisenhower
sort-by: due
created-field: created
```
````

### All checkbox tasks from vault

````markdown
```kanban
query: FROM ""
columns: todo, in-progress, done
group-by: status
source-type: tasks
sort-by: priority
done-columns: done
created-field: created
```
````

### Due date filtering

````markdown
```kanban
query: FROM "Tasks" WHERE due <= date(today) AND status != "done"
columns: todo, in-progress, bloked
group-by: status
sort-by: due
```
````

### Tag-based filtering with contains()

````markdown
```kanban
query: FROM "Tasks" WHERE contains(tags, "bug") AND status != "archive"
columns: todo, in-progress, done
group-by: status
sort-by: priority
done-columns: done
```
````

## Development

```bash
npm install
npm run dev       # watch mode
npm run build     # production build
npm test          # run tests
```

See [docs/releasing.md](docs/releasing.md) for the release process.

## License

MIT
