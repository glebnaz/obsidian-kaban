# Kaban — Obsidian Kanban Plugin

Obsidian-плагин для отображения канбан-досок и timeline из code-блоков, используя Dataview как data layer.

## Команды

- `npm run dev` — watch-режим для разработки
- `npm run build` — production-сборка (main.js)
- `npm test` — запуск тестов (Jest)
- `npm version patch|minor|major` — bump версии в package.json, manifest.json, versions.json + git tag

## Архитектура

```
src/
├── main.ts                — точка входа, регистрация code block processor и команд для ```kanban и ```timeline
├── config.ts              — парсинг и валидация конфигурации kanban; shared утилиты parseRawLines, splitCommaSeparated
├── dataview.ts            — загрузка данных через Dataview API, группировка в колонки (KanbanCard с startDate/endDate)
├── where.ts               — парсер WHERE выражений (tokenizer + recursive descent + evaluator)
├── rendering.ts           — HTML-рендеринг канбан-доски, колонок и карточек
├── cardactions.ts         — обработчики кликов (открытие файла, toggle чекбокса)
├── dragdrop.ts            — drag-and-drop через SortableJS
├── timeline-config.ts     — парсинг и валидация конфигурации timeline (TimelineConfig)
├── timeline.ts            — загрузка данных для timeline, resolveColor, computeDateRange
├── timeline-rendering.ts  — HTML-рендеринг Gantt-chart timeline
└── __mocks__/             — моки Obsidian API для тестов
```

### Пайплайн рендеринга — Kanban

```
Code block → parseKanbanConfig → getDataviewApi → loadBoard
  → splitQuery (source + WHERE) → api.pages(source) → parseWhere → filter pages
  → fetchPages/fetchTasks → groupIntoColumns → filterByTags → sortCards
  → renderBoard → renderColumn → renderCard
  → initSortableOnColumns → initCardActions → subscribeToMetadataChange
```

### Пайплайн рендеринга — Timeline

```
Code block → parseTimelineConfig → getDataviewApi → loadTimeline
  → fetchPages/fetchTasks (с DateFieldOpts для start/end date)
  → filterByTags → sortCards → разделение на items/noDateItems
  → resolveColor (green=done, blue=in-progress, gray=not-started)
  → computeDateRange → renderTimeline → renderTimelineHeader → renderTimelineRow → renderTimelineBar
  → initTimelineActions → subscribeToMetadataChange
```

## Два типа источников данных

### 1. Pages (по умолчанию)
Каждый файл = карточка. Метаданные из frontmatter:
```yaml
---
status: todo
priority: high
due: 2026-03-15
project: Backend
tags: [bug, urgent]
start-date: 2026-03-10
end-date: 2026-03-15
---
```

### 2. Tasks (checkbox)
Чекбоксы из markdown с inline-полями:
```markdown
- [ ] Buy milk [status:: todo] [priority:: high] [start-date:: 2026-03-10] [end-date:: 2026-03-12]
- [x] Done task [status:: done]
```

## Формат code block — Kanban

```
query: FROM "Tasks" WHERE status != "archive"
columns: Backlog, In Progress, Done
group-by: status
source-type: pages|tasks
sort-by: priority
filter-tags: bug, feature
hide-fields: project
done-columns: Done
active-columns: In Progress
show-done: true|false
created-field: created
```

Обязательные поля: `query`, `columns`, `group-by`.

## Формат code block — Timeline

```
query: FROM "Tasks" WHERE status != "archive"
group-by: status
start-date-field: start-date
end-date-field: end-date
source-type: pages|tasks
sort-by: start-date
done-columns: done
active-columns: in-progress, wip
hide-no-dates: false
filter-tags: bug, feature
```

Обязательные поля: `query`, `group-by`, `start-date-field`, `end-date-field`.

### Цветовая логика (общая для Kanban и Timeline)

1. Статус в `done-columns` → **зелёный** (завершена)
2. Статус в `active-columns` → **синий** (в процессе)
3. Иначе → **серый** (не начата)

Если `active-columns` не указан в Timeline — fallback на дату: startDate <= сегодня → синий.

## Ключевые паттерны

- **Board isolation** — каждый code block получает уникальный boardId (инкрементный счётчик), несколько досок в одной заметке работают независимо
- **Two-way sync** — изменения файлов обновляют доску (подписка на `dataview:metadata-change` с debounce 300ms), drag-drop обновляет файлы (через `processFrontMatter` / `vault.process`)
- **Safe clicks** — флаг `isDragging` предотвращает случайные клики во время drag
- **Column color coding** — `done-columns` подсвечиваются зелёным, `active-columns` синим; при перетаскивании checkbox-карточки в done-колонку чекбокс автоматически отмечается, при перетаскивании из — снимается
- **Status toggle** — file cards: Done ↔ Backlog; checkbox cards: `- [ ]` ↔ `- [x]`
- **Inline field parsing** — regex `\[field::\s*value\]` для извлечения метаданных из текста задач с fallback на Dataview task properties
- **WHERE parser** — tokenizer + recursive descent parser для Dataview WHERE выражений; splitQuery разделяет source (для dv.pages) и WHERE (JS-фильтр); поддерживает операторы сравнения, AND/OR/NOT, функции (contains, date, length и др.)
- **Commands/Hotkeys** — Insert Page Board, Insert Task Board, Insert Timeline View, Refresh all boards — доступны в Settings → Hotkeys
- **Shared config parsing** — `parseRawLines()` и `splitCommaSeparated()` из config.ts переиспользуются timeline-config.ts
- **DateFieldOpts** — опциональный параметр для fetchPages/fetchTasks, позволяющий timeline извлекать start/end date из Dataview без дублирования кода

## Стили

- **Kanban:** Flexbox горизонтальный скролл, колонки 280px; ghost/chosen/drag состояния для SortableJS; цветовая индикация due date
- **Timeline:** Gantt-chart layout; горизонтальные бары с процентным позиционированием; milestone-маркеры (diamond); today-линия; секция "No dates"
- Используются CSS-переменные Obsidian (`--background-primary`, `--text-accent` и т.д.)

## Тесты

Jest + ts-jest. Тесты зеркалят структуру src/ (`*.test.ts`). Моки для Obsidian API и SortableJS.

## Test Vault

`test-vault/` — примеры досок, timeline и задач для ручного тестирования в Obsidian.

## Релиз

См. [docs/releasing.md](docs/releasing.md). GitHub Action автоматически создаёт Release при merge в main.
