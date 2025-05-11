import { App, PluginSettingTab, Setting } from "obsidian";
import type RAGBrainPlugin from "./main";

export interface RAGBrainSettings {
    geminiApiKey: string;
    qdrantUrl: string;
    qdrantApiKey: string;
    ocrEnabled: boolean;
    geminiEmbeddingsModel: string;
    geminiOCRModel: string;
    geminiLLMModel: string;
    qdrantCollectionName: string;
}

export const DEFAULT_SETTINGS: RAGBrainSettings = {
    geminiApiKey: "",
    qdrantUrl: "",
    qdrantApiKey: "",
    ocrEnabled: false,
    geminiEmbeddingsModel: "text-embedding-004",
    geminiOCRModel: "gemini-1.5-flash",
    geminiLLMModel: "gemini-1.5-flash",
    qdrantCollectionName: "my-obsidian-vault",
};

export class RAGBrainSettingsTab extends PluginSettingTab {
    plugin: RAGBrainPlugin;

    constructor(app: App, plugin: RAGBrainPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Gemini API Key
        new Setting(containerEl)
            .setName("Gemini API Key")
            .setDesc("API key for accessing Gemini services.")
            .addText((text) =>
                text
                    .setPlaceholder("Enter your API key")
                    .setValue(this.plugin.settings.geminiApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.geminiApiKey = value;
                        await this.plugin.saveSettings();
                    })
            );

        // QDrant URL
        new Setting(containerEl)
            .setName("QDrant URL")
            .setDesc("URL for the QDrant vector database.")
            .addText((text) =>
                text
                    .setPlaceholder("http://localhost:6333")
                    .setValue(this.plugin.settings.qdrantUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.qdrantUrl = value;
                        await this.plugin.saveSettings();
                    })
            );

        // QDrant API Key
        new Setting(containerEl)
            .setName("QDrant API Key")
            .setDesc("API key for QDrant access.")
            .addText((text) =>
                text
                    .setPlaceholder("Enter your API key")
                    .setValue(this.plugin.settings.qdrantApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.qdrantApiKey = value;
                        await this.plugin.saveSettings();
                    })
            );

        // OCR Toggle
        new Setting(containerEl)
            .setName("Enable OCR")
            .setDesc(
                "Enables OCR processing for PDFs and images using Gemini. Disable to process .md files exclusively."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.ocrEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.ocrEnabled = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Gemini Embeddings Model
        new Setting(containerEl)
            .setName("Gemini Embeddings Model")
            .setDesc("Model used for creating document embeddings.")
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.geminiEmbeddingsModel)
                    .setValue(this.plugin.settings.geminiEmbeddingsModel)
                    .onChange(async (value) => {
                        this.plugin.settings.geminiEmbeddingsModel = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Gemini OCR Model
        new Setting(containerEl)
            .setName("Gemini OCR Model")
            .setDesc("Model used for processing PDFs and images via OCR.")
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.geminiOCRModel)
                    .setValue(this.plugin.settings.geminiOCRModel)
                    .onChange(async (value) => {
                        this.plugin.settings.geminiOCRModel = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Gemini LLM Model
        new Setting(containerEl)
            .setName("Gemini LLM Model")
            .setDesc("Model used for response generation and retrieval.")
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.geminiLLMModel)
                    .setValue(this.plugin.settings.geminiLLMModel)
                    .onChange(async (value) => {
                        this.plugin.settings.geminiLLMModel = value;
                        await this.plugin.saveSettings();
                    })
            );

        // QDrant Collection Name
        new Setting(containerEl)
            .setName("QDrant Collection Name")
            .setDesc("Collection name for storing vectors in QDrant.")
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.qdrantCollectionName)
                    .setValue(this.plugin.settings.qdrantCollectionName)
                    .onChange(async (value) => {
                        this.plugin.settings.qdrantCollectionName = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}