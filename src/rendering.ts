import { KanbanColumn, KanbanCard } from "./dataview";
import { KanbanConfig } from "./config";

function getDueDateClass(due: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due);
  dueDate.setHours(0, 0, 0, 0);

  if (isNaN(dueDate.getTime())) return "";
  if (dueDate.getTime() < today.getTime()) return "overdue";
  if (dueDate.getTime() === today.getTime()) return "today";
  return "";
}

function isFieldHidden(field: string, config: KanbanConfig): boolean {
  return config.hideFields != null && config.hideFields.includes(field);
}

function filterDoneCards(columns: KanbanColumn[], config: KanbanConfig): KanbanColumn[] {
  if (config.showDone) return columns;
  return columns.map((col) => ({
    ...col,
    cards: col.cards.filter((card) => card.status.toLowerCase() !== "done"),
  }));
}

export function renderCard(el: HTMLElement, card: KanbanCard, config: KanbanConfig): void {
  const cardEl = el.createEl("div", { cls: "kanban-card" });
  cardEl.dataset.filePath = card.filePath;
  cardEl.dataset.cardType = card.cardType;
  if (card.lineNumber != null) {
    cardEl.dataset.lineNumber = String(card.lineNumber);
  }

  const titleRow = cardEl.createEl("div", { cls: "kanban-card-header" });

  if (!isFieldHidden("checkbox", config)) {
    titleRow.createEl("input", { type: "checkbox" } as any);
  }

  titleRow.createEl("span", { cls: "kanban-card-title", text: card.title });

  const meta = cardEl.createEl("div", { cls: "kanban-card-meta" });

  if (card.project && !isFieldHidden("project", config)) {
    meta.createEl("span", { cls: "kanban-card-project", text: card.project });
  }

  if (card.due && !isFieldHidden("due", config)) {
    const dueCls = getDueDateClass(card.due);
    const dueEl = meta.createEl("span", {
      cls: "kanban-card-due" + (dueCls ? " " + dueCls : ""),
      text: card.due,
    });
  }

  if (card.priority && !isFieldHidden("priority", config)) {
    meta.createEl("span", { cls: "kanban-card-priority", text: card.priority });
  }

  if (card.tags && card.tags.length > 0 && !isFieldHidden("tags", config)) {
    const tagsEl = meta.createEl("span", { cls: "kanban-card-tags" });
    for (const tag of card.tags) {
      tagsEl.createEl("span", { cls: "kanban-card-tag", text: tag });
    }
  }
}

export function renderColumn(el: HTMLElement, column: KanbanColumn, config: KanbanConfig): void {
  const colEl = el.createEl("div", { cls: "kanban-column" });
  colEl.dataset.columnId = column.id;

  const header = colEl.createEl("div", { cls: "kanban-column-header" });
  header.createEl("span", { text: column.title });
  header.createEl("span", {
    cls: "kanban-column-count",
    text: String(column.cards.length),
  });

  const cardsContainer = colEl.createEl("div", { cls: "kanban-column-cards" });

  if (column.cards.length === 0) {
    cardsContainer.createEl("div", {
      cls: "kanban-column-empty",
      text: "No tasks",
    });
  } else {
    for (const card of column.cards) {
      renderCard(cardsContainer, card, config);
    }
  }
}

export function renderBoard(
  el: HTMLElement,
  columns: KanbanColumn[],
  config: KanbanConfig
): void {
  const filtered = filterDoneCards(columns, config);
  const totalCards = filtered.reduce((sum, col) => sum + col.cards.length, 0);

  if (totalCards === 0) {
    el.createEl("div", {
      cls: "kanban-empty-board",
      text: "No tasks found. Check your query or add tasks matching your columns.",
    });
  }

  const board = el.createEl("div", { cls: "kanban-board" });

  for (const column of filtered) {
    renderColumn(board, column, config);
  }
}
