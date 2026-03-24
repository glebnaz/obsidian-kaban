import { splitQuery } from "./where";

describe("splitQuery", () => {
  it("should split FROM source and WHERE clause", () => {
    const result = splitQuery('FROM "Tasks" WHERE status != "archive"');
    expect(result).toEqual({ source: '"Tasks"', where: 'status != "archive"' });
  });

  it("should handle query with only source", () => {
    const result = splitQuery('FROM "Tasks"');
    expect(result).toEqual({ source: '"Tasks"', where: "" });
  });

  it("should handle query without FROM", () => {
    const result = splitQuery('"Tasks"');
    expect(result).toEqual({ source: '"Tasks"', where: "" });
  });

  it("should handle empty source with WHERE", () => {
    const result = splitQuery('FROM "" WHERE status = "todo"');
    expect(result).toEqual({ source: '""', where: 'status = "todo"' });
  });

  it("should not split on WHERE inside quotes", () => {
    const result = splitQuery('FROM "WHERE things" WHERE x = 1');
    expect(result).toEqual({ source: '"WHERE things"', where: "x = 1" });
  });

  it("should handle complex WHERE with AND/OR", () => {
    const result = splitQuery('FROM "04 Archive" WHERE eisenhower = "important" AND status != "done"');
    expect(result).toEqual({
      source: '"04 Archive"',
      where: 'eisenhower = "important" AND status != "done"',
    });
  });
});
