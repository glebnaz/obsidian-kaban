/**
 * Dataview WHERE expression parser and evaluator.
 *
 * Supports:
 *  - Comparisons: =, !=, >, <, >=, <=
 *  - Logical: AND, OR, ! (NOT)
 *  - Parentheses
 *  - String/number/boolean/null literals
 *  - Field access: field, file.name, file.path
 *  - Functions: contains(), length(), date(), number(), lower(), upper()
 *  - date(today), date(now), date("2026-01-01")
 *  - Array membership: contains(tags, "#bug")
 */

// ── Tokens ──────────────────────────────────────────────────

type TokenType =
  | "STRING"
  | "NUMBER"
  | "IDENT"
  | "DOT"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "AND"
  | "OR"
  | "NOT"
  | "EQ"
  | "NEQ"
  | "GTE"
  | "LTE"
  | "GT"
  | "LT"
  | "TRUE"
  | "FALSE"
  | "NULL"
  | "EOF";

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    // String literal (double or single quotes)
    if (input[i] === '"' || input[i] === "'") {
      const quote = input[i];
      i++;
      let str = "";
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\" && i + 1 < input.length) {
          i++;
          str += input[i];
        } else {
          str += input[i];
        }
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: "STRING", value: str });
      continue;
    }

    // Number
    if (/\d/.test(input[i]) || (input[i] === "-" && i + 1 < input.length && /\d/.test(input[i + 1]))) {
      let num = input[i];
      i++;
      while (i < input.length && /[\d.]/.test(input[i])) {
        num += input[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: num });
      continue;
    }

    // Two-char operators
    if (i + 1 < input.length) {
      const two = input[i] + input[i + 1];
      if (two === "!=") {
        tokens.push({ type: "NEQ", value: "!=" });
        i += 2;
        continue;
      }
      if (two === ">=") {
        tokens.push({ type: "GTE", value: ">=" });
        i += 2;
        continue;
      }
      if (two === "<=") {
        tokens.push({ type: "LTE", value: "<=" });
        i += 2;
        continue;
      }
    }

    // Single-char operators
    if (input[i] === "=") {
      tokens.push({ type: "EQ", value: "=" });
      i++;
      continue;
    }
    if (input[i] === ">") {
      tokens.push({ type: "GT", value: ">" });
      i++;
      continue;
    }
    if (input[i] === "<") {
      tokens.push({ type: "LT", value: "<" });
      i++;
      continue;
    }
    if (input[i] === "!") {
      tokens.push({ type: "NOT", value: "!" });
      i++;
      continue;
    }
    if (input[i] === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (input[i] === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }
    if (input[i] === ",") {
      tokens.push({ type: "COMMA", value: "," });
      i++;
      continue;
    }
    if (input[i] === ".") {
      tokens.push({ type: "DOT", value: "." });
      i++;
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_#]/.test(input[i])) {
      let ident = "";
      // Allow # at start for tags, then alphanumeric/underscore/hyphen/slash
      while (i < input.length && /[a-zA-Z0-9_\-/#]/.test(input[i])) {
        ident += input[i];
        i++;
      }
      const upper = ident.toUpperCase();
      if (upper === "AND") {
        tokens.push({ type: "AND", value: "AND" });
      } else if (upper === "OR") {
        tokens.push({ type: "OR", value: "OR" });
      } else if (upper === "NOT") {
        tokens.push({ type: "NOT", value: "!" });
      } else if (upper === "TRUE") {
        tokens.push({ type: "TRUE", value: "true" });
      } else if (upper === "FALSE") {
        tokens.push({ type: "FALSE", value: "false" });
      } else if (upper === "NULL" || upper === "NONE") {
        tokens.push({ type: "NULL", value: "null" });
      } else {
        tokens.push({ type: "IDENT", value: ident });
      }
      continue;
    }

    // Unknown char — skip
    i++;
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

// ── AST Nodes ───────────────────────────────────────────────

type ASTNode =
  | { kind: "literal"; value: any }
  | { kind: "field"; path: string[] }
  | { kind: "compare"; op: string; left: ASTNode; right: ASTNode }
  | { kind: "and"; left: ASTNode; right: ASTNode }
  | { kind: "or"; left: ASTNode; right: ASTNode }
  | { kind: "not"; expr: ASTNode }
  | { kind: "call"; name: string; args: ASTNode[] };

// ── Parser ──────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  private expect(type: TokenType): Token {
    const t = this.peek();
    if (t.type !== type) {
      throw new Error(`WHERE parse error: expected ${type}, got ${t.type} ("${t.value}")`);
    }
    return this.advance();
  }

  parse(): ASTNode {
    const node = this.parseOr();
    if (this.peek().type !== "EOF") {
      throw new Error(`WHERE parse error: unexpected token "${this.peek().value}"`);
    }
    return node;
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.peek().type === "OR") {
      this.advance();
      const right = this.parseAnd();
      left = { kind: "or", left, right };
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseNot();
    while (this.peek().type === "AND") {
      this.advance();
      const right = this.parseNot();
      left = { kind: "and", left, right };
    }
    return left;
  }

  private parseNot(): ASTNode {
    if (this.peek().type === "NOT") {
      this.advance();
      const expr = this.parseNot();
      return { kind: "not", expr };
    }
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    const left = this.parsePrimary();
    const t = this.peek();
    if (
      t.type === "EQ" ||
      t.type === "NEQ" ||
      t.type === "GT" ||
      t.type === "LT" ||
      t.type === "GTE" ||
      t.type === "LTE"
    ) {
      this.advance();
      const right = this.parsePrimary();
      return { kind: "compare", op: t.value, left, right };
    }
    return left;
  }

  private parsePrimary(): ASTNode {
    const t = this.peek();

    if (t.type === "LPAREN") {
      this.advance();
      const expr = this.parseOr();
      this.expect("RPAREN");
      return expr;
    }

    if (t.type === "STRING") {
      this.advance();
      return { kind: "literal", value: t.value };
    }

    if (t.type === "NUMBER") {
      this.advance();
      return { kind: "literal", value: parseFloat(t.value) };
    }

    if (t.type === "TRUE") {
      this.advance();
      return { kind: "literal", value: true };
    }

    if (t.type === "FALSE") {
      this.advance();
      return { kind: "literal", value: false };
    }

    if (t.type === "NULL") {
      this.advance();
      return { kind: "literal", value: null };
    }

    if (t.type === "IDENT") {
      this.advance();
      const name = t.value;

      // Function call?
      if (this.peek().type === "LPAREN") {
        this.advance(); // skip (
        const args: ASTNode[] = [];
        if (this.peek().type !== "RPAREN") {
          args.push(this.parseOr());
          while (this.peek().type === "COMMA") {
            this.advance();
            args.push(this.parseOr());
          }
        }
        this.expect("RPAREN");
        return { kind: "call", name: name.toLowerCase(), args };
      }

      // Field access with dots
      const path = [name];
      while (this.peek().type === "DOT") {
        this.advance();
        const next = this.expect("IDENT");
        path.push(next.value);
      }
      return { kind: "field", path };
    }

    throw new Error(`WHERE parse error: unexpected token "${t.value}" (${t.type})`);
  }
}

