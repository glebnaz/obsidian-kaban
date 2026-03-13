# Kaban — Obsidian Kanban Plugin

Obsidian-плагин для отображения канбан-досок из code-блоков, используя Dataview как data layer.

## Команды

- `npm run dev` — watch-режим для разработки
- `npm run build` — production-сборка (main.js)
- `npm test` — запуск тестов (Jest)
- `npm version patch|minor|major` — bump версии в package.json, manifest.json, versions.json + git tag

## Архитектура

```
src/
├── main.ts          — точка входа, регистрация code block processor и команд для ```kanban
├── config.ts        — парсинг и валидация конфигурации из code block
├── dataview.ts      — загрузка данных через Dataview API, группировка в колонки
├── where.ts         — парсер WHERE выражений (tokenizer + recursive descent + evaluator)
├── rendering.ts     — HTML-рендеринг доски, колонок и карточек
├── cardactions.ts   — обработчики кликов (открытие файла, toggle чекбокса)
├── dragdrop.ts      — drag-and-drop через SortableJS
└── __mocks__/       — моки Obsidian API для тестов
```

### Пайплайн рендеринга

```
Code block → parseKanbanConfig → getDataviewApi → loadBoard
  → splitQuery (source + WHERE) → api.pages(source) → parseWhere → filter pages
  → fetchPages/fetchTasks → groupIntoColumns → filterByTags → sortCards
  → renderBoard → renderColumn → renderCard
  → initSortableOnColumns → initCardActions → subscribeToMetadataChange
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
---
```

### 2. Tasks (checkbox)
Чекбоксы из markdown с inline-полями:
```markdown
- [ ] Buy milk [status:: todo] [priority:: high] [project:: ProjectX]
- [x] Done task [status:: done]
```

## Формат code block

```
query: FROM "Tasks" WHERE status != "archive"
columns: Backlog, In Progress, Done
group-by: status
source-type: pages|tasks
sort-by: priority
filter-tags: bug, feature
hide-fields: project
done-columns: Done
show-done: true|false
created-field: created
```

Обязательные поля: `query`, `columns`, `group-by`.

## Ключевые паттерны

- **Board isolation** — каждый code block получает уникальный boardId (инкрементный счётчик), несколько досок в одной заметке работают независимо
- **Two-way sync** — изменения файлов обновляют доску (подписка на `dataview:metadata-change` с debounce 300ms), drag-drop обновляет файлы (через `processFrontMatter` / `vault.process`)
- **Safe clicks** — флаг `isDragging` предотвращает случайные клики во время drag
- **Done columns** — колонки из `done-columns` подсвечиваются зелёным; при перетаскивании checkbox-карточки в done-колонку чекбокс автоматически отмечается, при перетаскивании из — снимается
- **Status toggle** — file cards: Done ↔ Backlog; checkbox cards: `- [ ]` ↔ `- [x]`
- **Inline field parsing** — regex `\[field::\s*value\]` для извлечения метаданных из текста задач с fallback на Dataview task properties
- **WHERE parser** — tokenizer + recursive descent parser для Dataview WHERE выражений; splitQuery разделяет source (для dv.pages) и WHERE (JS-фильтр); поддерживает операторы сравнения, AND/OR/NOT, функции (contains, date, length и др.)
- **Commands/Hotkeys** — Insert Page Board, Insert Task Board (all vault), Refresh all boards — доступны в Settings → Hotkeys

## Стили

- Flexbox горизонтальный скролл, колонки 280px
- Ghost/chosen/drag состояния для SortableJS
- Цветовая индикация due date: красный = просрочено, оранжевый = сегодня
- Тег-пиллы, hover-эффекты
- Используются CSS-переменные Obsidian (`--background-primary`, `--text-accent` и т.д.)

## Тесты

Jest + ts-jest. Тесты зеркалят структуру src/ (`*.test.ts`). Моки для Obsidian API и SortableJS.

## Test Vault

`test-vault/` — примеры досок и задач для ручного тестирования в Obsidian.

## Релиз

См. [docs/releasing.md](docs/releasing.md). GitHub Action автоматически создаёт Release при merge в main.
