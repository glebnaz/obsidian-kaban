import { parseWhere, splitQuery, tokenize, isTruthy, toComparable } from "./where";

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

describe("parseWhere", () => {
  it("should return null for empty expression", () => {
    expect(parseWhere("")).toBeNull();
    expect(parseWhere("  ")).toBeNull();
  });

  describe("simple comparisons", () => {
    it("should filter by equality", () => {
      const filter = parseWhere('status = "todo"')!;
      expect(filter({ status: "todo" })).toBe(true);
      expect(filter({ status: "done" })).toBe(false);
    });

    it("should filter by inequality", () => {
      const filter = parseWhere('status != "archive"')!;
      expect(filter({ status: "todo" })).toBe(true);
      expect(filter({ status: "archive" })).toBe(false);
    });

    it("should compare numbers", () => {
      const filter = parseWhere("priority > 3")!;
      expect(filter({ priority: 5 })).toBe(true);
      expect(filter({ priority: 2 })).toBe(false);
      expect(filter({ priority: 3 })).toBe(false);
    });

    it("should handle >=", () => {
      const filter = parseWhere("priority >= 3")!;
      expect(filter({ priority: 3 })).toBe(true);
      expect(filter({ priority: 2 })).toBe(false);
    });

    it("should handle <=", () => {
      const filter = parseWhere("priority <= 3")!;
      expect(filter({ priority: 3 })).toBe(true);
      expect(filter({ priority: 4 })).toBe(false);
    });

    it("should handle <", () => {
      const filter = parseWhere("priority < 3")!;
      expect(filter({ priority: 2 })).toBe(true);
      expect(filter({ priority: 3 })).toBe(false);
    });
  });

  describe("null comparisons", () => {
    it("should handle null equality", () => {
      const filter = parseWhere("status = null")!;
      expect(filter({ status: null })).toBe(true);
      expect(filter({ status: "todo" })).toBe(false);
      expect(filter({})).toBe(true); // undefined treated as null
    });

    it("should handle null inequality", () => {
      const filter = parseWhere("status != null")!;
      expect(filter({ status: "todo" })).toBe(true);
      expect(filter({ status: null })).toBe(false);
    });
  });

  describe("boolean comparisons", () => {
    it("should handle true/false", () => {
      const filter = parseWhere("completed = true")!;
      expect(filter({ completed: true })).toBe(true);
      expect(filter({ completed: false })).toBe(false);
    });
  });

  describe("logical operators", () => {
    it("should handle AND", () => {
      const filter = parseWhere('status != "done" AND priority = "high"')!;
      expect(filter({ status: "todo", priority: "high" })).toBe(true);
      expect(filter({ status: "done", priority: "high" })).toBe(false);
      expect(filter({ status: "todo", priority: "low" })).toBe(false);
    });

    it("should handle OR", () => {
      const filter = parseWhere('status = "todo" OR status = "in-progress"')!;
      expect(filter({ status: "todo" })).toBe(true);
      expect(filter({ status: "in-progress" })).toBe(true);
      expect(filter({ status: "done" })).toBe(false);
    });

    it("should handle AND + OR with correct precedence", () => {
      // AND binds tighter than OR
      const filter = parseWhere('status = "done" OR status = "todo" AND priority = "high"')!;
      // This is: done OR (todo AND high)
      expect(filter({ status: "done", priority: "low" })).toBe(true);
      expect(filter({ status: "todo", priority: "high" })).toBe(true);
      expect(filter({ status: "todo", priority: "low" })).toBe(false);
    });

    it("should handle parentheses", () => {
      const filter = parseWhere('(status = "done" OR status = "todo") AND priority = "high"')!;
      expect(filter({ status: "done", priority: "high" })).toBe(true);
      expect(filter({ status: "todo", priority: "high" })).toBe(true);
      expect(filter({ status: "done", priority: "low" })).toBe(false);
    });

    it("should handle NOT", () => {
      const filter = parseWhere('!status = "done"')!;
      expect(filter({ status: "todo" })).toBe(true);
      expect(filter({ status: "done" })).toBe(false);
    });
  });

  describe("field access", () => {
    it("should access nested fields", () => {
      const filter = parseWhere('file.name = "test"')!;
      expect(filter({ file: { name: "test" } })).toBe(true);
      expect(filter({ file: { name: "other" } })).toBe(false);
    });

    it("should handle missing nested fields", () => {
      const filter = parseWhere("file.name != null")!;
      expect(filter({ file: { name: "test" } })).toBe(true);
      expect(filter({})).toBe(false);
    });
  });

  describe("functions", () => {
    it("should evaluate contains() on arrays", () => {
      const filter = parseWhere('contains(tags, "#bug")')!;
      expect(filter({ tags: ["#bug", "#feature"] })).toBe(true);
      expect(filter({ tags: ["#feature"] })).toBe(false);
    });

    it("should evaluate contains() on Dataview arrays (.values)", () => {
      const filter = parseWhere('contains(tags, "#bug")')!;
      expect(filter({ tags: { values: ["#bug", "#other"] } })).toBe(true);
    });

    it("should evaluate contains() on strings", () => {
      const filter = parseWhere('contains(title, "report")')!;
      expect(filter({ title: "Monthly Report" })).toBe(true);
      expect(filter({ title: "Notes" })).toBe(false);
    });

    it("should evaluate length()", () => {
      const filter = parseWhere("length(tags) > 0")!;
      expect(filter({ tags: ["a", "b"] })).toBe(true);
      expect(filter({ tags: [] })).toBe(false);
    });

    it("should evaluate date(today)", () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const filter = parseWhere("due >= date(today)")!;
      expect(filter({ due: todayStr })).toBe(true);
      expect(filter({ due: "2020-01-01" })).toBe(false);
    });

    it("should evaluate date(tomorrow)", () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const tomorrowStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const filter = parseWhere("due >= date(tomorrow)")!;
      expect(filter({ due: tomorrowStr })).toBe(true);
      expect(filter({ due: "2020-01-01" })).toBe(false);
    });

    it("should evaluate date() with string arg", () => {
      const filter = parseWhere('due >= date("2026-01-01")')!;
      expect(filter({ due: "2026-06-15" })).toBe(true);
      expect(filter({ due: "2025-06-15" })).toBe(false);
    });

    it("should evaluate lower()", () => {
      const filter = parseWhere('lower(status) = "todo"')!;
      expect(filter({ status: "TODO" })).toBe(true);
      expect(filter({ status: "Todo" })).toBe(true);
    });

    it("should evaluate startswith()", () => {
      const filter = parseWhere('startswith(file.name, "project")')!;
      expect(filter({ file: { name: "Project Alpha" } })).toBe(true);
      expect(filter({ file: { name: "Notes" } })).toBe(false);
    });

    it("should evaluate regexmatch()", () => {
      const filter = parseWhere('regexmatch(title, "^[A-Z].*report$")')!;
      expect(filter({ title: "Monthly report" })).toBe(true);
      expect(filter({ title: "notes" })).toBe(false);
    });

    it("should evaluate default()", () => {
      const filter = parseWhere('default(priority, "low") = "low"')!;
      expect(filter({})).toBe(true);
      expect(filter({ priority: "high" })).toBe(false);
    });
  });

  describe("real-world Dataview expressions", () => {
    it('eisenhower matrix filter', () => {
      const filter = parseWhere('eisenhower = "important-not-urgent" AND status != "done"')!;
      expect(filter({ eisenhower: "important-not-urgent", status: "todo" })).toBe(true);
      expect(filter({ eisenhower: "important-not-urgent", status: "done" })).toBe(false);
      expect(filter({ eisenhower: "urgent", status: "todo" })).toBe(false);
    });

    it('date + status filter', () => {
      const filter = parseWhere('due >= date(today) AND status != "archive"')!;
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(filter({ due: futureDate.toISOString().slice(0, 10), status: "todo" })).toBe(true);
      expect(filter({ due: "2020-01-01", status: "todo" })).toBe(false);
    });

    it('contains with tags', () => {
      const filter = parseWhere('contains(file.tags, "#project") AND status = "in-progress"')!;
      expect(filter({
        file: { tags: { values: ["#project", "#work"] } },
        status: "in-progress",
      })).toBe(true);
    });

    it('complex OR/AND', () => {
      const filter = parseWhere(
        '(status = "todo" OR status = "in-progress") AND priority != "low" AND due != null'
      )!;
      expect(filter({ status: "todo", priority: "high", due: "2026-06-01" })).toBe(true);
      expect(filter({ status: "todo", priority: "low", due: "2026-06-01" })).toBe(false);
      expect(filter({ status: "done", priority: "high", due: "2026-06-01" })).toBe(false);
      expect(filter({ status: "todo", priority: "high" })).toBe(false); // due is null
    });
  });
});