// ── Evaluator ───────────────────────────────────────────────

function resolveFieldValue(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current == null) return undefined;
    current = current[key];
    // Dataview wraps some values; unwrap .values arrays and Link objects
    if (current != null && typeof current === "object") {
      if (current.path !== undefined && current.display !== undefined) {
        // It's a Dataview Link object — use its path
        current = current.path;
      }
    }
  }
  return current;
}

function toComparable(val: any): string | number | boolean | null {
  if (val == null) return null;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val;
  // Dataview date objects have .ts (timestamp)
  if (typeof val === "object" && val.ts != null) return val.ts;
  // Dataview Duration
  if (typeof val === "object" && val.milliseconds != null) return val.milliseconds;
  const s = String(val);
  // Try parsing as date
  const d = new Date(s);
  if (!isNaN(d.getTime()) && /\d{4}/.test(s)) return d.getTime();
  // Try as number
  const n = Number(s);
  if (!isNaN(n) && s.trim() !== "") return n;
  return s.toLowerCase();
}

function toArray(val: any): any[] {
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  if (val.values && Array.isArray(val.values)) return val.values;
  return [val];
}

function evaluate(node: ASTNode, ctx: any): any {
  switch (node.kind) {
    case "literal":
      return node.value;

    case "field":
      return resolveFieldValue(ctx, node.path);

    case "and":
      return isTruthy(evaluate(node.left, ctx)) && isTruthy(evaluate(node.right, ctx));

    case "or":
      return isTruthy(evaluate(node.left, ctx)) || isTruthy(evaluate(node.right, ctx));

    case "not":
      return !isTruthy(evaluate(node.expr, ctx));

    case "compare": {
      const leftRaw = evaluate(node.left, ctx);
      const rightRaw = evaluate(node.right, ctx);
      const left = toComparable(leftRaw);
      const right = toComparable(rightRaw);

      // null-safe equality
      if (left === null || right === null) {
        if (node.op === "=") return left === right;
        if (node.op === "!=") return left !== right;
        return false;
      }

      switch (node.op) {
        case "=":
          return left === right;
        case "!=":
          return left !== right;
        case ">":
          return left > right;
        case "<":
          return left < right;
        case ">=":
          return left >= right;
        case "<=":
          return left <= right;
        default:
          return false;
      }
    }

    case "call":
      return evaluateFunction(node.name, node.args, ctx);

    default:
      return null;
  }
}

