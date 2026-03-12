function createMockEl(): any {
  const el: any = {
    children: [] as any[],
    cls: "",
    text: "",
    createEl(_tag: string, opts?: any) {
      const child = createMockEl();
      if (opts?.cls) child.cls = opts.cls;
      if (opts?.text) child.text = opts.text;
      el.children.push(child);
      return child;
    },
  };
  return el;
}

export class Plugin {
  app: any = {};
  manifest: any = {};
  registerMarkdownCodeBlockProcessor(_lang: string, _handler: any) {}
  addCommand(_command: any) {}
  async loadData() {
    return {};
  }
  async saveData(_data: any) {}
}

export class MarkdownRenderChild {
  containerEl: any;
  constructor(containerEl: any) {
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

export { createMockEl };
