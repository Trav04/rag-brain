import { ItemView, WorkspaceLeaf } from 'obsidian';

export class RAGSidebarView extends ItemView {
  private inputEl: HTMLTextAreaElement;
  private outputEl: HTMLElement;
  private buttonEl: HTMLButtonElement;
  private settings: RAGChatPluginSettings;

  constructor(leaf: WorkspaceLeaf, settings: RAGChatPluginSettings) {
    super(leaf);
    this.settings = settings;
  }

  getViewType() {
    return 'ai-sidebar';
  }

  getDisplayText() {
    return 'AI Assistant';
  }

  getIcon(): string {
    return 'bot';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('ai-sidebar');

    // Create input area
    this.inputEl = container.createEl('textarea', {
      attr: {
        placeholder: 'Ask AI anything...',
        rows: '5'
      },
      cls: 'ai-input'
    });

    // Create button container
    const buttonContainer = container.createDiv('ai-button-container');
    
    this.buttonEl = buttonContainer.createEl('button', {
      text: 'Ask AI',
      cls: 'ai-button'
    });

    // Create output area
    this.outputEl = container.createEl('div', {
      cls: 'ai-output'
    });

    // Add event listener
    this.buttonEl.addEventListener('click', async () => {
      await this.handleAIRequest();
    });
  }

  async handleAIRequest() {
    const prompt = this.inputEl.value.trim();
    if (!prompt) return;

    this.buttonEl.disabled = true;
    this.buttonEl.textContent = 'Processing...';
    this.outputEl.setText('');

    try {
      const response = await this.getAIResponse(prompt);
      this.outputEl.setText(response);
    } catch (error) {
      this.outputEl.setText(`Error: ${error.message}`);
    } finally {
      this.buttonEl.disabled = false;
      this.buttonEl.textContent = 'Ask AI';
    }
  }

  async getAIResponse(prompt: string): Promise<string> {
    const params: RequestUrlParam = {
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    };

    const response = await requestUrl(params);
    return response.json.choices[0].message.content;
  }

  updateSettings(settings: AIPluginSettings) {
    this.settings = settings;
  }
}
