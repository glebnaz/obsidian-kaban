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
  app: any = { metadataCache: { trigger: jest.fn(), on: jest.fn() } };
  manifest: any = {};
  registerMarkdownCodeBlockProcessor(_lang: string, _handler: any) {}
  addCommand(_command: any) {}
  addSettingTab(_tab: any) {}
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

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: any = createMockEl();
  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
  }
  display() {}
}

export class Setting {
  constructor(_containerEl: any) {}
  setName(_name: string) { return this; }
  setDesc(_desc: string) { return this; }
  addText(_cb: any) { return this; }
  addTextArea(_cb: any) { return this; }
}

export class Modal {
  app: any;
  contentEl: any = createMockEl();
  constructor(app: any) {
    this.app = app;
  }
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export type App = any;

export { createMockEl };
