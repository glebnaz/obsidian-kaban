import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

export interface KanbanPluginSettings {
  defaultTaskFolder: string;
  templatePath: string;
}

export const DEFAULT_SETTINGS: KanbanPluginSettings = {
  defaultTaskFolder: "Tasks",
  templatePath: "",
};

export class KanbanSettingTab extends PluginSettingTab {
  plugin: Plugin & { settings: KanbanPluginSettings; saveSettings(): Promise<void> };

  constructor(app: App, plugin: Plugin & { settings: KanbanPluginSettings; saveSettings(): Promise<void> }) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Kanban Board Settings" });

    new Setting(containerEl)
      .setName("Default task folder")
      .setDesc("Folder where new tasks will be created")
      .addText((text) =>
        text
          .setPlaceholder("Tasks")
          .setValue(this.plugin.settings.defaultTaskFolder)
          .onChange(async (value) => {
            this.plugin.settings.defaultTaskFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Template file")
      .setDesc("Path to template file (e.g. Templates/Task). Works with core Templates and Templater.")
      .addText((text) =>
        text
          .setPlaceholder("Templates/Task")
          .setValue(this.plugin.settings.templatePath)
          .onChange(async (value) => {
            this.plugin.settings.templatePath = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
