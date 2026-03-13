# Выпуск новой версии

## Автоматический процесс

При каждом merge/push в `main` GitHub Action автоматически:

1. Определяет тип версии по commit message:
   - `feat:` / `feat(...):`  → **minor** (0.2.0 → 0.3.0)
   - Всё остальное → **patch** (0.2.0 → 0.2.1)
2. Бампает версию в `package.json`, `manifest.json`, `versions.json`
3. Коммитит bump, создаёт git-тег
4. Создаёт GitHub Release с файлами `main.js`, `manifest.json`, `styles.css`

Коммит с `[skip ci]` в сообщении не запускает повторный workflow.

## Ручной bump (опционально)

Если нужно контролировать версию вручную:

```bash
npm version patch   # 0.2.0 → 0.2.1 (багфикс)
npm version minor   # 0.2.0 → 0.3.0 (новая фича)
npm version major   # 0.2.0 → 1.0.0 (breaking changes)
```

Эта команда автоматически:
- обновит `version` в `package.json`
- обновит `version` в `manifest.json`
- добавит запись в `versions.json`
- создаст git-коммит и тег

## Установка для пользователей

### Через BRAT (рекомендуется)
1. Установить плагин [BRAT](https://github.com/TfTHacker/obsidian42-brat) из community plugins
2. В настройках BRAT нажать "Add Beta Plugin"
3. Вставить URL репозитория

BRAT автоматически подхватывает новые релизы.

### Вручную
1. Скачать `main.js`, `manifest.json`, `styles.css` из последнего [Release](../../releases/latest)
2. Положить файлы в `.obsidian/plugins/kaban/`
3. Перезапустить Obsidian и включить плагин в настройках
