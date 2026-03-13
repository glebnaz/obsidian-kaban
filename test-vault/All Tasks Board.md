# All Tasks (Checkbox) — весь vault

Дефолтная доска задач со всего vault. `source-type: tasks` — ищет чекбоксы.

```kanban
query: FROM ""
columns: todo, in-progress, done
group-by: status
source-type: tasks
sort-by: priority
done-columns: done
created-field: created
```
