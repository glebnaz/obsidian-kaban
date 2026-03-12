# Выпуск новой версии

## Процесс

1. Создай ветку от `main` и сделай изменения
2. Когда всё готово, обнови версию:

```bash
npm version patch   # 0.1.0 → 0.1.1 (багфикс)
npm version minor   # 0.1.0 → 0.2.0 (новая фича)
npm version major   # 0.1.0 → 1.0.0 (breaking changes)
```

Эта команда автоматически:
- обновит `version` в `package.json`
- обновит `version` в `manifest.json`
- добавит запись в `versions.json`
- создаст git-коммит и тег

3. Запуш ветку и создай PR в `main`
4. После merge в `main` — GitHub Action автоматически создаст Release с файлами `main.js`, `manifest.json`, `styles.css`

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
