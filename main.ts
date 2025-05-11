import { Plugin } from "obsidian";
import { VersionControl } from "./vault/version-control";
import { RAG } from "./vault/rag";
import { VectorManager } from "./vault/vector-manager";
import { RAGBrainSettings, DEFAULT_SETTINGS, RAGBrainSettingsTab } from "./settings";

export default class RAGBrain extends Plugin {
    settings: RAGBrainSettings;
    private versionControl: VersionControl;
    private vectorManager: VectorManager;
    private ragMaster: RAG;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new RAGBrainSettingsTab(this.app, this));
        console.log("Plugin loaded with settings:", this.settings);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}