function evaluateFunction(name: string, args: ASTNode[], ctx: any): any {
  switch (name) {
    case "contains": {
      if (args.length < 2) return false;
      const container = evaluate(args[0], ctx);
      const value = evaluate(args[1], ctx);
      // String contains (check first, before toArray wraps it)
      if (typeof container === "string") {
        return container.toLowerCase().includes(String(value).toLowerCase());
      }
      // Array contains (including Dataview DataArray with .values)
      const arr = toArray(container);
      if (arr.length > 0) {
        const needle = String(value).toLowerCase();
        return arr.some((item: any) => String(item).toLowerCase() === needle);
      }
      return false;
    }

    case "length": {
      if (args.length < 1) return 0;
      const val = evaluate(args[0], ctx);
      const arr = toArray(val);
      if (arr.length > 0) return arr.length;
      if (typeof val === "string") return val.length;
      return 0;
    }

    case "date": {
      if (args.length < 1) return null;
      // Handle bare identifiers like date(today) — resolve from AST, not context
      const argNode = args[0];
      let s: string;
      if (argNode.kind === "field" && argNode.path.length === 1) {
        // Bare keyword: today, now, tomorrow, yesterday
        s = argNode.path[0].toLowerCase();
      } else {
        const arg = evaluate(argNode, ctx);
        s = String(arg).toLowerCase();
      }
      if (s === "today") {
        return Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      }
      if (s === "now") {
        return Date.now();
      }
      if (s === "tomorrow") {
        const d = new Date();
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      }
      if (s === "yesterday") {
        const d = new Date();
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() - 1);
      }
      // Parse date string
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d.getTime();
    }

    case "number": {
      if (args.length < 1) return 0;
      const val = evaluate(args[0], ctx);
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    }

    case "lower": {
      if (args.length < 1) return "";
      return String(evaluate(args[0], ctx)).toLowerCase();
    }

    case "upper": {
      if (args.length < 1) return "";
      return String(evaluate(args[0], ctx)).toUpperCase();
    }

    case "default": {
      if (args.length < 2) return null;
      const val = evaluate(args[0], ctx);
      return val != null ? val : evaluate(args[1], ctx);
    }

    case "startswith": {
      if (args.length < 2) return false;
      const str = String(evaluate(args[0], ctx)).toLowerCase();
      const prefix = String(evaluate(args[1], ctx)).toLowerCase();
      return str.startsWith(prefix);
    }

    case "endswith": {
      if (args.length < 2) return false;
      const str = String(evaluate(args[0], ctx)).toLowerCase();
      const suffix = String(evaluate(args[1], ctx)).toLowerCase();
      return str.endsWith(suffix);
    }

    case "regexmatch": {
      if (args.length < 2) return false;
      const str = String(evaluate(args[0], ctx));
      const pattern = String(evaluate(args[1], ctx));
      try {
        return new RegExp(pattern, "i").test(str);
      } catch {
        return false;
      }
    }

    default:
      console.warn(`Kanban WHERE: unknown function "${name}"`);
      return null;
  }
}

function isTruthy(val: any): boolean {
  if (val == null) return false;
  if (val === false) return false;
  if (val === 0) return false;
  if (val === "") return false;
  return true;
}

// ── Public API ──────────────────────────────────────────────

export type WhereFilter = (item: any) => boolean;

/**
 * Parse a Dataview WHERE expression string into a filter function.
 * Returns null if the expression is empty.
 * Throws on parse errors.
 */
export function parseWhere(expression: string): WhereFilter | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  const tokens = tokenize(trimmed);
  const parser = new Parser(tokens);
  const ast = parser.parse();

  return (item: any) => isTruthy(evaluate(ast, item));
}

/**
 * Split a query string like `FROM "Tasks" WHERE status != "archive"`
 * into { source: '"Tasks"', where: 'status != "archive"' }.
 */
export function splitQuery(query: string): { source: string; where: string } {
  // Remove leading FROM
  let rest = query.replace(/^\s*FROM\s+/i, "").trim();

  // Find WHERE boundary (not inside quotes)
  const whereIdx = findWhereIndex(rest);
  if (whereIdx === -1) {
    return { source: rest, where: "" };
  }

  const source = rest.slice(0, whereIdx).trim();
  const where = rest.slice(whereIdx + 5).trim(); // +5 for "WHERE"
  return { source, where };
}

function findWhereIndex(str: string): number {
  let inQuote: string | null = null;
  const upper = str.toUpperCase();

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inQuote) {
      if (ch === inQuote && str[i - 1] !== "\\") inQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    // Check for WHERE keyword (preceded by space or start, followed by space)
    if (
      upper.slice(i, i + 5) === "WHERE" &&
      (i === 0 || /\s/.test(str[i - 1])) &&
      (i + 5 >= str.length || /\s/.test(str[i + 5]))
    ) {
      return i;
    }
  }
  return -1;
}

// Export internals for testing
export { tokenize, Parser, evaluate, toComparable, isTruthy };
