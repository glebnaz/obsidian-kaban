# My Kanban Board

```kanban
query: FROM "Tasks" WHERE status != "archive"
columns: todo, in-progress, bloked, wip, done
group-by: status
sort-by: priority
done-columns: done
created-field: created
```

## Notes

This board shows all tasks from the Tasks folder, grouped by status.
