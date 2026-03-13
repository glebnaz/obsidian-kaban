# Due Date Boards

## Просроченные + сегодня (due <= today)

```kanban
query: FROM "Tasks" WHERE due <= date(today) AND status != "archive" AND status != "done"
columns: todo, in-progress, bloked, wip
group-by: status
sort-by: due
created-field: created
```

## Предстоящие (due > today)

```kanban
query: FROM "Tasks" WHERE due > date(today) AND status != "archive"
columns: todo, in-progress, bloked, wip, done
group-by: status
sort-by: due
created-field: created
```
