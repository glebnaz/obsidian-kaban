function createMockEl(): any {
  const el: any = {
    children: [] as any[],
    cls: "",
    text: "",
    dataset: {} as Record<string, string>,
    createEl(_tag: string, opts?: any) {
      const child = createMockEl();
      if (opts?.cls) child.cls = opts.cls;
      if (opts?.text) child.text = opts.text;
      if (opts?.type) child.type = opts.type;
      el.children.push(child);
      return child;
    },
    empty() {
      el.children = [];
    },
  };
  return el;
}

export class Component {
  _events: any[] = [];
  registerEvent(event: any) {
    this._events.push(event);
  }
}

export class Plugin extends Component {
  app: any = {};
  manifest: any = {};
  registerMarkdownCodeBlockProcessor(_lang: string, _handler: any) {}
  addCommand(_command: any) {}
  async loadData() {
    return {};
  }
  async saveData(_data: any) {}
}

export class MarkdownRenderChild extends Component {
  containerEl: any;
  constructor(containerEl: any) {
    super();
    this.containerEl = containerEl;
  }
  onload() {}
  onunload() {}
}

export class Notice {
  constructor(_message: string, _timeout?: number) {}
}

export class TFile {
  path = "";
  basename = "";
  extension = "";
}

export type App = any;

export { createMockEl };
