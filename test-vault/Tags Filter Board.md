# Contains — фильтрация по тегам

## Только баги (contains в WHERE)

```kanban
query: FROM "Tasks" WHERE contains(tags, "bug") AND status != "archive"
columns: todo, in-progress, done
group-by: status
sort-by: priority
done-columns: done
created-field: created
```

## Backend-задачи через contains

```kanban
query: FROM "Tasks" WHERE contains(tags, "backend") AND status != "done" AND status != "archive"
columns: todo, in-progress, bloked, wip
group-by: status
sort-by: due
created-field: created
```
