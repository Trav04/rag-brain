// import 'dotenv/config';
import { VectorManager } from "./vector-manager";
import { VersionControl } from "./version-control"
import { Document } from "langchain/document";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export class RAG {
    private llmModelName: string;
    private geminiApiKey: string;
    private vectorManager: VectorManager;
    private versionControl: VersionControl;
    private llm: ChatGoogleGenerativeAI;
    private promptTemplate: ChatPromptTemplate;

    constructor(
        geminiApiKey: string,
        llmModelName: string,
        vectorManager: VectorManager,
        versionControl: VersionControl,
    ) {
        if (!geminiApiKey) {
            throw new Error("Gemini API key must be provided");
        }
        this.geminiApiKey = geminiApiKey;
        this.llmModelName = llmModelName;
        this.vectorManager = vectorManager;
        this.versionControl = versionControl;
    }

    async init() {
        try {
            this.llm = new ChatGoogleGenerativeAI({
                model: this.llmModelName,
                temperature: 0,
                maxRetries: 2,
                apiKey: this.geminiApiKey
            });

            this.promptTemplate = await pull<ChatPromptTemplate>("krunal/more-crafted-rag-prompt");
            return this;
        } catch (error) {
            throw new Error(`RAG system setup failed: ${error.message}`);
        }
    }

    private async retrieveDocuments(question: string): Promise<Document[]> {
        const vectorStore = await this.vectorManager.getVectorStore();
        return await vectorStore.similaritySearch(question);
    }

    private async generateAnswer(question: string, context: Document[]): Promise<string> {
        if (!context?.length) {
            throw new Error("No context available for generation");
        }
        
        const docsContent = context.map((doc) => doc.pageContent).join("\n");
        const messages = await this.promptTemplate.invoke({
            question,
            context: docsContent,
        });
        
        const response = await this.llm.invoke(messages);
        return response.content.toString();
    }

    public async updateVaultVersionControl() {
        const { changedFiles, deletedFiles } = await this.versionControl.updateVersionControl();
        
        if (deletedFiles.length > 0) {
            this.vectorManager.deleteDocuments(deletedFiles);
        }

        if (changedFiles.length > 0) {
            this.vectorManager.deleteDocuments(changedFiles);
            this.vectorManager.addDocuments(changedFiles);
        }
    }

    public async query(question: string): Promise<{ answer: string, sources: string[] }> {
        if (!this.llm || !this.promptTemplate) {
            throw new Error("RAG system not initialized. Please call init() before querying.");
        }
        
        try {
            const context = await this.retrieveDocuments(question);
            const answer = await this.generateAnswer(question, context);
            
            const sources = context.map((doc: Document) => doc.metadata.source) || [];
            return {
                answer: answer || "No answer could be generated",
                sources
            };
        } catch (error) {
            throw new Error(`Failed to process query: ${error.message}`);
        }
    }
}