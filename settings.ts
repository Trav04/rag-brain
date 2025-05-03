import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface RAGChatPluginSettings {
  apiKey: string;
  model: string;
}

export const DEFAULT_SETTINGS: RAGChatPluginSettings = {
  apiKey: '',
  model: 'gpt-3.5-turbo'
};

export class SampleSettingTab extends PluginSettingTab {
  plugin: AIPlugin;

  constructor(app: App, plugin: AIPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Your OpenAI API key')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Model')
      .setDesc('AI model to use')
      .addDropdown(dropdown => dropdown
        .addOption('gpt-3.5-turbo', 'gpt-3.5-turbo')
        .addOption('gpt-4', 'gpt-4')
        .setValue(this.plugin.settings.model)
        .onChange(async (value) => {
          this.plugin.settings.model = value;
          await this.plugin.saveSettings();
        }));
  }
}