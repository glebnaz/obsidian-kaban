# Kaban

Obsidian plugin that renders kanban boards from code blocks using [Dataview](https://github.com/blacksmithgu/obsidian-dataview) as the data layer.

## Features

- Kanban boards defined as fenced code blocks — no separate UI, lives in your notes
- Two data sources: **files** (frontmatter) and **checkbox tasks** (inline fields)
- Drag-and-drop between columns (updates source files automatically)
- Click card title to open the file
- Done columns with green highlight and automatic checkbox toggling
- Auto-refresh when underlying files change
- Tag filtering, sorting, field hiding
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
query: FROM "Tasks"
columns: Backlog, In Progress, Done
group-by: status
```
````

Or use the command palette: **Kanban: Insert Board**

### Configuration fields

| Field | Required | Description |
|---|---|---|
| `query` | yes | Dataview query (`FROM "folder"`, `WHERE ...`) |
| `columns` | yes | Comma-separated column names |
| `group-by` | yes | Field to group cards into columns |
| `source-type` | no | `pages` (default) or `tasks` |
| `sort-by` | no | Field to sort cards within columns |
| `filter-tags` | no | Comma-separated tags to filter cards |
| `hide-fields` | no | Comma-separated fields to hide (`project`, `due`, `priority`, `tags`, `checkbox`) |
| `done-columns` | no | Comma-separated column names treated as "done" |
| `show-done` | no | `true` (default) or `false` — hides done columns entirely |

### Source type: pages (default)

Each file is a card. Metadata comes from YAML frontmatter:

```yaml
---
status: todo
priority: high
due: 2026-03-15
project: Backend
tags: [bug, urgent]
---
```

### Source type: tasks

Checkbox items from markdown files. Metadata as inline fields:

```markdown
- [ ] Fix login bug [status:: todo] [priority:: high] [project:: Backend]
- [ ] Write tests [status:: in-progress] [due:: 2026-03-20]
- [x] Setup CI [status:: done]
```

### Done columns

Columns listed in `done-columns` get green styling. When a checkbox task is dragged into a done column, its checkbox is automatically checked. When dragged out — unchecked.

````markdown
```kanban
query: FROM "Tasks"
source-type: tasks
columns: Backlog, In Progress, Done, Archived
group-by: status
done-columns: Done, Archived
```
````

## Full example

````markdown
```kanban
query: FROM "Work/Tasks" WHERE priority != null
columns: todo, in-progress, review, done
group-by: status
source-type: tasks
sort-by: priority
filter-tags: backend
hide-fields: project
done-columns: done
show-done: true
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
