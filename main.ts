import { Plugin, Notice } from "obsidian";
import { VersionControl } from "./vault/version-control";
import { RAG } from "./vault/rag";
import { VectorManager } from "./vault/vector-manager";
import { RAGBrainSettings, DEFAULT_SETTINGS, RAGBrainSettingsTab } from "./settings";
import { RAGBrainView, RAG_VIEW_TYPE } from "./view";

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

        this.addCommand({
          id: "index-vault",
          name: "Vectorise Entire Vault",
          callback: () => {
            this.indexEntireVault();
          },
        });

        this.addCommand({
          id: "update-vault-index",
          name: "Update vector version control",
          callback: () => {
            this.updateVaultIndex();
          },
        });
        this.registerView(
          RAG_VIEW_TYPE,
          (leaf) => new RAGBrainView(leaf, this)
        );

        this.addRibbonIcon("brain", "Open RAG Brain", () => {
          this.activateView();
        });
        console.log("Vault path:", this.vaultPath);
        console.log("Plugin loaded with settings:", this.settings);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        if (this.settings.geminiApiKey && this.settings.qdrantApiKey && this.settings.qdrantUrl) {
          await this.init();
        }
    }
      

    /**
     * Instantiate classes required to run RAGBrain
     */
    async init() {
      this.vectorManager = await new VectorManager( 
          this.vaultPath, 
          this.settings.geminiApiKey,
          this.settings.qdrantUrl,
          this.settings.qdrantApiKey,
          this.settings.geminiEmbeddingsModel,
          this.settings.ocrEnabled,
          this.settings.geminiOCRModel,
          this.settings.qdrantCollectionName,
          1000, 
          200
        ).init();

      this.versionControl = new VersionControl(this.vaultPath, this.vaultPath + "/.obsidian/rag-brain-version-control.json") // TODO add setting to set the version control path

      this.ragMaster = await new RAG(this.settings.geminiApiKey, 
        this.settings.geminiLLMModel,
        this.vectorManager,
        this.versionControl
      ).init();
      console.log("Initialised class variables");

      await this.initialiseVersionControl()
      console.log("Initialised version control");

    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Attach the view to the application view.
     */
    private async activateView() {
        // Check if view is already open
        const existingLeaves = this.app.workspace.getLeavesOfType(RAG_VIEW_TYPE);
        if (existingLeaves.length > 0) {
            this.app.workspace.revealLeaf(existingLeaves[0]);
            return;
        }

        // Get right leaf - handle null case
        const rightLeaf = this.app.workspace.getRightLeaf(false);
        if (!rightLeaf) {
            console.error("Could not find right leaf to open RAG Brain view");
            return;
        }

        // Set view state
        await rightLeaf.setViewState({
            type: RAG_VIEW_TYPE,
            active: true,
        });

        // Reveal the leaf
        this.app.workspace.revealLeaf(rightLeaf);
    }

    /**
     * Vectorises all files in the vault and pushes them to the qdrant instance
     * Creates a notice when the process starts and a notice when the process 
     * finishes.
     */
      async indexEntireVault() {
        const inProgressNotice = new Notice("⌛ Indexing entire vault... (this will continue in the background)");
        try {
          await this.vectorManager.indexVault();
          new Notice("✅ Vault indexing complete.");
        } catch (error) {
          new Notice("Vault indexing failed. Check console for details.");
          console.error("Vault indexing error:", error);
        } finally {
          // Optional: dismiss the in-progress notice early if desired
          inProgressNotice.hide(); 
        }
      }

    async initialiseVersionControl() {
      await this.versionControl.initialiseVaultVersionControl();
    }

    /**
     * Updates the vault version control and revectorises or deletes vectors
     * where appropriate. Updates the version control JSON file.
     */
    async updateVaultIndex() {
      await this.ragMaster.updateVaultVersionControl();
    }

    public async queryVault(question: string): Promise<{answer: string; sources: string[];}> {
      return await this.ragMaster.query(question);
    }
}