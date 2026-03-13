# Eisenhower Matrix

Группировка по eisenhower-полю. WHERE исключает архивные задачи.

```kanban
query: FROM "Tasks" WHERE eisenhower != null AND status != "archive"
columns: important-urgent, important-not-urgent, not-important-urgent, not-important-not-urgent
group-by: eisenhower
sort-by: due
done-columns: done
created-field: created
```
