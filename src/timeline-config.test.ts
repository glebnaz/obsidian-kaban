import { parseTimelineConfig, TimelineConfig } from "./timeline-config";

describe("parseTimelineConfig", () => {
  const validSource = [
    'query: FROM "Tasks" WHERE status != "archive"',
    "group-by: status",
    "start-date-field: start-date",
    "end-date-field: end-date",
  ].join("\n");

  it("should parse a valid config with all required fields", () => {
    const result = parseTimelineConfig(validSource);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config).toEqual<TimelineConfig>({
      query: 'FROM "Tasks" WHERE status != "archive"',
      sourceType: "pages",
      groupBy: "status",
      startDateField: "start-date",
      endDateField: "end-date",
      sortBy: undefined,
      filterTags: undefined,
      doneColumns: [],
      activeColumns: [],
      hideNoDates: false,
      createdField: undefined,
      completedField: undefined,
      hideFields: undefined,
      showFields: undefined,
    });
  });

  it("should parse all optional fields", () => {
    const source = [
      'query: FROM "Tasks"',
      "group-by: status",
      "start-date-field: start-date",
      "end-date-field: end-date",
      "source-type: tasks",
      "sort-by: priority",
      "filter-tags: bug, feature",
      "done-columns: done, completed",
      "active-columns: in-progress, wip",
      "hide-no-dates: true",
      "created-field: created",
      "completed-field: completed-at",
      "hide-fields: project",
      "show-fields: priority, due",
    ].join("\n");

    const result = parseTimelineConfig(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.sourceType).toBe("tasks");
    expect(result.config.sortBy).toBe("priority");
    expect(result.config.filterTags).toEqual(["bug", "feature"]);
    expect(result.config.doneColumns).toEqual(["done", "completed"]);
    expect(result.config.activeColumns).toEqual(["in-progress", "wip"]);
    expect(result.config.hideNoDates).toBe(true);
    expect(result.config.createdField).toBe("created");
    expect(result.config.completedField).toBe("completed-at");
    expect(result.config.hideFields).toEqual(["project"]);
    expect(result.config.showFields).toEqual(["priority", "due"]);
  });

  it("should return errors for missing required fields", () => {
    const result = parseTimelineConfig("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('Missing required field: "query"');
    expect(result.errors).toContain('Missing required field: "group-by"');
    expect(result.errors).toContain('Missing required field: "start-date-field"');
    expect(result.errors).toContain('Missing required field: "end-date-field"');
  });

  it("should return all missing fields at once", () => {
    const result = parseTimelineConfig("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(4);
  });

  it("should reject invalid source-type", () => {
    const source = [
      'query: FROM "Tasks"',
      "group-by: status",
      "start-date-field: start-date",
      "end-date-field: end-date",
      "source-type: invalid",
    ].join("\n");

    const result = parseTimelineConfig(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain("Invalid source-type");
  });

  it("should skip blank lines and comments", () => {
    const source = [
      "# Timeline config",
      "",
      'query: FROM "Tasks"',
      "# Group setting",
      "group-by: status",
      "start-date-field: start-date",
      "end-date-field: end-date",
    ].join("\n");

    const result = parseTimelineConfig(source);
    expect(result.ok).toBe(true);
  });

  it("should handle keys case-insensitively", () => {
    const source = [
      'Query: FROM "Tasks"',
      "Group-By: status",
      "Start-Date-Field: start-date",
      "End-Date-Field: end-date",
    ].join("\n");

    const result = parseTimelineConfig(source);
    expect(result.ok).toBe(true);
  });

  it("should default source-type to pages", () => {
    const result = parseTimelineConfig(validSource);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.sourceType).toBe("pages");
  });

  it("should default hideNoDates to false", () => {
    const result = parseTimelineConfig(validSource);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.hideNoDates).toBe(false);
  });

  it("should default doneColumns to empty array", () => {
    const result = parseTimelineConfig(validSource);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.doneColumns).toEqual([]);
  });

  it("should handle colons in query values", () => {
    const source = [
      'query: FROM "Tasks" WHERE due >= date(today)',
      "group-by: status",
      "start-date-field: start-date",
      "end-date-field: end-date",
    ].join("\n");

    const result = parseTimelineConfig(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.query).toBe('FROM "Tasks" WHERE due >= date(today)');
  });
});
