# Project Timeline

```timeline
query: FROM "Tasks" WHERE status != "archive"
group-by: status
start-date-field: start-date
end-date-field: end-date
done-columns: done
active-columns: in-progress, wip
sort-by: start-date
hide-no-dates: false
```

## Notes

This timeline shows all tasks from the Tasks folder as a Gantt chart.
- **Blue bars** — tasks in progress (start date in the past)
- **Green bars** — completed tasks
- **Gray bars** — not yet started (start date in the future)
- **Diamonds** — milestones (only one date set)