describe("tokenize", () => {
  it("should tokenize a simple expression", () => {
    const tokens = tokenize('status != "done"');
    expect(tokens.map((t) => t.type)).toEqual(["IDENT", "NEQ", "STRING", "EOF"]);
  });

  it("should handle negative numbers", () => {
    const tokens = tokenize("priority > -1");
    expect(tokens.map((t) => t.type)).toEqual(["IDENT", "GT", "NUMBER", "EOF"]);
    expect(tokens[2].value).toBe("-1");
  });
});

describe("toComparable", () => {
  it("should handle Dataview date objects with .ts", () => {
    const result = toComparable({ ts: 1234567890 });
    expect(result).toBe(1234567890);
  });

  it("should parse date strings", () => {
    const result = toComparable("2026-01-15");
    expect(typeof result).toBe("number");
  });

  it("should handle null", () => {
    expect(toComparable(null)).toBeNull();
    expect(toComparable(undefined)).toBeNull();
  });
});

describe("isTruthy", () => {
  it("should handle falsy values", () => {
    expect(isTruthy(null)).toBe(false);
    expect(isTruthy(undefined)).toBe(false);
    expect(isTruthy(false)).toBe(false);
    expect(isTruthy(0)).toBe(false);
    expect(isTruthy("")).toBe(false);
  });

  it("should handle truthy values", () => {
    expect(isTruthy(true)).toBe(true);
    expect(isTruthy(1)).toBe(true);
    expect(isTruthy("text")).toBe(true);
    expect(isTruthy([])).toBe(true);
  });
});
