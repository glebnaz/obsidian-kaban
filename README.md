# Kaban

> Kanban boards and Timeline views inside Obsidian — powered by [Dataview](https://github.com/blacksmithgu/obsidian-dataview), defined in code blocks, living right in your notes.

![Obsidian](https://img.shields.io/badge/Obsidian-plugin-7C3AED?logo=obsidian&logoColor=white)
![Dataview](https://img.shields.io/badge/requires-Dataview-blue)
![License](https://img.shields.io/github/license/pegnfrn/obsidian-kaban)

![Kaban — Eisenhower Matrix example](Screenshot%202026-03-14%20at%2022.48.03.png)

---

## Highlights

- **Zero UI overhead** — boards are fenced code blocks, not a separate app
- **Two data sources** — files (frontmatter) or checkbox tasks (inline fields)
- **Kanban boards** — drag & drop cards between columns, source files update automatically
- **Timeline view** — Gantt-chart visualization with color-coded task bars (blue = in progress, green = done, gray = not started)
- **Full WHERE expressions** — Dataview-style filtering: `WHERE status != "archive" AND due >= date(today)`
- **Column color coding** — `done-columns` (green), `active-columns` (blue), and default (neutral)
- **Done columns** — green highlight + automatic checkbox toggling
- **Live refresh** — boards and timelines re-render when underlying files change
- **Create tasks from command palette** — new file from a template in one keystroke
- **Settings** — default task folder, template file path (core Templates / Templater)
- **Theme-aware** — uses Obsidian CSS variables, works with any theme

---

## Requirements

| Plugin | Why |
|---|---|
| [Dataview](https://github.com/blacksmithgu/obsidian-dataview) | Data layer — queries, metadata, inline fields |
| [Templater](https://github.com/SilentVoid13/Templater) *(optional)* | Process `<% %>` placeholders when creating tasks from template |

---

## Installation

> **Note:** Kaban is not yet available in the Obsidian Community Plugins directory — we're working on it! For now, install via BRAT or manually.

### Via BRAT (recommended)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from community plugins
2. In BRAT settings, click **Add Beta Plugin**
3. Paste this repo URL

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](../../releases/latest)
2. Create folder `.obsidian/plugins/kaban/`
3. Place the files there
4. Restart Obsidian and enable the plugin in **Settings > Community plugins**

---

## Quick start

Create a fenced code block with the `kanban` language tag:

````markdown
```kanban
query: FROM "Tasks" WHERE status != "archive"
columns: Backlog, In Progress, Done
group-by: status
```
````

That's it — you have a board.

### Timeline view

Create a fenced code block with the `timeline` language tag:

````markdown
```timeline
query: FROM "Tasks" WHERE status != "archive"
group-by: status
start-date-field: start-date
end-date-field: end-date
done-columns: done
```
````

Tasks are displayed as horizontal bars on a date axis. Colors indicate status:
- **Blue** — in progress (status matches `active-columns`, or start date is today/past if `active-columns` is not set)
- **Green** — completed (status matches `done-columns`)
- **Gray** — everything else

Tasks with only one date appear as diamond milestones. Tasks with no dates are listed in a separate section.

---

## Commands

| Command | Description |
|---|---|
| **Kaban: Insert Page Board** | Insert a kanban block for file-based cards |
| **Kaban: Insert Task Board (all vault)** | Insert a kanban block for checkbox tasks from the entire vault |
| **Kaban: Insert Timeline View** | Insert a timeline block for Gantt-chart visualization |
| **Kaban: Create new task** | Create a new task file from template in the default folder |
| **Kaban: Refresh all boards** | Force re-render all boards on the current page |

All commands are available in **Settings > Hotkeys** for custom keybindings.

---

## Settings

| Setting | Description | Default |
|---|---|---|
| **Default task folder** | Folder where "Create new task" puts new files | `Tasks` |
| **Template file** | Path to template file in vault (without `.md`), e.g. `Templates/Task` | *(empty)* |

The template is read as raw text. If [Templater](https://github.com/SilentVoid13/Templater) is enabled, its `<% %>` placeholders are processed automatically after file creation.

---

## Configuration reference — Kanban

| Field | Required | Description |
|---|---|---|
| `query` | yes | Dataview source + optional WHERE (`FROM "folder" WHERE ...`) |
| `columns` | yes | Comma-separated column names |
| `group-by` | yes | Field to group cards into columns |
| `source-type` | no | `pages` (default) or `tasks` |
| `sort-by` | no | Field to sort cards within columns |
| `filter-tags` | no | Comma-separated tags to filter cards |
| `show-fields` | no | Only show these fields on cards (including custom frontmatter fields) |
| `hide-fields` | no | Fields to hide: `project`, `due`, `priority`, `tags`, `checkbox`, `created` |
| `done-columns` | no | Columns treated as "done" (green styling, auto-check) |
| `active-columns` | no | Columns treated as "active/in-progress" (blue styling) |
| `show-done` | no | `true` (default) / `false` — hide done columns entirely |
| `created-field` | no | Frontmatter/inline field name for creation date |
| `completed-field` | no | Field to write completion date when task moves to done column |

## Configuration reference — Timeline

| Field | Required | Description |
|---|---|---|
| `query` | yes | Dataview source + optional WHERE |
| `group-by` | yes | Field used to determine task status (for color coding) |
| `start-date-field` | yes | Frontmatter/inline field name for task start date |
| `end-date-field` | yes | Frontmatter/inline field name for task end date |
| `source-type` | no | `pages` (default) or `tasks` |
| `sort-by` | no | Field to sort tasks in the timeline |
| `filter-tags` | no | Comma-separated tags to filter tasks |
| `done-columns` | no | Status values treated as "done" (green bars) |
| `active-columns` | no | Status values treated as "active/in-progress" (blue bars). Falls back to date-based heuristic if not set |
| `hide-no-dates` | no | `true` / `false` (default) — hide tasks without dates |
| `show-fields` | no | Fields to include on task metadata |
| `hide-fields` | no | Fields to exclude from task metadata |
| `created-field` | no | Field name for creation date |
| `completed-field` | no | Field name for completion date |

---

## WHERE expressions

The `query` field supports Dataview-style WHERE clauses:

```
query: FROM "Tasks" WHERE status != "archive" AND priority = "high"
query: FROM "Tasks" WHERE due >= date(today) AND contains(tags, "bug")
query: FROM "Tasks" WHERE (status = "todo" OR status = "in-progress") AND project = "Backend"
```

### Operators

`=` `!=` `>` `<` `>=` `<=` `AND` `OR` `!` (NOT) `+` `-` parentheses

### Functions

| Function | Description |
|---|---|
| `contains(field, value)` | Array/string containment check |
| `date(today)` / `date(now)` / `date(tomorrow)` / `date(yesterday)` | Date keywords |
| `date("2026-01-01")` | Parse date string |
| `dur("1d")` / `dur("2w")` | Duration literal |
| `length(field)` | Array or string length |
| `lower(field)` / `upper(field)` | Case conversion |
| `startswith(field, prefix)` / `endswith(field, suffix)` | String prefix/suffix |
| `regexmatch(field, pattern)` | Regex matching |
| `default(field, fallback)` | Fallback for null fields |

---

## Data sources

### Pages (default)

Each file = one card. Metadata from YAML frontmatter:

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

### Tasks

Checkbox items from markdown files. Metadata as inline fields:

```markdown
- [ ] Fix login bug [status:: todo] [priority:: high] [project:: Backend]
- [ ] Write tests [status:: in-progress] [due:: 2026-03-20]
- [x] Setup CI [status:: done]
```

Dataview task object properties are used as fallback when inline fields are absent.

---

## Examples

<details>
<summary><strong>Basic board with sorting</strong></summary>

````markdown
```kanban
query: FROM "Tasks" WHERE status != "archive"
columns: todo, in-progress, done
group-by: status
sort-by: priority
done-columns: done
active-columns: in-progress
created-field: created
```
````
</details>

<details>
<summary><strong>Eisenhower matrix</strong></summary>

````markdown
```kanban
query: FROM "Tasks" WHERE eisenhower != null AND status != "archive"
columns: important-urgent, important-not-urgent, not-important-urgent, not-important-not-urgent
group-by: eisenhower
sort-by: due
```
````
</details>

<details>
<summary><strong>All checkbox tasks from vault</strong></summary>

````markdown
```kanban
query: FROM ""
columns: todo, in-progress, done
group-by: status
source-type: tasks
sort-by: priority
done-columns: done
```
````
</details>

<details>
<summary><strong>Overdue tasks only</strong></summary>

````markdown
```kanban
query: FROM "Tasks" WHERE due <= date(today) AND status != "done"
columns: todo, in-progress, blocked
group-by: status
sort-by: due
```
````
</details>

<details>
<summary><strong>Tag-based filtering</strong></summary>

````markdown
```kanban
query: FROM "Tasks" WHERE contains(tags, "bug") AND status != "archive"
columns: todo, in-progress, done
group-by: status
sort-by: priority
done-columns: done
```
````
</details>

<details>
<summary><strong>Custom frontmatter fields with show-fields</strong></summary>

````markdown
```kanban
query: FROM "Tasks" WHERE status != "archive"
columns: todo, in-progress, done
group-by: status
show-fields: priority, due, assignee, sprint
done-columns: done
```
````

Shows only `priority`, `due`, and custom fields `assignee`, `sprint` from frontmatter. All other fields are hidden.
</details>

<details>
<summary><strong>Project timeline (Gantt chart)</strong></summary>

````markdown
```timeline
query: FROM "Tasks" WHERE status != "archive"
group-by: status
start-date-field: start-date
end-date-field: end-date
done-columns: done
active-columns: in-progress, wip
sort-by: start-date
```
````

Requires `start-date` and `end-date` fields in task frontmatter:

```yaml
---
status: in-progress
start-date: 2026-03-10
end-date: 2026-03-20
---
```
</details>

<details>
<summary><strong>Timeline with checkbox tasks</strong></summary>

````markdown
```timeline
query: FROM "Project Notes"
group-by: status
start-date-field: start-date
end-date-field: end-date
source-type: tasks
done-columns: done
hide-no-dates: true
```
````

Checkbox tasks use inline fields:

```markdown
- [ ] Sprint 1 [status:: in-progress] [start-date:: 2026-03-01] [end-date:: 2026-03-14]
- [x] Setup project [status:: done] [start-date:: 2026-02-20] [end-date:: 2026-02-28]
```
</details>

---

## Development

```bash
npm install
npm run dev       # watch mode
npm run build     # production build
npm test          # run tests
```

See [docs/releasing.md](docs/releasing.md) for the release process.

---

## Support the project

If you find Kaban useful, consider buying me a coffee:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/glebnaz)

---

## License

MIT
