import { ItemView, WorkspaceLeaf } from "obsidian";
import { RAGBrain } from "./main";

export const RAG_VIEW_TYPE = "rag-brain-view";

export class RAGBrainView extends ItemView {
    private plugin: RAGBrain;
    private inputContainer: HTMLDivElement;
    private messageContainer: HTMLDivElement;
    private textarea: HTMLTextAreaElement;
    private sendButton: HTMLButtonElement;

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
        return "message-square";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("rag-chat-container");

        // Message history container
        this.messageContainer = container.createDiv("rag-messages");
        this.messageContainer.id = "rag-messages";

        // Input container
        this.inputContainer = container.createDiv("rag-input-container");
        
        // Text input with growing capability
        this.textarea = this.inputContainer.createEl("textarea", {
            placeholder: "Ask RAG Brain...",
            cls: "rag-chat-input"
        });
        this.textarea.addEventListener("keydown", this.handleKeyDown.bind(this));

        // Send button
        this.sendButton = this.inputContainer.createEl("button", {
            cls: "rag-send-button"
        });
        this.sendButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`;
        this.sendButton.addEventListener("click", async () => await this.handleSend());
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
        }
    }

    private async handleSend() {
        const message = this.textarea.value.trim();
        if (!message) return;

        this.addMessage(message, "user");
        this.textarea.value = "";
        this.textarea.style.height = "auto";
        
        const loadingMessage = this.addMessage("Thinking...", "ai", true);
        
        try {
            const response = await this.plugin.queryVault(message);
            loadingMessage.remove();
            this.addMessage(response.answer, "ai");
        } catch (error) {
            loadingMessage.remove();
            this.addMessage(`Error: ${error.message}`, "ai");
        }
    }

    private addMessage(content: string, type: "user" | "ai", loading = false): HTMLDivElement {
        const messageEl = this.messageContainer.createDiv(`rag-message ${type}-message`);
        if (loading) messageEl.addClass("loading");
        
        const contentEl = messageEl.createDiv("rag-message-content");
        contentEl.setText(content);
        
        this.messageContainer.scrollTo(0, this.messageContainer.scrollHeight);
        return messageEl;
    }

    async onClose() {
        // Clean up elements
        this.inputContainer.remove();
        this.messageContainer.remove();
    }
}