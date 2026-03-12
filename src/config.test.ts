import { parseKanbanConfig, KanbanConfig } from "./config";

describe("parseKanbanConfig", () => {
  const validSource = [
    "source: Tasks",
    'query: WHERE status != "archive"',
    "columns: Backlog, In Progress, Done",
    "group-by: status",
  ].join("\n");

  it("should parse a valid config with all required fields", () => {
    const result = parseKanbanConfig(validSource);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config).toEqual<KanbanConfig>({
      source: "Tasks",
      query: 'WHERE status != "archive"',
      sourceType: "pages",
      columns: ["Backlog", "In Progress", "Done"],
      groupBy: "status",
      sortBy: undefined,
      filterTags: undefined,
      hideFields: undefined,
      showDone: true,
    });
  });

  it("should parse all optional fields", () => {
    const source = [
      "source: Tasks",
      'query: WHERE status != "archive"',
      "columns: Backlog, In Progress, Done",
      "group-by: status",
      "source-type: pages",
      "sort-by: due",
      "filter-tags: work, urgent",
      "hide-fields: project, tags",
      "show-done: false",
    ].join("\n");

    const result = parseKanbanConfig(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.sortBy).toBe("due");
    expect(result.config.filterTags).toEqual(["work", "urgent"]);
    expect(result.config.hideFields).toEqual(["project", "tags"]);
    expect(result.config.showDone).toBe(false);
  });

  it("should return errors for missing required fields", () => {
    const result = parseKanbanConfig("source: Tasks");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('Missing required field: "query"');
    expect(result.errors).toContain('Missing required field: "columns"');
    expect(result.errors).toContain('Missing required field: "group-by"');
  });

  it("should return all missing fields at once", () => {
    const result = parseKanbanConfig("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(4);
  });

  it("should reject invalid source-type", () => {
    const source = [
      "source: Tasks",
      'query: WHERE status != "archive"',
      "columns: Backlog, Done",
      "group-by: status",
      "source-type: invalid",
    ].join("\n");

    const result = parseKanbanConfig(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain("Invalid source-type");
  });

  it("should skip blank lines and comments", () => {
    const source = [
      "# My board config",
      "",
      "source: Tasks",
      'query: WHERE status != "archive"',
      "# Columns setup",
      "columns: Backlog, Done",
      "group-by: status",
    ].join("\n");

    const result = parseKanbanConfig(source);
    expect(result.ok).toBe(true);
  });

  it("should handle keys case-insensitively", () => {
    const source = [
      "Source: Tasks",
      'Query: WHERE status != "archive"',
      "Columns: Backlog, Done",
      "Group-By: status",
    ].join("\n");

    const result = parseKanbanConfig(source);
    expect(result.ok).toBe(true);
  });

  it("should handle colons in values", () => {
    const source = [
      "source: Tasks",
      'query: WHERE status != "archive" AND due >= date(today)',
      "columns: Backlog, Done",
      "group-by: status",
    ].join("\n");

    const result = parseKanbanConfig(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.query).toBe('WHERE status != "archive" AND due >= date(today)');
  });

  it("should reject columns with empty value", () => {
    const source = [
      "source: Tasks",
      'query: WHERE status != "archive"',
      "columns: ,,,",
      "group-by: status",
    ].join("\n");

    const result = parseKanbanConfig(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain("at least one value");
  });

  it("should default source-type to pages", () => {
    const result = parseKanbanConfig(validSource);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.sourceType).toBe("pages");
  });

  it("should default show-done to true", () => {
    const result = parseKanbanConfig(validSource);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.showDone).toBe(true);
  });
});
