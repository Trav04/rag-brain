import { Plugin } from "obsidian";
import { VersionControl } from "./vault/version-control";
import { RAG } from "./vault/rag";
import { VectorManager } from "./vault/vector-manager";
import { RAGBrainSettings, DEFAULT_SETTINGS, RAGBrainSettingsTab } from "./settings";

export default class RAGBrain extends Plugin {
    settings: RAGBrainSettings;
    private vaultPath: string;
    private versionControl: VersionControl;
    private vectorManager: VectorManager;
    private ragMaster: RAG;

    async onload() {
        this.vaultPath = (this.app.vault.adapter as any).basePath;
        await this.loadSettings();
        this.addSettingTab(new RAGBrainSettingsTab(this.app, this));
        console.log("Plugin loaded with settings:", this.settings);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        if (this.settings.geminiApiKey && this.settings.qdrantApiKey && this.settings.qdrantUrl) {
          await this.init;
        }
    }

    async init() {
      this.vectorManager = new VectorManager( 
        this.vaultPath, this.settings.geminiApiKey,
        this.settings.geminiEmbeddingsModel,
        this.settings.ocrEnabled,
        this.settings.geminiOCRModel,
        this.settings.qdrantCollectionName,
        1000, 
        200
        );

      this.versionControl = new VersionControl(this.vaultPath) // TODO add setting to set the version control path

      this.ragMaster = await new RAG(this.settings.geminiApiKey, 
        this.settings.geminiLLMModel,
        this.vectorManager,
        this.versionControl
      ).init();
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }


}