import { ItemView, WorkspaceLeaf } from "obsidian";
import  RAGBrain  from "main";

export const RAG_VIEW_TYPE = "rag-brain-view";

export class RAGBrainView extends ItemView {
    private plugin: RAGBrain;
    private questionInput: HTMLTextAreaElement;
    private resultDiv: HTMLDivElement;
    private askButton: HTMLButtonElement;

    constructor(leaf: WorkspaceLeaf, plugin: RAGBrain) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return RAG_VIEW_TYPE;
    }

    getDisplayText() {
        return "RAG Brain";
    }

    getIcon(): string {
        return "brain";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("rag-brain-view");

        // Create input container
        const inputContainer = container.createDiv("rag-input-container");
        
        // Question input
        this.questionInput = inputContainer.createEl("textarea", {
            placeholder: "Enter your question...",
            cls: "rag-question-input"
        });
        
        // Ask button
        this.askButton = inputContainer.createEl("button", {
            text: "Ask",
            cls: "rag-ask-button"
        });
        this.askButton.addEventListener("click", async () => await this.handleQuestion());

        // Results container
        this.resultDiv = container.createDiv("rag-results-container");
    }

    async onClose() {
        // Clean up elements
        this.questionInput.remove();
        this.askButton.remove();
        this.resultDiv.remove();
    }

    private async handleQuestion() {
        const question = this.questionInput.value.trim();
        if (!question) return;

        this.askButton.disabled = true;
        this.questionInput.disabled = true;
        this.resultDiv.textContent = "Thinking...";

        try {
            const response = await this.plugin.queryVault(question);
            this.resultDiv.empty();
            this.resultDiv.createEl("div", {
                text: response.answer + "\nSources:\n" + response.sources,
                cls: "rag-response"
            });
        } catch (error) {
            this.resultDiv.textContent = `Error: ${error.message}`;
        } finally {
            this.askButton.disabled = false;
            this.questionInput.disabled = false;
        }
    }
}