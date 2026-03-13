# WHERE Filter — исключаем архив

Доска с WHERE: показываем только задачи со статусом != "archive".

```kanban
query: FROM "Tasks" WHERE status != "archive"
columns: todo, in-progress, bloked, wip, done
group-by: status
sort-by: priority
done-columns: done
created-field: created
```

# WHERE + AND — только Backend, не архив

```kanban
query: FROM "Tasks" WHERE project = "Backend" AND status != "archive"
columns: todo, in-progress, bloked, wip, done
group-by: status
sort-by: priority
done-columns: done
created-field: created
```
